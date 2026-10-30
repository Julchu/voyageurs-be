import type { ErrorRequestHandler } from "express";
import createError from "http-errors";
import { ConflictError, ValidationError } from "../lib/errors.ts";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const httpError =
    error instanceof ValidationError
      ? createError(400, error.message)
      : error instanceof ConflictError
        ? createError(409, error.message)
        : createError(error instanceof Error ? error : new Error("Unknown error"));
  const status = httpError.status;

  if (status >= 500) console.error("Request failed", error);

  res.status(status).json({
    success: false,
    error: status >= 500 ? "Internal Server Error" : httpError.message,
  });
};
