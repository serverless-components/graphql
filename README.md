# Serverless GraphQL Component

This Serverless Framework Component is a specialized developer experience focused on making it easy to deploy and manage GraphQL applications on serverless infrastructure (specifically AWS AppSync and AWS Lambda) on your own AWS account. It comes loaded with powerful development features and represents possibly the easiest, cheapest and most scalable way to host GraphQL apps.

<br/>

- [x] **Never Pay For Idle** - No requests, no cost. Averages $0.0000002-$0.0000009 per request.
- [x] **Zero Configuration** - All we need is your code, then just deploy (advanced config options are available).
- [x] **Fast Deployments** - Deploy to the cloud in seconds.
- [x] **Realtime Logging** - Rapidly develop on the cloud w/ real-time logs and errors in the CLI.
- [x] **Team Collaboration** - Collaborate with your teamates with shared state and outputs.
- [ ] **Canary Deployments** - Deploy your app gradually to a subset of your traffic overtime.
- [ ] **Custom Domain + SSL** - Auto-configure a custom domain w/ a free AWS ACM SSL certificate.
- [ ] **Built-in Monitoring** - Monitor your GraphQL app right from the Serverless Dashboard.

<br/>

# Contents

- [**Install**](#install)
- [**Create**](#create)
- [**Deploy**](#deploy)
- [**Query**](#query)
- [**Configure**](#configure)
- [**Develop**](#develop)
- [**Montior**](#monitor)
- [**Remove**](#remove)
- [**Guides**](#guides)

# Install

To get started with this component, install the latest version of the Serverless Framework:

```
$ npm install -g serverless
```

# Create

You can easily create a new GraphQL app just by using the following command and template url.

```
$ serverless create --template-url https://github.com/serverless/components/tree/master/templates/graphql
$ cd graphql
```

Then, create a new `.env` file in the root of the `graphql` directory right next to `serverless.yml`, and add your AWS access keys:

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

You should now have a directory that looks something like this:

```
|- serverless.yml
|- .env
|- resolvers.js
|- schema.graphql
```

The `serverless.yml` file is where you define your component config. It looks something like this:

```yml
component: graphql
name: graphql-api

inputs:
  src: ./
```

You can find more configuration options for the `serverless.yml` file below.

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

# Deploy

Once you have the directory set up, you're now ready to deploy. Just run `serverless deploy` from within the directory containing the `serverless.yml` file. Your first deployment might take a little while, but subsequent deployment would just take few seconds.

After deployment is done, you should see your the following outputs:

```yml
name:   component-test-2-pxzaf135
apiKey: da2-yf444kxlhjerxl376jxyafb2rq
apiId:  survbmoad5ewtnm3e3cd7qys4q
url:    https://cnbfx5zutbe4fkrtsldsrunbuu.appsync-api.us-east-1.amazonaws.com/graphql
```

# Query

# Configure

The GraphQL component is a zero configuration component, meaning that it'll work out of the box with no configuration and sane defaults. With that said, there are still a lot of optional configuration that you can specify.

Here's a complete reference of the `serverless.yml` file for the GraphQL component:

```yml
component: graphql               # (required) name of the component. In that case, it's graphql.
name: graphql-api                # (required) name of your graphql component instance.
org: serverlessinc               # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is dev.

inputs:
  src: ./                        # (optional) path to the source folder. default is a simple blogging app.
  memory: 512                    # (optional) lambda memory size. default is 3008.
  timeout: 10                    # (optional) lambda timeout. default is 300.
  description: My GraphQL App    # (optional) lambda description. default is en empty string.
  env:                           # (optional) env vars. default is an empty object
    TABLE: 'my-table'
  policy:                        # (optionnal) policy statement to attach to the lambda/appsync role. default is a strict policy that only has access to invoke your lambda and create CloudWatch Logs
    - Action: '*'
      Effect: Allow
      Resource: '*'
  layers:                        # (optional) list of lambda layer arns to attach to your lambda function.
    - arn:aws:first:layer
    - arn:aws:second:layer
  domain: api.serverless.com     # (optional) if the domain was registered via AWS Route53 on the account you are deploying to, it will automatically be set-up with your GraphQL AppSync API, as well as a free CDN & AWS ACM SSL Cert.
  region: us-east-2              # (optional) aws region to deploy to. default is us-east-1.
```

Once you've chosen your configuration, run `serverless deploy` again (or simply just `serverless`) to deploy your changes.


# Develop

Now that you've got your basic express app up and running, it's time to develop that into a real world application. Instead of having to run `serverless deploy` everytime you make changes you wanna test, run `serverless dev`, which allows the CLI to watch for changes in your source directory as you develop, and deploy instantly on save. 

To enable dev mode, simply run `serverless dev` from within the directory containing the `serverless.yml` file.

Dev mode also enables live streaming logs from your express app so that you can see the results of your code changes right away on the CLI as they happen.

# Monitor

Anytime you need to know more about your running GraphQL instance, you can run `serverless info` to view the most critical info. This is especially helpful when you want to know the outputs of your instances so that you can reference them in another instance.

It also shows you the status of your instance, when it was last deployed, how many times it was deployed, and the error message & stack if the latest deployment failed. To dig even deeper, you can pass the `--debug` flag to view the state object of your component instance. 

# Remove

If you wanna tear down your entire GraphQL infrastructure that was created during deployment, just run `serverless remove` in the directory containing the `serverless.yml` file. The GraphQL component will then use all the data it needs from the built-in state storage system to delete only the relavent cloud resources that it created.

Just like deployment, you could also specify a `--debug` flag for realtime logs from the GraphQL component running in the cloud.

# Guides
