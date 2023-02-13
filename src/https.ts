import './process'

import { getHostPort } from './util'
import net from 'net'

net
  .createServer((socket: net.Socket) => {
    socket.once('data', (data: Buffer) => {
      const { port, hostname } = getHostPort(data)
      const client = net.connect(port, hostname, () => {
        if (443 === port)
          socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        else client.write(data)
        // client.on("data", (data) => data.toString().lengthrs<512&&console.log(data.toString()))
        client.pipe(socket).pipe(client)
      })
    })
  })
  .listen(9020)
