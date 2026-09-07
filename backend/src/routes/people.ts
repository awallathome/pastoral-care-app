import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db";
import { requireRole, redactVisit, logAudit } from "../middleware/rbac";

export const peopleRouter = Router();

// GET /people — the roster. Ministers/support staff typically only need
// their own caseload day-to-day; ?mine=true filters to the caller.
peopleRouter.get("/", async (req, res) => {
  const mineOnly = req.query.mine === "true";

  const people = await prisma.person.findMany({
    where: mineOnly ? { assignedMinisterId: req.user!.id } : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      notesFlag: true,
      active: true,
      assignedMinisterId: true,
    },
  });

  res.json(people);
});

// GET /people/:id — full record: demographics, family, emergency contacts,
// and visit history. Notes on each visit are redacted for roles that
// shouldn't see them (see middleware/rbac.ts).
peopleRouter.get("/:id", async (req, res) => {
  const person = await prisma.person.findUnique({
    where: { id: req.params.id },
    include: {
      familyMembers: true,
      emergencyContacts: true,
      visits: { orderBy: { scheduledFor: "desc" } },
      assignedMinister: { select: { id: true, name: true } },
    },
  });

  if (!person) return res.status(404).json({ error: "Person not found" });

  await logAudit({ userId: req.user!.id, action: "VIEW_PERSON", personId: person.id });

  res.json({
    ...person,
    visits: person.visits.map((v) => redactVisit(v, req.user!.role)),
  });
});

const personSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notesFlag: z.string().optional(),
  assignedMinisterId: z.string().optional(),
});

// POST /people — add a new parishioner to the roster.
peopleRouter.post("/", requireRole(Role.ADMIN, Role.MINISTER), async (req, res) => {
  const parsed = personSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const person = await prisma.person.create({ data: parsed.data });
  res.status(201).json(person);
});

// PATCH /people/:id — edit demographics (not notes — those live on visits).
peopleRouter.patch("/:id", requireRole(Role.ADMIN, Role.MINISTER), async (req, res) => {
  const parsed = personSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const person = await prisma.person.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(person);
});

const familyMemberSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().optional(),
});

// POST /people/:id/family — add a spouse/child/etc. Intentionally thin: we
// record just enough to show "who's in this person's life," not a full
// sensitive profile on the family member (see README > Handling Sensitive Data).
peopleRouter.post("/:id/family", requireRole(Role.ADMIN, Role.MINISTER), async (req, res) => {
  const parsed = familyMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const member = await prisma.familyMember.create({
    data: { ...parsed.data, personId: req.params.id },
  });
  res.status(201).json(member);
});

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
});

// POST /people/:id/emergency-contacts — "closest contact in case of
// emergency like hospital visit."
peopleRouter.post(
  "/:id/emergency-contacts",
  requireRole(Role.ADMIN, Role.MINISTER),
  async (req, res) => {
    const parsed = emergencyContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const contact = await prisma.emergencyContact.create({
      data: { ...parsed.data, personId: req.params.id },
    });
    res.status(201).json(contact);
  }
);
