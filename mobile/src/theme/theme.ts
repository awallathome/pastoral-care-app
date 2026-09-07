// One place for every color, spacing, and font size in the app. Keeping the
// palette this small is deliberate — the whole point of this app is to be
// the opposite of the cluttered pastoral-care apps Adam was reacting to.

export const colors = {
  background: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E5E3DE",
  textPrimary: "#1F2933",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  accent: "#2F6F5E", // calm, churchy green — used sparingly for actions/emphasis
  accentSoft: "#E7F0EC",
  danger: "#B3261E",
  dangerSoft: "#FBEAE9",
  warning: "#8A5A00",
  warningSoft: "#FCF0DA",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const typography = {
  title: { fontSize: 24, fontWeight: "700" as const, color: colors.textPrimary },
  sectionTitle: { fontSize: 15, fontWeight: "600" as const, color: colors.textSecondary },
  body: { fontSize: 16, fontWeight: "400" as const, color: colors.textPrimary },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: "400" as const, color: colors.textSecondary },
};
