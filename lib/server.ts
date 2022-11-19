import {IFeed} from './types/feed'
import {getMap} from './cache'
import {LISTEN_PORT} from './config'
import {
  connection,
  IUtf8Message,
  Message,
  request,
  server as Server,
} from 'websocket'
import {createServer} from 'http'
import {debug, error, info, verbose, warn} from './log'
import packageInfo from '../package.json'

export const launch = () => {
  info(`${packageInfo.name} ${packageInfo.version}`)
  info(`by ${packageInfo.author.name}`)

  const server = createServer((_, res) => {
    res.writeHead(404)
    res.end()
  })

  server.listen(LISTEN_PORT, () => {
    verbose(`Listening on ${LISTEN_PORT}`)
  })

  const socket = new Server({
    httpServer: server,
    autoAcceptConnections: false,
  })

  socket.on('request', (req: request) => {
    verbose(`Request received (${req.origin})`)

    if (!allowed(req)) {
      req.reject()
      warn(`Request was blocked! ${req.origin}`)
      return
    }

    const connection = req.accept('map-generation', req.origin)
    verbose(`Accepted request (${connection.remoteAddress})`)

    connection.on('message', async (message: Message) => {
      if (message.type === 'binary') {
        warn(`Ignoring received binary message! (${connection.remoteAddress})`)
        warn(`Binary messages are not accepted!`)
        return
      }

      verbose(`Received map request (${connection.remoteAddress})`)

      const utfMessage = message as IUtf8Message
      debug(utfMessage.utf8Data)

      await handleMessage(utfMessage.utf8Data, connection)
    })

    connection.on('close', (reason, description) => {
      warn(`Connection closed! (${connection.remoteAddress})`)
      verbose(`Reason: ${description} (${reason})`)
    })
  })
}

const handleMessage = async (json: string, connection: connection) => {
  verbose(`Requesting map from cache (${connection.remoteAddress})`)

  let map: IFeed

  try {
    const config = JSON.parse(json)
    map = await getMap(config)
  } catch (e) {
    error('Failed to retrieve map from cache!')
    error(e.toString())
  }

  verbose(`Sending map (${connection.remoteAddress})`)
  const stringMap = JSON.stringify(map)
  debug(stringMap)
  connection.sendUTF(stringMap)
  verbose(`Map was sent (${connection.remoteAddress})`)
}

const allowed = (req: request) => {
  if (!req.origin.includes('127.0.0.1') && !req.origin.includes('localhost')) {
    return false
  } else {
    return true
  }
}
