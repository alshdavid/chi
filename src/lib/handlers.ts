import * as http from "node:http"

export type HandlerFunc = (req: http.IncomingMessage, res: http.ServerResponse) => any
