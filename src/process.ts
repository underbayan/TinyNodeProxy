process.setMaxListeners(0)
process.on('unhandledRejection' as any, (reason: any, promise: any) => {
  let errorString = reason
  console.error('unhandledRejection ' + errorString, promise)
})
process.on('uncaughtException' as any, (err: any, origin: any) => {
  let errorString = origin
  console.error('uncaughtException ' + errorString, err)
})
process.on('SIGINT', (...e) => {
  console.error(e)
  process.exit()
})
process.on('exit', (code) => {
  console.error(code)
  process.exit()
})
