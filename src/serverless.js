const path = require('path')
const crypto = require('crypto')
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

const checksum = (data) => {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
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
    this.state.region = inputs.region
    this.state.name = this.state.name || `${inputs.name}-${generateId()}`

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
    const schemaFileExists = await fileExists(schemaFilePath)

    const resolversFilePath = path.join(sourceDirectory, 'resolvers.js')
    const resolversFileExists = await fileExists(resolversFilePath)

    // make sure schema.graphql file exists
    if (!schemaFileExists) {
      throw new Error(`The "schema.graphql" file was not found in your source directory`)
    }

    const schema = await fs.promises.readFile(path.join(sourceDirectory, 'schema.graphql'), 'utf-8')

    log(`Deploying GraphQL API "${this.state.name}" to the "${this.state.region}" region.`)

    inputs.resolvers = inputs.resolvers || {}
    let shouldDeployLambda = false
    if (resolversFileExists) {
      const lambdaResolvers = require(path.join(sourceDirectory, 'resolvers.js'))
      for (const type in lambdaResolvers) {
        if (typeof lambdaResolvers[type] !== 'object') {
          throw new Error(`type "${type}" in resolvers.js must be an object.`)
        }

        for (const field in lambdaResolvers[type]) {
          if (typeof lambdaResolvers[type][field] !== 'function') {
            throw new Error(`resolver "${type}.${field}" in resolvers.js must be a function.`)
          }

          inputs.resolvers[type] = inputs.resolvers[type] || {}
          // todo throw error if user defined the same resolver in js and yaml file?
          shouldDeployLambda = true
          inputs.resolvers[type][field] = {
            lambda: this.state.name
          }
        }
      }
    }

    for (const type in inputs.resolvers) {
      if (typeof inputs.resolvers[type] !== 'object') {
        throw new Error(`resolver type "${type}" in serverless.yml must be an object.`)
      }

      for (const field in inputs.resolvers[type]) {
        const resolver = inputs.resolvers[type][field]
        if (typeof resolver !== 'object') {
          throw new Error(`resolver "${type}.${field}" in serverless.yml must be an object.`)
        }

        // throw error if not a lambda resolver and user
        // did not define request template (there's a default response template)
        if (!resolver.lambda && !resolver.request) {
          throw new Error(`Missing request property for resolver "${type}.${field}".`)
        }

        if (resolver.request) {
          const requestTemplateAbsolutePath = path.resolve(sourceDirectory, resolver.request)

          if (await fileExists(requestTemplateAbsolutePath)) {
            inputs.resolvers[type][field].request = await fs.promises.readFile(
              requestTemplateAbsolutePath,
              'utf-8'
            )
          }
        }
      }
    }

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
        }
      ]
    }

    // get the minimum policy needed for the defined resolvers
    const resolversPolicy = await aws.utils.getAppSyncResolversPolicy(inputs.resolvers)
    deployRoleParams.policy = deployRoleParams.policy.concat(resolversPolicy)

    // add any other policy statements provided by the user
    if (inputs.policy instanceof Array) {
      deployRoleParams.policy = deployRoleParams.policy.concat(inputs.policy)
    }

    // deploy role
    const { roleArn } = await aws.utils.deployRole(deployRoleParams)

    // Add policy to the Lambda role to allow VPC CreateNetworkInterface
    await new aws.IAM()
      .attachRolePolicy({
        RoleName: this.state.name,
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
      })
      .promise()

    // if there's a resolvers.js, then we should deploy the built in lambda
    if (shouldDeployLambda) {
      log(`Deploying Lambda "${this.state.name}" to the "${this.state.region}" region.`)

      // inject handler
      fs.copyFileSync(
        path.join(__dirname, 'userLambdaHandler.js'),
        path.join(sourceDirectory, 'handler.js')
      )

      const handler = await this.addSDK(sourceDirectory, 'handler.handler')
      const zipPath = await this.zip(sourceDirectory)

      const deployLambdaParams = {
        lambdaName: this.state.name,
        description: inputs.description,
        handler,
        roleArn,
        lambdaSrc: zipPath,
        region: inputs.region,
        ...inputs.lambdaResolver
      }
      await aws.utils.deployLambda(deployLambdaParams)
    }

    log(`Deploying AppSync API "${this.state.name}" to the "${this.state.region}" region.`)
    const deployAppSyncApiParams = {
      apiName: this.state.name,
      auth: inputs.auth
    }

    if (this.state.apiId) {
      deployAppSyncApiParams.apiId = this.state.apiId
    }

    const { apiId, apiUrls } = await aws.utils.deployAppSyncApi(deployAppSyncApiParams)
    this.state.apiId = apiId
    this.state.apiUrls = apiUrls

    const schemaChecksum = checksum(schema)
    if (schemaChecksum !== this.state.schemaChecksum) {
      log(`Deploying schema for AppSync API with ID "${apiId}".`)
      const deployAppSyncSchemaParams = {
        apiId,
        schema
      }
      await aws.utils.deployAppSyncSchema(deployAppSyncSchemaParams)
      this.state.schemaChecksum = schemaChecksum
    }

    const resolversChecksum = checksum(JSON.stringify(inputs.resolvers))
    if (resolversChecksum !== this.state.resolversChecksum) {
      log(`Deploying resolvers for AppSync API with ID "${apiId}".`)
      const deployAppSyncResolversParams = {
        apiId,
        roleName: this.state.name,
        resolvers: inputs.resolvers
      }
      await aws.utils.deployAppSyncResolvers(deployAppSyncResolversParams)
      this.state.resolversChecksum = resolversChecksum
    }

    const outputs = {
      name: this.state.name,
      apiId: this.state.apiId,
      url: this.state.apiUrls.GRAPHQL // there's also REALTIME URL. dont know what that is
    }

    // deploy api key if auth config is api key
    if (!inputs.auth || inputs.auth === 'apiKey') {
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

      outputs.apiKey = apiKey
    }

    // deploy distribution and domain if configured
    if (inputs.domain) {
      log(
        `Deploying CloudFront Distribution for AppSync API with URL "${this.state.apiUrls.GRAPHQL}".`
      )
      const deployAppSyncDistributionParams = {
        apiId,
        apiUrl: this.state.apiUrls.GRAPHQL,
        domain: inputs.domain
      }

      if (this.state.distributionId) {
        deployAppSyncDistributionParams.distributionId = this.state.distributionId
      }
      const { distributionId, distributionUrl } = await aws.utils.deployAppSyncDistribution(
        deployAppSyncDistributionParams
      )

      this.state.domain = inputs.domain
      this.state.distributionId = distributionId
      this.state.distributionUrl = distributionUrl
      outputs.domain = `https://${this.state.domain}/graphql`
    }

    // remove default lambda if no longer configured
    if (!shouldDeployLambda && this.state.shouldDeployLambda) {
      log(`Removing Lambda "${this.state.name}" from the "${this.state.region}" region.`)
      await aws.utils.deleteLambda({ lambdaName: this.state.name })
    }

    // keep in state the fact that we deployed a lambda
    // so that we could remove it if we have to later on
    this.state.shouldDeployLambda = shouldDeployLambda

    log(
      `GraphQL API ${this.state.name} was successfully deployed to the "${this.state.region}" region.`
    )

    return outputs
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

    if (this.state.domain) {
      log(
        `Removing AppSync Distribution "${this.state.distributionId}" from the "${this.state.region}" region.`
      )

      const removeDistribution = {
        distributionId: this.state.distributionId,
        domain: this.state.domain
      }

      promises.push(aws.utils.removeDistribution(removeDistribution))
    }

    await Promise.all(promises)

    log(
      `GraphQL API ${this.state.name} was successfully removed from the "${this.state.region}" region.`
    )

    this.state = {}
  }
}

module.exports = GraphQL
