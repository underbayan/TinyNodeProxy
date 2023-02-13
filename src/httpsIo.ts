import './process'

import { createHttpHeader, getHostPort, getReqInfo, getResInfo } from './util'
import http, { createServer } from 'http'

import { Server as IOServer } from 'socket.io'
import { Readable } from 'stream';
import createServerCertificate from './cert'
import fs from 'fs'
import https from 'https'
import net from 'net'
import tls from 'tls'
import zlib from 'zlib'

const httpServer = createServer();
const io = new IOServer(httpServer, { path: "/NAME_SPACE", cors: { origin: '*' } });
httpServer.listen(9025);

const doge = fs.readFileSync("./src/doge.jpg")
io.on('connection', (socket: any) => {
  socket.on('NEW_ENTER', async (pk: string) => {
    socket._room = "proxy-room"
    socket.join(socket._room)
    io.to(socket._room).emit('STATUS_CHANGE', { status: 'Connected' })
  })
})


export const sendMsg = async (req: any, res: any, data: any, room = "proxy-room") => {
  let body = await new Promise(resolve => {
    if (!data) resolve("")
    switch (
    res.headers['content-encoding'] ||
    res.headers['Content-Encoding']
    ) {
      case 'gzip':
        zlib.gunzip(data, (err: any, d: any) => {
          resolve(d && d.toString())
        })
        break
      case 'deflate':
        zlib.inflate(data, (err: any, d: any) => {
          resolve(d && d.toString())

        })
        break
      case 'br':
        zlib.brotliDecompress(data, (err: any, d: any) => {
          resolve(d && d.toString())
        })
        break
      default:
        resolve(data.toString())
    }
  })

  io.to(room).emit('RECEIVE_MSG', { req: getReqInfo(req), res: getResInfo(res), body })
}
export const getRequestHandle = (isHttps: boolean) => (req: any, res: any, ...e: any) => {
  const proxyReq = (isHttps ? https : http).request(getReqInfo(req, isHttps), (ires: any) => {
    const data: any = []
    if ((ires.headers["content-type"] || "").indexOf("image/jpeg") !== -1) {
      delete ires.headers["content-length"]
      res.writeHead(ires.statusCode, { ...ires.headers, "content-length": 14292 })
      const stream = Readable.from(Buffer.from(doge))
      return (stream).pipe(res)
    }
    res.writeHead(ires.statusCode, ires.headers)
    ires.pipe(res)


    ires.on('end', () => sendMsg(req, ires, Buffer.concat(data)))
    ires.on('data', (chunk: any) => data.push(chunk))
    ires.on('error', (error: any) => sendMsg(req, res, error))
  })
  req.pipe(proxyReq)
}

const mitm = new https.Server(
  {
    ...createServerCertificate('127.0.0.1'),
    SNICallback: (hostname, callback) =>
      callback(
        null,
        tls.createSecureContext({ ...createServerCertificate(hostname) })
      ),
  },
  () => { mitm.once('request', getRequestHandle(true)) }
)
mitm.on('upgrade', (req: any, res: any, ...e: any) => {
  const proxyReq = https.request(getReqInfo(req, true, true))
  proxyReq.on('upgrade', (proxyRes: any, proxySocket: any, proxyHead: any) => {
    res.write(createHttpHeader('HTTP/1.1 101 Switching Protocols', proxyRes.headers))
    proxySocket.pipe(res).pipe(proxySocket)
  })
  req.pipe(proxyReq)
})

const tcpServer = net
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
tcpServer.listen(9023, () => console.log(9023))
mitm.listen(9024, () => console.log(9024))




