# Serverless GraphQL Component

This Serverless Framework Component is a specialized developer experience focused on making it easy to deploy and manage GraphQL applications on serverless infrastructure (specifically AWS AppSync and AWS Lambda) on your own AWS account. It comes loaded with powerful development features and represents possibly the easiest, cheapest and most scalable way to host GraphQL apps.

<br/>

- [x] **Never Pay For Idle** - No requests, no cost. Averages $0.0000002-$0.0000009 per request.
- [x] **Zero Configuration** - All we need is your code, then just deploy (advanced config options are available).
- [x] **Fast Deployments** - Deploy to the cloud in seconds.
- [x] **Realtime Logging** - Rapidly develop on the cloud w/ real-time logs and errors in the CLI.
- [x] **Team Collaboration** - Collaborate with your teammates with shared state and outputs.
- [x] **Custom Domain + SSL** - Auto-configure a custom domain w/ a free AWS ACM SSL certificate.
- [x] **Lambda Default Resolver** - Automatically deploys your code to a lambda function for rapid query resolution.
- [x] **Works with All Data Sources** - Can be configured to work with directly with DynamodDB, and other data sources.
- [x] **Flexible Authorization Options** - Supports all AppSync authorization options, API Key, IAM, Cognito or OpenID auth.

<br/>

# Contents

- [**Quick Start**](#quick-start)
  - [**Install**](#install)
  - [**Initialize**](#initialize)
  - [**Deploy**](#deploy)
  - [**Query**](#query)
- [**Configuration Reference**](#configuration-reference)
  - [**Extend Existing API**](#extend-existing-api)
  - [**Lambda Configuration**](#lambda-configuration)
  - [**Custom Domain**](#custom-domain)
  - [**Custom IAM Policies**](#custom-iam-policies)
  - [**Authorization**](#authorization)
  - [**Data Sources Resolvers**](#data-sources-resolvers)
- [**CLI Reference**](#cli-reference)
- [**Outputs Reference**](#outputs-reference)
- [**FAQs**](#faqs)

# Quick Start

## Install

To get started with this component, install the latest version of the Serverless Framework:

```
npm install -g serverless
```

After installation, make sure you connect your AWS account by setting a provider in the org setting page on the [Serverless Dashboard](https://app.serverless.com).

## Initialize

The easiest way to start using the graphql component is by initializing the `graphql-starter` template. Just run this command:

```
serverless init graphql-starter
cd graphql-starter
```

This will also run `npm install` for you. You should now have a directory that looks something like this:

```
|- serverless.yml
|- schema.graphql
|- resolvers.js
```

The `serverless.yml` file is where you define your component config. It looks something like this:

```yml
component: graphql
name: graphql-api

inputs:
  src: ./
```

For more configuration options for the `serverless.yml` file, [check out the Configuration section](#configuration-reference) below.

The `schema.graphql` is where you define your GraphQL schema. It looks something like this:

```graphql
type Post {
  id: ID!
}

type Query {
  getPost(id: ID!): Post
}

type Mutation {
  createPost(id: ID!): Post
}

schema {
  query: Query
  mutation: Mutation
}
```

The `resolvers.js` file is where you define your schema resolvers. It looks something like this:


```js
const Query = {
  // resolver for field getPost in type Query
  getPost: async ({ id }) => {
    return { id }
  }
}

const Mutation = {
  // resolver for field createPost in type Mutation
  createPost: async ({ id }) => {
    return { id }
  }
}

module.exports = { Query, Mutation }


```
In this file, you simply export each of your schema types (ie. `Query` & `Mutation`) as an object of functions. Each function is a field resolver for that type.

**All these files are required**. Needless to say, any resolver you define in `resolvers.js`, must also be defined in your schema in the `schema.graphql` file, otherwise, you'll get an AppSync error. Same goes for the resolvers inputs & outputs. Remember, GraphQL is strongly typed by design.

## Deploy

Once you have the directory set up, you're now ready to deploy. Just run the following command from within the directory containing the `serverless.yml` file:

```
serverless deploy
```

Your first deployment might take a little while, but subsequent deployment would just take few seconds.

After deployment is done, you should see your the following outputs:

```yml
name:   graphql-api-pxzaf135
apiKey: da2-yf444kxlhjerxl376jxyafb2rq
apiId:  survbmoad5ewtnm3e3cd7qys4q
url:    https://cnbfx5zutbe4fkrtsldsrunbuu.appsync-api.us-east-1.amazonaws.com/graphql
```

Your GraphQL API is now deployed! Next time you deploy, if you'd like to know what's happening under the hood and see realtime logs, you can pass the `--debug` flag:

```
serverless deploy --debug
```

## Query

You can query and test your newly created GraphQL API directly with the AWS AppSync console, or any HTTP client. 

Here's a snippet using `fetch` or `node-fetch` with the example above:

```js
// you can get the url and apiKey values from the deployment outputs
const url = 'https://cnbfx5zutbe4fkrtsldsrunbuu.appsync-api.us-east-1.amazonaws.com/graphql'
const apiKey = 'da2-yf444kxlhjerxl376jxyafb2rq'

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey // the "x-api-key" header is required by AppSync
  },
  body: JSON.stringify({
    query: `query getPost { getPost(id: "123") { id }}`
  })
})
  .then((res) => res.json())
  .then((post) => console.log(post))
```

The response should be an echo of the post id, something like this:

```json
{
  "data": {
    "getPost": {
      "id": "123"
    }
  }
}
```

# Configuration Reference

The GraphQL component is a zero configuration component, meaning that it'll work out of the box with no configuration and sane defaults. With that said, there are still a lot of optional configuration that you can specify.

Here's a very minimal configuration to get you started. Most of these properties are optional, but if you use them, remember to substitute with your own value if required (ie. the `org` property)

```yml
component: graphql               # (required) name of the component. In that case, it's graphql.
name: graphql-api                # (required) name of your graphql component instance.
org: serverlessinc               # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is dev.

inputs:
  src: ./                        # (optional) path to the source folder. default is a simple blogging app.
  region: us-east-2              # (optional) aws region to deploy to. default is us-east-1.
```

Even the `src` input is optional. If you didn't specify any `src` directory containing your code, an example app will be deployed for you.

Keep reading to learn more about all the configuration options available to you.

## Extend Existing API

If the `appId` input variable is provided this component will extend an existing AppSync API:

```yml
inputs:
  src: ./
  apiId: xxx                     # (optional) if provided will extend an existing api.
```

The `apiId` can be reference from the source component using the `apiId` output variable from the component instance that created the graphql API: `${output:[STAGE]:[APP]:[NAME].apiId}`

## Lambda Configuration

If you specify resolvers in a `resolvers.js` file as shown in the quick start above, the component will deploy a lambda function automatically for you to host your resolvers and connect everything together. You can configure this default lambda function with the following inputs:

```yml
inputs:
  src: ./
  description: My GraphQL App    # (optional) lambda description. default is en empty string.
  memory: 512                    # (optional) lambda memory size. default is 3008.
  timeout: 10                    # (optional) lambda timeout. default is 300.
  env:                           # (optional) env vars. default is an empty object
    TABLE: 'my-table'
  layers:                        # (optional) list of lambda layer arns to attach to your lambda function.
    - arn:aws:first:layer
    - arn:aws:second:layer
  vpcConfig:                     # (optional) specify a vpc
    securityGroupIds:
      - sg-xxx
    subnetIds:
      - subnet-xxx
      - subnet-xxx
```

## Custom Domain

If you've purchased your domain from AWS Route53, you can configure the domain with a single input:

```yml
inputs:
  src: ./
  domain: example.com
```

Subdomains work too:

```yml
inputs:
  src: ./
  domain: api.example.com
```

This will create a a free SSL certificate for you with AWS ACM, deploy a CDN with AWS CloudFront, and setup all the DNS records required.

If you've purchased your domain elsewhere, you'll have to manually create a Route53 hosted zone for your domain, and point to the AWS nameservers on your registrar before you add the `domain` input.

## Custom IAM Policies

The component creates the minimum required IAM policy based on your configuration. But you could always add your own policy statements using the `policy` input:

```yml
inputs:
  src: ./src
  policy:
    - Action: '*'
      Effect: Allow
      Resource: '*'
```

This policy applies to both the built-in Lambda function and the AppSync API. Keep in mind that this component automatically adds the required IAM policies to invoke your data source depending on your configuration.

## Authorization

This component uses `apiKey` authorization by default. However all other AppSync authorization options are available via the `auth` input.

`IAM` authorization:

```yml
inputs:
  src: ./
  auth: iam
```

`Cognito` authorization:

```yml
inputs:
  src: ./
  auth:
    userPoolId: qwertyuiop
    defaultAction: ALLOW
    region: us-east-1
    appIdClientRegex: qwertyuiop
```

`OpenID` authorization:

```yml
inputs:
  src: ./
  auth:
    issuer: qwertyuiop
    authTTL: 0
    clientId: wertyuiop
    iatTTL: 0
```

## Data Sources Resolvers

If you'd like to setup your resolvers to use your own existing data sources, you could specify your resolvers as a `serverless.yml` input instead of inside a `resolvers.js` file.

In that case, you'll need to also specify your own `request` and `response` VTL templates. You could do that directly in `serverless.yml`, or by pointing to a `vtl` file inside of your `src` directory.

Here's an example using an existing lambda as a data source:

```yml
inputs:
  src: ./
  resolvers:
    Query:                          # this must be a valid type in your schema
      getPost:                      # this must be a valid resolver in your schmea
        lambda: my-lambda           # this will set up the my-lambda Lambda as a data source for this resolver
        request: >                  # the request VTL template for this resolver.
          { "version": "2017-02-28", "operation": "Invoke", "payload": $util.toJson($context)  }
        response: response.vtl      # you could also point to a VTL file relative to your src directory.
```

These `request` and `response` properties are required regardless of which data source you are working with, and they're different depending on your schema and your application requirements. Check out the [official AWS docs](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference.html) for more information on the required syntax for each data source.

## Lambda Resolvers

```yml
inputs:
  src: ./
  resolvers:
    Query:                          
      getPost:                      
        lambda: my-lambda
        request: '{ "version": "2017-02-28", "operation": "Invoke", "payload": $util.toJson($context)  }'
        response: '$util.toJson($context.result)'
```


## DynamoDB Resolvers

```yml
inputs:
  src: ./
  resolvers:
    Query:                          
      getPost:                      
        table: my-table
        request: >
          {
              "version" : "2017-02-28",
              "operation" : "PutItem",
              "key" : {
                  "id" : $util.dynamodb.toDynamoDBJson($context.arguments.id)
              }
          }
        response: '$util.toJson($context.result)'
```

## ElasticSearch Resolvers

```yml
inputs:
  src: ./
  resolvers:
    Query: 
      getPost:
        endpoint: https://search-my-sample-data-abbaabba.us-east-1.es.amazonaws.com
        request: >
          {
              "version":"2017-02-28",
              "operation":"GET",
              "path":"/id/post/_search",
              "params":{
                  "headers":{},
                  "queryString":{},
                  "body":{
                      "from":0,
                      "size":50
                  }
              }
          }
        response: >
          [
              #foreach($entry in $context.result.hits.hits)
              #if( $velocityCount > 1 ) , #end
              $utils.toJson($entry.get("_source"))
              #end
          ]
```

## Relational Database Resolvers

```yml          
inputs:
  src: ./
  resolvers:
    Query:    
      getPost: 
        database: my-database
        dbClusterIdentifier: arn:aws:rds:us-east-1:123456789123:cluster:my-serverless-aurora-postgres-1
        awsSecretStoreArn: arn:aws:secretsmanager:us-east-1:123456789123:secret:rds-db-credentials/cluster-ABCDEFGHI/admin-aBc1e2
        relationalDatabaseSourceType: RDS_HTTP_ENDPOINT
        schema: public
        request: >
          {
              "version": "2018-05-29",
                  "statements": [
                      $util.toJson("select * from Posts WHERE id='$ctx.args.id'")
              ]
          }
        response: '$utils.toJson($utils.rds.toJsonObject($ctx.result)[0][0])'
```

# CLI Reference

## deploy

To deploy, simply run `deploy` from within the directory containing the `serverless.yml` file:

```
serverless deploy
```

If you'd like to know what's happening under the hood and see realtime logs, you can pass the `--debug` flag:

```
serverless deploy --debug
```


## dev (dev mode)

Instead of having to run `serverless deploy` everytime you make changes you wanna test, you can enable **dev mode**, which allows the CLI to watch for changes in your source directory as you develop, and deploy instantly on save. 

To enable dev mode, simply run the following command from within the directory containing the `serverless.yml` file:

```
serverless dev
```

Dev mode also enables live streaming logs from your GraphQL app so that you can see the results of your code changes right away on the CLI as they happen.

## info

Anytime you need to know more about your running GraphQL instance, you can run the following command to view the most critical info:

```
serverless info
```

This is especially helpful when you want to know the outputs of your instances so that you can reference them in another instance. It also shows you the status of your instance, when it was last deployed, how many times it was deployed, and the error message & stack if the latest deployment failed.

To dig even deeper, you can pass the `--debug` flag to view the state object of your component instance:

```
serverless info --debug
```

## remove

If you wanna tear down your entire GraphQL infrastructure that was created during deployment, just run the following command in the directory containing the `serverless.yml` file:

```
serverless remove
```

The GraphQL component will then use all the data it needs from the built-in state storage system to delete only the relavent cloud resources that it created.

Just like deployment, you could also specify a `--debug` flag for realtime logs from the GraphQL component running in the cloud:

```
serverless remove --debug
```

# Outputs Reference

```yml
name:   graphql-api-pxzaf135
apiKey: da2-yf444kxlhjerxl376jxyafb2rq
apiId:  survbmoad5ewtnm3e3cd7qys4q
url:    https://cnbfx5zutbe4fkrtsldsrunbuu.appsync-api.us-east-1.amazonaws.com/graphql
```

# FAQs

## How do I add NPM packages to the resolvers?

You can run `npm init` & `npm install` as you normally would in the directory containing the `resolvers.js` file. This is the root of your app. This entire directory is uploaded to your Lambda function, and you can structure it however you want. Just make sure `resolvers.js` and `schema.graphql` are in the root of the directory.
