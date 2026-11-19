declare namespace Express {
  interface Request {
    /** Set by requireUser; only read it on protected routes. */
    userId: number;
  }
}
