import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthUser } from "../types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set — copy .env.example to .env and set a real secret.");
}

/**
 * Verifies the bearer token on every protected request and attaches the
 * decoded user to req.user. Downstream routes/middleware (see rbac.ts) use
 * req.user.role to decide what the caller is allowed to see.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session — please log in again" });
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "12h") as jwt.SignOptions["expiresIn"],
  });
}
