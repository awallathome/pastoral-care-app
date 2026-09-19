import { Router } from "express";
import { z } from "zod";
import { Role, VisitStatus } from "../constants";
import { prisma } from "../db";
import { requireRole, redactVisit, logAudit } from "../middleware/rbac";

export const peopleRouter = Router();

// GET /people — the roster. Ministers/support staff typically only need
// their own caseload day-to-day; ?mine=true filters to the caller.
// Includes `lastVisitAt` (most recent COMPLETED visit) for the People list.
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
      visits: {
        where: { status: VisitStatus.COMPLETED },
        orderBy: { scheduledFor: "desc" },
        take: 1,
        select: { scheduledFor: true },
      },
    },
  });

  res.json(
    people.map(({ visits, ...person }) => ({
      ...person,
      lastVisitAt: visits[0]?.scheduledFor ?? null,
    }))
  );
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

// Empty strings from the mobile form become null so clearing a field (or
// leaving it blank on create) doesn't fail Zod's email check.
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().nullable().optional()
);
const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().email().nullable().optional()
);

const personSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: optionalText,
  phone: optionalText,
  email: optionalEmail,
  notesFlag: optionalText,
  assignedMinisterId: z.string().optional().nullable(),
});

// POST /people — add a new parishioner to the roster. Open to every role:
// support staff need to be able to capture contact info when someone enters
// care, same as ministers.
peopleRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MINISTER, Role.SUPPORT_STAFF),
  async (req, res) => {
    const parsed = personSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // Ministers adding someone land them on their own caseload by default
    // so the new record shows up under People → mine immediately.
    const data = { ...parsed.data };
    if (!data.assignedMinisterId && req.user!.role === Role.MINISTER) {
      data.assignedMinisterId = req.user!.id;
    }

    const person = await prisma.person.create({ data });
    res.status(201).json(person);
  }
);

// PATCH /people/:id — edit demographics / contact info (not visit notes).
// Every authenticated role can update contact fields so scheduling staff
// aren't blocked when a phone number or address changes.
peopleRouter.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.MINISTER, Role.SUPPORT_STAFF),
  async (req, res) => {
    const parsed = personSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const person = await prisma.person.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(person);
  }
);

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
