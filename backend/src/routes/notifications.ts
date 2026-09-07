import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const notificationsRouter = Router();

const tokenSchema = z.object({ token: z.string().min(1) });

// POST /notifications/register-device — the mobile app calls this once it
// has notification permission and an Expo push token, so
// jobs/sendReminders.ts knows where to deliver. One row per installation
// (a phone re-registering just updates who it belongs to — e.g. after
// someone logs out and a different minister logs in on the same device).
notificationsRouter.post("/register-device", async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    update: { userId: req.user!.id },
    create: { token: parsed.data.token, userId: req.user!.id },
  });

  res.status(204).end();
});

// POST /notifications/unregister-device — called on logout so a shared or
// reset device doesn't keep receiving the previous user's reminders.
notificationsRouter.post("/unregister-device", async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await prisma.pushToken.deleteMany({ where: { token: parsed.data.token } });
  res.status(204).end();
});
