const { exec } = require('./tcp-client')

const payload = {
  programId: 'c3a8ff90-dd0d-11ee-9363-f942b2467492',
  event: { hola: 'mundo' }
}

setImmediate(async () => {
  console.log('sending request')
  const result = await exec(payload)
  console.log(result)
  console.log('end of request')
})
