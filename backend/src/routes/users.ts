import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "../constants";
import { prisma } from "../db";
import { requireRole } from "../middleware/rbac";

export const usersRouter = Router();

// GET /users — the team roster. Ministers can list (filtered to
// ?role=MINISTER) to populate the "reassign to" picker on a parishioner's
// record; full management (create/deactivate/change role) is admin-only.
usersRouter.get("/", requireRole(Role.ADMIN, Role.MINISTER), async (req, res) => {
  const roleFilter = typeof req.query.role === "string" ? req.query.role : undefined;

  const users = await prisma.user.findMany({
    where: roleFilter ? { role: roleFilter } : undefined,
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { assignedPeople: true } },
    },
  });

  res.json(users);
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "MINISTER", "SUPPORT_STAFF"]),
});

// POST /users — add a team member. There's no self-serve signup by design:
// an admin invites people onto the roster, matching how church staff
// accounts actually get set up.
usersRouter.post("/", requireRole(Role.ADMIN), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "A user with that email already exists" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role as Role,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  res.status(201).json(user);
});

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MINISTER", "SUPPORT_STAFF"]).optional(),
  active: z.boolean().optional(),
});

// PATCH /users/:id — change role or activate/deactivate. Deactivating
// someone (e.g. they've left staff) blocks login without deleting their
// history — visits they logged and audit entries stay intact.
usersRouter.patch("/:id", requireRole(Role.ADMIN), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (req.params.id === req.user!.id && parsed.data.active === false) {
    return res.status(400).json({ error: "You can't deactivate your own account" });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  res.json(user);
});
