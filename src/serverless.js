const path = require('path')
const fs = require('fs')
const { Component } = require('@serverless/core')
const aws = require('@serverless/aws-sdk')

const generateId = () =>
  Math.random()
    .toString(36)
    .substring(6)

const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath)
    return true
  } catch (e) {
    return false
  }
}

const log = (msg) => console.log(msg) // eslint-disable-line

class GraphQL extends Component {
  async deploy(inputs = {}) {
    // this error message assumes that the user is running via the CLI though...
    if (Object.keys(this.credentials.aws).length === 0) {
      const msg = `Credentials not found. Make sure you have a .env file in the cwd. - Docs: https://git.io/JvArp`
      throw new Error(msg)
    }

    inputs.region = inputs.region || 'us-east-1'
    inputs.name = inputs.name || this.name

    aws.config.update({
      credentials: this.credentials.aws,
      region: inputs.region
    })

    const sourceDirectory = await this.unzip(inputs.src)

    // add default app if src is not provided
    if (!inputs.src) {
      // make sure source directory exists
      if (!fs.existsSync(sourceDirectory)) {
        fs.mkdirSync(sourceDirectory)
      }
      fs.copyFileSync(
        path.join(__dirname, '_src', 'resolvers.js'),
        path.join(sourceDirectory, 'resolvers.js')
      )

      fs.copyFileSync(
        path.join(__dirname, '_src', 'schema.graphql'),
        path.join(sourceDirectory, 'schema.graphql')
      )

      fs.copyFileSync(
        path.join(__dirname, '_src', 'serverless.yml'),
        path.join(sourceDirectory, 'serverless.yml')
      )
    }

    const schemaFilePath = path.join(sourceDirectory, 'schema.graphql')
    const resolversFilePath = path.join(sourceDirectory, 'resolvers.js')

    // make sure schema.graphql file exists
    if (!(await fileExists(schemaFilePath))) {
      throw new Error(`The "schema.graphql" file was not found in your source directory`)
    }

    // make sure resolvers.js file exists
    if (!(await fileExists(resolversFilePath))) {
      throw new Error(`The "resolvers.js" file was not found in your source directory`)
    }

    const schema = await fs.promises.readFile(path.join(sourceDirectory, 'schema.graphql'))
    const resolvers = require(path.join(sourceDirectory, 'resolvers.js'))

    // inject handler
    fs.copyFileSync(
      path.join(__dirname, 'userLambdaHandler.js'),
      path.join(sourceDirectory, 'handler.js')
    )

    const handler = await this.addSDK(sourceDirectory, 'handler.handler')
    const zipPath = await this.zip(sourceDirectory)

    this.state.region = inputs.region || 'us-east-1'
    this.state.name = this.state.name || `${inputs.name}-${generateId()}`

    log(`Deploying GraphQL API "${this.state.name}" to the "${this.state.region}" region.`)
    const getLambdaArnParams = {
      lambdaName: this.state.name
    }

    const lambdaArnForPolicy = await aws.utils.getLambdaArn(getLambdaArnParams)

    log(`Deploying Role "${this.state.name}" to the "${this.state.region}" region.`)
    const deployRoleParams = {
      roleName: this.state.name,
      service: [`lambda.amazonaws.com`, `appsync.amazonaws.com`],
      policy: [
        {
          Effect: 'Allow',
          Action: ['sts:AssumeRole'],
          Resource: '*'
        },
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:CreateLogStream'],
          Resource: '*'
        },
        {
          Effect: 'Allow',
          Action: ['lambda:invokeFunction'],
          Resource: lambdaArnForPolicy
        }
      ]
    }

    if (inputs.policy instanceof Array) {
      deployRoleParams.policy = deployRoleParams.policy.concat(inputs.policy)
    }
    const { roleArn } = await aws.utils.deployRole(deployRoleParams)

    log(`Deploying Lambda "${this.state.name}" to the "${this.state.region}" region.`)
    const deployLambdaParams = {
      lambdaName: this.state.name,
      description: inputs.description,
      handler,
      memory: inputs.memory,
      timeout: inputs.timeout,
      env: inputs.env,
      layers: inputs.layers,
      roleArn,
      lambdaSrc: zipPath
    }
    const { lambdaArn } = await aws.utils.deployLambda(deployLambdaParams)

    log(`Deploying AppSync API "${this.state.name}" to the "${this.state.region}" region.`)
    const deployAppSyncApiParams = {
      apiName: this.state.name
    }

    if (this.state.apiId) {
      deployAppSyncApiParams.apiId = this.state.apiId
    }

    const { apiId, apiUrls } = await aws.utils.deployAppSyncApi(deployAppSyncApiParams)
    this.state.apiId = apiId
    this.state.apiUrls = apiUrls

    log(`Deploying schema for AppSync API with ID "${apiId}".`)
    const deployAppSyncSchemaParams = {
      apiId,
      schema
    }
    await aws.utils.deployAppSyncSchema(deployAppSyncSchemaParams)

    log(`Deploying Lambda data source for AppSync API with ID "${apiId}".`)
    const deployAppSyncDataSourcesParams = {
      dataSourceName: `BuiltInLambdaDataSource`,
      apiId,
      lambdaArn,
      roleArn
    }
    await aws.utils.deployAppSyncDataSource(deployAppSyncDataSourcesParams)

    log(`Deploying resolvers for AppSync API with ID "${apiId}".`)
    const deployAppSyncResolversParams = {
      dataSourceName: 'BuiltInLambdaDataSource',
      apiId,
      resolvers
    }
    await aws.utils.deployAppSyncResolvers(deployAppSyncResolversParams)

    log(`Deploying api key for AppSync API with ID "${apiId}".`)
    // if api key not in state, a new one will be created
    // if it is in state, it will be verified on the provider
    // and a new one will be created if no longer exists
    const deployAppSyncApiKeyParams = {
      apiId,
      apiKey: this.state.apiKey,
      description: inputs.description
    }
    const { apiKey } = await aws.utils.deployAppSyncApiKey(deployAppSyncApiKeyParams)
    this.state.apiKey = apiKey

    log(
      `GraphQL API ${this.state.name} was successfully deployed to the "${this.state.region}" region.`
    )

    return {
      name: this.state.name,
      url: this.state.apiUrls.GRAPHQL, // there's also REALTIME URL. dont know what that is
      apiId: this.state.apiId,
      apiKey: this.state.apiKey
    }
  }

  async remove() {
    if (!this.state.name) {
      log(`State is empty. Aborting removal.`)
      return
    }
    aws.config.update({
      credentials: this.credentials.aws,
      region: this.state.region || 'us-east-1'
    })

    const deleteRoleParams = {
      roleName: this.state.name
    }

    const deleteLambdaParams = {
      lambdaName: this.state.name
    }

    const deleteAppSyncApiParams = {
      apiId: this.state.apiId
    }

    log(`Removing Role "${this.state.name}" from the "${this.state.region}" region.`)
    log(`Removing Lambda "${this.state.name}" from the "${this.state.region}" region.`)
    log(`Removing AppSync API "${this.state.apiId}" from the "${this.state.region}" region.`)

    const promises = [
      aws.utils.deleteRole(deleteRoleParams),
      aws.utils.deleteLambda(deleteLambdaParams),
      aws.utils.deleteAppSyncApi(deleteAppSyncApiParams)
    ]

    await Promise.all(promises)

    log(
      `GraphQL API ${this.state.name} was successfully removed from the "${this.state.region}" region.`
    )

    this.state = {}
  }
}

module.exports = GraphQL
