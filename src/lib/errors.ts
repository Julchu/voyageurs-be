// An expected business rule failure whose message is safe to return to the client.
export class ValidationError extends Error {
  name = "ValidationError";
}

export class ConflictError extends Error {
  name = "ConflictError";
}
