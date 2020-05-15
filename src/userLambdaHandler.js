const path = require('path')
const fs = require('fs')

const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath)
    return true
  } catch (e) {
    return false
  }
}

module.exports.handler = async (event) => {
  const resolversFilePath = path.join(__dirname, 'resolvers.js')

  if (!(await fileExists(resolversFilePath))) {
    throw new Error(`The "resolvers.js" file was not found in your source directory`)
  }

  const resolvers = require('./resolvers')
  const { parentTypeName, fieldName } = event.info

  // these validation errors will likely never run because they're covered
  // by component validation but leaving them just in case
  if (!resolvers[parentTypeName]) {
    throw new Error(`The "${parentTypeName}" type is not exported in resolvers.js`)
  }

  if (!resolvers[parentTypeName][fieldName]) {
    throw new Error(
      `Resolver "${fieldName}" for type "${parentTypeName}" is not exported in resolvers.js`
    )
  }

  if (typeof resolvers[parentTypeName][fieldName] !== 'function') {
    throw new Error(`Resolver "${fieldName}" for type "${parentTypeName}" must be a function`)
  }

  // todo how does variables work in graphql?
  return resolvers[parentTypeName][fieldName](event.arguments, event)
}
