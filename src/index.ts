#!/usr/bin/env node

import debug from "debug";
import { createServer } from "http";
import app from "./app.ts";

const debugServer = debug("voyageurs-be:server");

const normalizePort = (val: string) => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
};

interface NodeSystemError extends Error {
  code?: string;
  syscall?: string;
}

const onError = (error: NodeSystemError) => {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      return process.exit(1);
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      return process.exit(1);
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  if (addr) {
    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    debugServer("Listening on " + bind);
  }
};

const port = normalizePort(process.env.PORT || "8001");
app.set("port", port);

const server = createServer(app);

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);