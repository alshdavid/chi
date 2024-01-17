import * as http from "node:http"

export function send_ok(res: http.ServerResponse): void {
  res.statusCode = 204;
  res.setHeader("Content-Type", "text/plain");
  res.end("");
}

export function send_json<T = any>(res: http.ServerResponse, data: T, statusCode = 200): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data, null, 2));
}

export function send_text(res: http.ServerResponse, data: string, statusCode = 200): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain')
  res.end(JSON.stringify(data, null, 2));
}

export function read_body(req: http.IncomingMessage): Promise<string> {
  return new Promise(res => {
    let body = ''
    req.on('data', (chunk: any) => body += chunk)
    req.on('end', () => res(body))
  })
}

export async function read_body_json<T = unknown>(req: http.IncomingMessage): Promise<T> {
  const str = await read_body(req)
  if (typeof str === 'string') {
    return JSON.parse(str)
  } else {
    throw new Error('Body is not a string')
  }
}