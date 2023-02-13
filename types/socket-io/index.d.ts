import socketIo = require('socket.io')
declare module 'socket.io' {
  export interface Socket {
    _room: string
    _owner: any
  }
}
