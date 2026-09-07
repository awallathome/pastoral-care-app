import { Router } from "express";
import { z } from "zod";
import { Role, VisitStatus, ContactMethod } from "@prisma/client";
import { prisma } from "../db";
import { requireRole, redactVisit, logAudit, canAccessNotes } from "../middleware/rbac";

export const visitsRouter = Router();

// GET /visits?from=ISO&to=ISO&mine=true
// Backs the "Today" / day-of-week schedule screen. Returns each visit with
// its person's basic contact info attached, and notes redacted per role.
visitsRouter.get("/", async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const mineOnly = req.query.mine === "true";

  const visits = await prisma.visit.findMany({
    where: {
      ...(from || to
        ? {
            scheduledFor: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(mineOnly ? { person: { assignedMinisterId: req.user!.id } } : {}),
    },
    orderBy: { scheduledFor: "asc" },
    include: {
      person: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
      alternateContact: true,
    },
  });

  res.json(visits.map((v) => redactVisit(v, req.user!.role)));
});

// GET /visits/:id — single visit, for the visit detail screen.
visitsRouter.get("/:id", async (req, res) => {
  const visit = await prisma.visit.findUnique({
    where: { id: req.params.id },
    include: {
      person: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
      alternateContact: true,
    },
  });

  if (!visit) return res.status(404).json({ error: "Visit not found" });

  if (visit.notes && canAccessNotes(req.user!.role)) {
    await logAudit({ userId: req.user!.id, action: "VIEW_NOTES", visitId: visit.id, personId: visit.personId });
  }

  res.json(redactVisit(visit, req.user!.role));
});

const scheduleSchema = z.object({
  personId: z.string().min(1),
  scheduledFor: z.string().datetime(),
  alternateContactId: z.string().optional(),
});

// POST /visits — schedule a future visit, or drop someone onto today's
// schedule ad hoc (e.g. "they went to the hospital"). Open to every role —
// scheduling isn't sensitive; note content is handled separately below.
visitsRouter.post("/", async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const visit = await prisma.visit.create({
    data: {
      personId: parsed.data.personId,
      scheduledFor: new Date(parsed.data.scheduledFor),
      alternateContactId: parsed.data.alternateContactId,
      status: VisitStatus.SCHEDULED,
      loggedById: req.user!.id,
    },
  });

  res.status(201).json(redactVisit(visit, req.user!.role));
});

const rescheduleSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "CANCELED", "RESCHEDULED"]).optional(),
  alternateContactId: z.string().optional(),
});

// PATCH /visits/:id — cancel, reschedule, or change the alternate contact.
// No notes here on purpose; completing a visit (below) is the only place
// note content is written.
visitsRouter.patch("/:id", async (req, res) => {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const visit = await prisma.visit.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.scheduledFor ? { scheduledFor: new Date(parsed.data.scheduledFor) } : {}),
      ...(parsed.data.status ? { status: parsed.data.status as VisitStatus } : {}),
      ...(parsed.data.alternateContactId !== undefined
        ? { alternateContactId: parsed.data.alternateContactId }
        : {}),
    },
  });

  res.json(redactVisit(visit, req.user!.role));
});

const completeSchema = z.object({
  contactMethod: z.enum(["IN_PERSON", "PHONE", "EMAIL", "TEXT", "OTHER"]),
  notes: z.string().optional(),
  nextVisitScheduledFor: z.string().datetime().optional(),
});

// POST /visits/:id/complete — log how contact was made + notes, and
// optionally schedule the next visit in one step. Notes are the sensitive
// field, so only ADMIN/MINISTER can call this.
visitsRouter.post(
  "/:id/complete",
  requireRole(Role.ADMIN, Role.MINISTER),
  async (req, res) => {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: {
        status: VisitStatus.COMPLETED,
        contactMethod: parsed.data.contactMethod as ContactMethod,
        notes: parsed.data.notes,
        loggedById: req.user!.id,
      },
    });

    await logAudit({ userId: req.user!.id, action: "EDIT_NOTES", visitId: visit.id, personId: visit.personId });

    let nextVisit = null;
    if (parsed.data.nextVisitScheduledFor) {
      nextVisit = await prisma.visit.create({
        data: {
          personId: visit.personId,
          scheduledFor: new Date(parsed.data.nextVisitScheduledFor),
          status: VisitStatus.SCHEDULED,
          loggedById: req.user!.id,
        },
      });
    }

    res.json({ visit: redactVisit(visit, req.user!.role), nextVisit });
  }
);
