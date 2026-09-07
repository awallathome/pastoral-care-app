import { describe, expect, it, vi } from "vitest";

// rbac.ts pulls in the shared Prisma client (src/db.ts) for logAudit, which
// none of these tests exercise. Mock it out so this suite is a true unit
// test of the access-control logic — it shouldn't need a real database or
// even a generated Prisma client to run.
vi.mock("../db", () => ({ prisma: {} }));

import { canAccessNotes, redactVisit, requireRole } from "./rbac";
import { Role } from "../constants";

// This is the file the roadmap flagged as "must never regress" — it's the
// one place deciding who can see a parishioner's visit notes. These tests
// exist so a future change to canAccessNotes/redactVisit/requireRole can't
// silently leak notes to a role that shouldn't see them (or the reverse:
// silently lock a minister out of their own notes).

describe("canAccessNotes", () => {
  it("allows ADMIN and MINISTER", () => {
    expect(canAccessNotes(Role.ADMIN)).toBe(true);
    expect(canAccessNotes(Role.MINISTER)).toBe(true);
  });

  it("denies SUPPORT_STAFF", () => {
    expect(canAccessNotes(Role.SUPPORT_STAFF)).toBe(false);
  });
});

describe("redactVisit", () => {
  const visitWithNotes = {
    id: "v1",
    notes: "Discussed grief and hospitalization — sensitive content.",
  };

  it("leaves notes intact for roles allowed to see them", () => {
    const result = redactVisit(visitWithNotes, Role.MINISTER);
    expect(result.notes).toBe(visitWithNotes.notes);
    expect(result.notesRestricted).toBe(false);
  });

  it("leaves notes intact for ADMIN", () => {
    const result = redactVisit(visitWithNotes, Role.ADMIN);
    expect(result.notes).toBe(visitWithNotes.notes);
    expect(result.notesRestricted).toBe(false);
  });

  it("strips notes for SUPPORT_STAFF and flags them as restricted", () => {
    const result = redactVisit(visitWithNotes, Role.SUPPORT_STAFF);
    expect(result.notes).toBeNull();
    expect(result.notesRestricted).toBe(true);
  });

  it("never leaks note content in the redacted object, even inspected as JSON", () => {
    // A modified client or a network inspector only ever sees this object —
    // guard against a future refactor that keeps the raw notes around under
    // a different key.
    const result = redactVisit(visitWithNotes, Role.SUPPORT_STAFF);
    expect(JSON.stringify(result)).not.toContain("hospitalization");
  });

  it("preserves other visit fields untouched regardless of role", () => {
    const visit = { id: "v2", notes: "secret", status: "SCHEDULED" };
    const result = redactVisit(visit, Role.SUPPORT_STAFF);
    expect(result.id).toBe("v2");
    expect(result.status).toBe("SCHEDULED");
  });
});

describe("requireRole", () => {
  function mockRes() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it("calls next() when the user has an allowed role", () => {
    const req: any = { user: { role: Role.ADMIN } };
    const res = mockRes();
    const next = vi.fn();

    requireRole(Role.ADMIN, Role.MINISTER)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("403s when the user's role isn't in the allowed list", () => {
    const req: any = { user: { role: Role.SUPPORT_STAFF } };
    const res = mockRes();
    const next = vi.fn();

    requireRole(Role.ADMIN, Role.MINISTER)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("403s when there's no authenticated user at all", () => {
    const req: any = {};
    const res = mockRes();
    const next = vi.fn();

    requireRole(Role.ADMIN)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
