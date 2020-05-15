# Serverless GraphQL Component

This Serverless Framework Component is a specialized developer experience focused on making it easy to deploy and manage GraphQL applications on serverless infrastructure (specifically AWS AppSync and AWS Lambda) on your own AWS account. It comes loaded with powerful development features and represents possibly the easiest, cheapest and most scalable way to host GraphQL apps.

- [x] **Never Pay For Idle** - No requests, no cost. Averages $0.0000002-$0.0000009 per request.
- [x] **Zero Configuration** - All we need is your code, then just deploy (advanced config options are available).
- [x] **Fast Deployments** - Deploy to the cloud in seconds.
- [x] **Realtime Logging** - Rapidly develop on the cloud w/ real-time logs and errors in the CLI.
- [x] **Team Collaboration** - Collaborate with your teamates with shared state and outputs.
- [ ] **Canary Deployments** - Deploy your app gradually to a subset of your traffic overtime.
- [ ] **Custom Domain + SSL** - Auto-configure a custom domain w/ a free AWS ACM SSL certificate.
- [ ] **Built-in Monitoring** - Monitor your GraphQL app right from the Serverless Dashboard.

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

While the `resolvers.js` file is where you define your schema resolvers. It looks something like this:


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

Needless to say, any resolver you define in `resolvers.js`, must also be defined in your schema in the `schema.graphql` file. Same goes for the resolvers inputs & outputs. Remember, GraphQL is strongly typed.

# Deploy

Once you have the directory set up, you're now ready to deploy. Just run `serverless deploy` from within the directory containing the `serverless.yml` file. Your first deployment might take a little while, but subsequent deployment would just take few seconds.

After deployment is done, you should see your the following outputs:

```
name:   component-test-2-pxzaf135
apiKey: da2-yf444kxlhjerxl376jxyafb2rq
apiId:  survbmoad5ewtnm3e3cd7qys4q
url:    https://cnbfx5zutbe4fkrtsldsrunbuu.appsync-api.us-east-1.amazonaws.com/graphql
```

# Query

# Configure

# Develop

# Monitor

# Remove

# Guides
