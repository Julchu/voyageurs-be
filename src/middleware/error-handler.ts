import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  // HttpErrors and body-parser errors (bad JSON, body too large) carry a 4xx status and a safe message.
  const status = Number(error?.status);
  if (status >= 400 && status < 500) {
    res.status(status).json({ success: false, error: error.message });
    return;
  }

  console.error("Request failed", error);
  res.status(500).json({ success: false, error: "Internal Server Error" });
};
