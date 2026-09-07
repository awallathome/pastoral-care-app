import { NextFunction, Request, Response } from "express";
import { Role, Visit } from "@prisma/client";
import { prisma } from "../db";

/**
 * Roles allowed to read/write the free-text `notes` field on a visit.
 * SUPPORT_STAFF can still see everything else about a person and a visit
 * (who, when, status, contact method) — just not the note content. This is
 * the "someone can see name/phone/family but not notes" permission Adam
 * asked for.
 */
const NOTE_ACCESS_ROLES: Role[] = [Role.ADMIN, Role.MINISTER];

export function canAccessNotes(role: Role): boolean {
  return NOTE_ACCESS_ROLES.includes(role);
}

/** Route guard: 403s unless the caller has one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    next();
  };
}

/**
 * Strips `notes` from a visit before it goes over the wire to a role that
 * isn't allowed to see it, and marks `notesRestricted` so the app can show
 * "Notes hidden — ask a minister" instead of a blank field.
 */
export function redactVisit<T extends Pick<Visit, "notes">>(
  visit: T,
  role: Role
): T & { notesRestricted: boolean } {
  if (canAccessNotes(role)) {
    return { ...visit, notesRestricted: false };
  }
  return { ...visit, notes: null, notesRestricted: true };
}

/**
 * Every read or write of a visit's notes gets an audit row — this is what
 * lets an admin answer "who looked at this person's notes, and when."
 */
export async function logAudit(params: {
  userId: string;
  action: string;
  personId?: string;
  visitId?: string;
}) {
  await prisma.auditLog.create({ data: params });
}
