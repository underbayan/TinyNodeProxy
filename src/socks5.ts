import net from 'net'
import binary from 'binary'
import Put from 'put'

const server = net.createServer((stream) => {
  binary
    .stream(stream)
    .word8('ver')
    .word8('nmethods')
    .buffer('methods', 'nmethods')
    .tap((vars: any) => {
      const methods = [].slice.call(vars.methods).reduce((acc, m) => {
        acc[m] = true
        return acc
      }, {})
      const method = methods[0] ? 0x00 : 0xff
      Put().word8(5).word8(method).write(stream)
    })
    .loop((end) => {
      stream.on('end', end)
      this.word8('ver')
        .word8('cmd')
        .word8('rsv')
        .word8('dst.atyp')
        .tap((vars: any) => {
          var atyp = vars.dst.atyp
          if (atyp === 0x01) {
            // ipv4
            this.buffer('addr.buf', 4).tap((vars: any) => {
              vars.dst.addr = [].slice.call(vars.addr.buf).join('.')
            })
          } else if (atyp === 0x03) {
            // domain name
            this.word8('addr.size')
              .buffer('addr.buf', 'addr.size')
              .tap((vars: any) => {
                vars.dst.addr = vars.addr.buf.toString()
              })
          } else if (atyp === 0x04) {
            // ipv6
            this.word32be('addr.a')
              .word32be('addr.b')
              .word32be('addr.c')
              .word32be('addr.d')
              .tap((vars: any) => {
                vars.dst.addr = 'abcd'.split('').map((x) => {
                  return vars.addr[x].toString(16)
                })
              })
          }
        })
        .word16bu('dst.port')
        .tap((vars: any) => {
          var dst = vars.dst
          console.dir(vars)
          console.log(
            {
              host: dst.addr,
              port: dst.port,
            },
            stream
          )
        })
    })
})
server.listen(7890)
