import './process'

import { getHostPort, getReqInfo, printInfo } from './util'
import http,{IncomingMessage} from 'http'

import createServerCertificate from './cert'
import https from 'https'
import net from 'net'
import tls from 'tls'

export const getRequestHandle = (isHttps: boolean) => (req: IncomingMessage, res: any ) => {
  const reqInfo = getReqInfo(req, isHttps)
  const proxyReq = (isHttps ? https : http).request(reqInfo, (ires: any) => {
    res.writeHead(ires.statusCode, ires.headers)
    // ires.on('data', (chunk: any) => {
    //   if (chunk.toString().length < 1512) {
    //     printInfo(chunk, ires)
    //   }
    // })
    ires.pipe(res)
  })
  req.pipe(proxyReq)
}

const mitm: any = new https.Server(
  {
    ...createServerCertificate('127.0.0.1'),
    SNICallback: (hostname, callback) =>
      callback(
        null,
        tls.createSecureContext({ ...createServerCertificate(hostname) })
      ),
  },
  () => mitm.once('request', getRequestHandle(true))
)
mitm.listen(9024, () => console.log(9024))

net
  .createServer((socket: net.Socket) => {
    socket.once('data', (data: Buffer) => {
      let { port, hostname } = getHostPort(data)
      const isHttps = port === 443
      port = isHttps ? (mitm.address() as any).port : port
      hostname = isHttps ? '127.0.0.1' : hostname

      const client = net.connect(port, hostname, () => {
        if (isHttps) socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        else client.write(data)
        client.pipe(socket).pipe(client)
      })
    })
  })
  .listen(9023, () => console.log(9023))
