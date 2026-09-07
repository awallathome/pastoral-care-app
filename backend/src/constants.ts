// SQLite (used here for local prototyping) has no native enum type, so
// `role`, `status`, and `contactMethod` are plain strings in the database.
// These are the single source of truth for what values are valid — used
// for both the TypeScript types and runtime validation (zod, in the
// routes) so the database and the API never disagree about what's allowed.
//
// Moving to Postgres later? You can restore real Prisma `enum` blocks in
// schema.prisma at that point if you want DB-level enforcement too — these
// values would stay the same.

export const Role = {
  ADMIN: "ADMIN",
  MINISTER: "MINISTER",
  SUPPORT_STAFF: "SUPPORT_STAFF",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const VisitStatus = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
  RESCHEDULED: "RESCHEDULED",
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const ContactMethod = {
  IN_PERSON: "IN_PERSON",
  PHONE: "PHONE",
  EMAIL: "EMAIL",
  TEXT: "TEXT",
  OTHER: "OTHER",
} as const;
export type ContactMethod = (typeof ContactMethod)[keyof typeof ContactMethod];
