import * as http from "node:http"

export function cors(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    res.end()
    return false
  }

  return true
}

export function cache_control(res: http.ServerResponse, duration: number = 0) {
  if (duration === 0) {
    res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store')
  }
  // TODO
}
