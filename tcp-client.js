const { PromiseSocket } = require('promise-socket')

const PORT = 3000
const HOST = 'localhost'

const exec = async (payload) => {
  const client = new PromiseSocket()
  await client.connect(PORT, HOST)
  await client.write(Buffer.from(JSON.stringify(payload)))
  const response = await client.read()
  await client.end()

  return JSON.parse(response)
}

exports.exec = exec
