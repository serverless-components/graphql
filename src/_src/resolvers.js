const Query = {
  getPost: async ({ id }) => {
    return { id }
  }
}

const Mutation = {
  createPost: async ({ id }) => {
    return { id }
  }
}

module.exports = { Query, Mutation }
