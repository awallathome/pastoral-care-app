import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { Role, VisitStatus, ContactMethod } from "./constants";

const prisma = new PrismaClient();

// Helper: today at a given hour, offset by N days.
function dayAt(offsetDays: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.person.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: { name: "Pat Reyes", email: "admin@example.com", passwordHash, role: Role.ADMIN },
  });
  const minister = await prisma.user.create({
    data: { name: "Rev. Sam Carter", email: "minister@example.com", passwordHash, role: Role.MINISTER },
  });
  const support = await prisma.user.create({
    data: { name: "Jamie Lin", email: "staff@example.com", passwordHash, role: Role.SUPPORT_STAFF },
  });
  // Deactivated on purpose — demonstrates the admin screen's
  // activate/deactivate control and that login correctly rejects it.
  await prisma.user.create({
    data: {
      name: "Chris Doyle",
      email: "former-staff@example.com",
      passwordHash,
      role: Role.SUPPORT_STAFF,
      active: false,
    },
  });

  console.log("Demo logins (password: password123):");
  console.log(`  Admin:          ${admin.email}`);
  console.log(`  Minister:       ${minister.email}`);
  console.log(`  Support staff:  ${support.email}`);
  console.log(`  Deactivated:    former-staff@example.com (should be refused login — see Admin tab)`);

  const people = await Promise.all(
    [
      {
        firstName: "Eleanor",
        lastName: "Whitfield",
        address: "142 Birchwood Ln, Springfield",
        phone: "555-201-3344",
        email: "eleanor.w@example.com",
        notesFlag: "Homebound",
      },
      {
        firstName: "Harold",
        lastName: "Nguyen",
        address: "88 Maple Ct, Springfield",
        phone: "555-201-9981",
        notesFlag: null,
      },
      {
        firstName: "Dorothy",
        lastName: "Baptiste",
        address: "27 Fenwick Ave, Springfield",
        phone: "555-201-4420",
        notesFlag: "Recently widowed",
      },
      {
        firstName: "Marcus",
        lastName: "Alden",
        address: "9 Cooper St, Springfield",
        phone: "555-201-7765",
        notesFlag: null,
      },
      {
        firstName: "Ruth",
        lastName: "Okafor",
        address: "310 Lindenwood Dr, Springfield",
        phone: "555-201-6602",
        notesFlag: "Hospital — St. Mary's, rm 214",
      },
    ].map((p) => prisma.person.create({ data: { ...p, assignedMinisterId: minister.id } }))
  );

  const [eleanor, harold, dorothy, marcus, ruth] = people;

  await prisma.familyMember.createMany({
    data: [
      { personId: eleanor.id, name: "Frank Whitfield", relationship: "Son", phone: "555-330-1122" },
      { personId: dorothy.id, name: "Alicia Baptiste", relationship: "Daughter", phone: "555-330-8890" },
      { personId: ruth.id, name: "David Okafor", relationship: "Husband", phone: "555-330-4471" },
    ],
  });

  await prisma.emergencyContact.createMany({
    data: [
      { personId: eleanor.id, name: "Frank Whitfield", relationship: "Son", phone: "555-330-1122" },
      { personId: harold.id, name: "Linh Nguyen", relationship: "Wife", phone: "555-330-2298" },
      { personId: dorothy.id, name: "Alicia Baptiste", relationship: "Daughter", phone: "555-330-8890" },
      { personId: ruth.id, name: "David Okafor", relationship: "Husband", phone: "555-330-4471" },
    ],
  });

  // Spread visits across this week so the Today/day-of-week screen has
  // realistic counts. Offsets are relative to today (0 = today).
  await prisma.visit.createMany({
    data: [
      // Today
      { personId: eleanor.id, scheduledFor: dayAt(0, 10), status: VisitStatus.SCHEDULED, loggedById: minister.id },
      { personId: harold.id, scheduledFor: dayAt(0, 13, 30), status: VisitStatus.SCHEDULED, loggedById: minister.id },
      // Tomorrow
      { personId: dorothy.id, scheduledFor: dayAt(1, 9, 30), status: VisitStatus.SCHEDULED, loggedById: minister.id },
      // In 2 days — hospital, added ad hoc
      { personId: ruth.id, scheduledFor: dayAt(2, 15), status: VisitStatus.SCHEDULED, loggedById: support.id },
      // In 3 days
      { personId: marcus.id, scheduledFor: dayAt(3, 11), status: VisitStatus.SCHEDULED, loggedById: minister.id },
      { personId: eleanor.id, scheduledFor: dayAt(3, 14), status: VisitStatus.SCHEDULED, loggedById: minister.id },
      // Past visit with notes, to populate history
      {
        personId: eleanor.id,
        scheduledFor: dayAt(-7, 10),
        status: VisitStatus.COMPLETED,
        contactMethod: ContactMethod.IN_PERSON,
        notes: "Good visit. Discussed her son's upcoming move — she's anxious about being more alone. Prayed together. Follow up in 1 week.",
        loggedById: minister.id,
      },
      {
        personId: dorothy.id,
        scheduledFor: dayAt(-3, 10),
        status: VisitStatus.COMPLETED,
        contactMethod: ContactMethod.PHONE,
        notes: "Checked in by phone. Still grieving; declined a visit this week, open to one next week.",
        loggedById: minister.id,
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
