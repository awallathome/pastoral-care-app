import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme/theme";
import { VisitStatus } from "../types";

const STATUS_STYLE: Record<VisitStatus, { bg: string; fg: string; label: string }> = {
  SCHEDULED: { bg: colors.accentSoft, fg: colors.accent, label: "Scheduled" },
  COMPLETED: { bg: "#EEF2F1", fg: colors.textSecondary, label: "Completed" },
  CANCELED: { bg: colors.dangerSoft, fg: colors.danger, label: "Canceled" },
  RESCHEDULED: { bg: colors.warningSoft, fg: colors.warning, label: "Rescheduled" },
};

export function StatusBadge({ status }: { status: VisitStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "600" },
});
