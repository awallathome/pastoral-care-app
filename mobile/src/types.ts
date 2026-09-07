export type Role = "ADMIN" | "MINISTER" | "SUPPORT_STAFF";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type VisitStatus = "SCHEDULED" | "COMPLETED" | "CANCELED" | "RESCHEDULED";
export type ContactMethod = "IN_PERSON" | "PHONE" | "EMAIL" | "TEXT" | "OTHER";

export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  notesFlag: string | null;
  active: boolean;
  assignedMinisterId: string | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
}

export interface Visit {
  id: string;
  personId: string;
  scheduledFor: string; // ISO date string
  status: VisitStatus;
  contactMethod: ContactMethod | null;
  notes: string | null;
  notesRestricted: boolean;
  alternateContactId: string | null;
  alternateContact?: EmergencyContact | null;
  person?: { id: string; firstName: string; lastName: string; phone: string | null; address: string | null };
}

export interface PersonDetail extends PersonSummary {
  email: string | null;
  familyMembers: FamilyMember[];
  emergencyContacts: EmergencyContact[];
  visits: Visit[];
  assignedMinister: { id: string; name: string } | null;
}

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  IN_PERSON: "In person",
  PHONE: "Phone",
  EMAIL: "Email",
  TEXT: "Text",
  OTHER: "Other",
};
