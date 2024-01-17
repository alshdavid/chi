# chi

Lightweight utilities for use with the Node standard http library

## ServerSentEvents

Bidirectional communication using server sent events

Server
```javascript
import * as http from 'node:http'
import { ServerSentEvents } from '@alshdavid/chi'

const hostname = '0.0.0.0';
const port = 3000;

const sse = new ServerSentEvents()

// Run when a new client connects
sse.on_connect(({ id }) => {
  console.log('Connected', id)

  // Broadcast to all connected clients
  sse.send_all({ message: 'New client joined!', id })

  // When a specific client sends message
  sse.on_message(id, (msg) => {
    console.log('from client', id, msg)
  })

  // Send a message to a specific client
  setTimeout(async () => {
    while (true) {
      sse.send(id, { message: 'Hello!' })
      await new Promise(res => setTimeout(res, 1000))
    }
  })
})

// Listen for a message from all clients
sse.on_message_all((id, msg) => {
  console.log('from client (all)', id, msg)
})

// Run when a new client disconnects
sse.on_disconnect(({ id }) => {
  console.log('Disconnected', id)
})

// Set up a standard HTTP server
const server = http.createServer(async (req, res) => {
  // Add route for server-to-client
  if (req.url === '/sse' && req.method === 'GET') {
    await sse.http_handler_on_connection(req, res)
    return
  }

  // Add route for client-to-server
  if (req.url === '/sse' && req.method === 'POST') {
    await sse.http_handler_on_message(req, res)
    return
  }

  res.statusCode = 404
  res.end()
})

server.listen(port, hostname, () => {
  console.log(`Server running on http://${hostname}:${port}/`);
});
```

Client
```javascript
import { SSEClient } from '@alshdavid/chi'

const sse = new SSEClient({ 
  endpoint: '/sse',
})

sse.on(msg => console.log(msg))

sse.send({ message: 'hello world' })
```