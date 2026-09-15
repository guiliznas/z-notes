export class HttpError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new HttpError(400, "bad_request", msg);
export const unauthorized = (msg = "Não autenticado") => new HttpError(401, "unauthorized", msg);
export const forbidden = (msg = "Acesso restrito ao administrador") => new HttpError(403, "forbidden", msg);
export const notFound = (msg = "Não encontrado") => new HttpError(404, "not_found", msg);
export const conflict = (msg: string) => new HttpError(409, "conflict", msg);
export const badGateway = (msg: string) => new HttpError(502, "oauth_failed", msg);
export const serviceUnavailable = (msg: string) => new HttpError(503, "oauth_unconfigured", msg);
