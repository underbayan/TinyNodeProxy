import './process'

import { getHostPort } from './util'
import net from 'net'

net
  .createServer((proxy: net.Socket) => {
    proxy.once('data', (data: Buffer) => {
      // console.log(data.toString())
      const { port, hostname } = getHostPort(data)
      const client = net.connect(port, hostname, () => {
        client.write(data)
        client.pipe(proxy).pipe(client)
        // client.on("data", (data) => console.log(data.toString()))
      })
    })
  })
  .listen(9021)
