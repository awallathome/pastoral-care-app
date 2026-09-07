import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// Augment Express's Request with the authenticated user attached by
// middleware/auth.ts.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
