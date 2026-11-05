// One error type for everything the API refuses. `status` is the HTTP status, `code` is the stable word a client
// branches on. Messages never contain document contents or anything else personal.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export const invalid = (message) => new ApiError(400, "invalid_argument", message);
export const unauthenticated = () => new ApiError(401, "unauthenticated", "Sign in first");
export const forbidden = (message) => new ApiError(403, "forbidden", message || "Not allowed");
export const notFound = () => new ApiError(404, "not_found", "Not found");
export const unavailable = (message) => new ApiError(503, "unavailable", message || "Try again");
