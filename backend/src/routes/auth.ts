import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { signToken } from "../middleware/auth";
import { AuthUser } from "../types";
import { Role } from "../constants";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email and password" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Deliberately vague error — don't reveal whether the email exists.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  if (!user.active) {
    return res.status(403).json({ error: "This account has been deactivated. Contact an admin." });
  }

  // user.role comes from our own database as a plain string (no native
  // Postgres enum) — safe to trust here since it's only ever written by our
  // own seed script / user-management code using the Role constants below.
  const authUser: AuthUser = { id: user.id, name: user.name, email: user.email, role: user.role as Role };
  const token = signToken(authUser);

  res.json({ token, user: authUser });
});
