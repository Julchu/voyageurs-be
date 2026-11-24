import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/errors.ts";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  // HttpErrors, body-parser errors (bad JSON, body too large) and the router's bad-encoding URIError carry a 4xx status and a safe message.
  const status = Number(error?.status);
  const safe = error instanceof HttpError || error instanceof URIError || error?.expose === true;
  if (safe && status >= 400 && status < 500) {
    res.status(status).json({ success: false, error: error.message });
    return;
  }

  console.error("Request failed", error);
  res.status(500).json({ success: false, error: "Internal Server Error" });
};
