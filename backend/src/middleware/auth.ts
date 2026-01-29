import type { NextFunction, Request, Response } from "express";
import { getSession } from "../data/store";

export type AuthedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: "DEVELOPER" | "CREATOR";
    walletAddress?: string;
  };
};

export function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : (req.header("x-api-token") ?? null);
  const session = getSession(token);
  if (session) req.user = session.user;
  next();
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Provide Authorization: Bearer <token>",
      });
      return;
    }
    next();
  });
}
