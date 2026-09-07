import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/theme";
import { VisitRow } from "./VisitRow";
import { Visit } from "../types";
import { formatDayHeading } from "../lib/dates";

interface Props {
  date: Date;
  visits: Visit[];
  expanded: boolean;
  onToggle: () => void;
  onSelectVisit: (visit: Visit) => void;
}

export function DayAccordion({ date, visits, expanded, onToggle, onSelectVisit }: Props) {
  const activeCount = visits.filter((v) => v.status === "SCHEDULED" || v.status === "RESCHEDULED").length;

  return (
    <View style={styles.container}>
      <Pressable onPress={onToggle} style={styles.header}>
        <Text style={typography.bodyStrong}>{formatDayHeading(date)}</Text>
        <View style={styles.countWrap}>
          <Text style={styles.countText}>
            {activeCount} {activeCount === 1 ? "visit" : "visits"}
          </Text>
          <Text style={styles.chevron}>{expanded ? "⌃" : "⌄"}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {visits.length === 0 ? (
            <Text style={[typography.caption, styles.empty]}>Nothing scheduled.</Text>
          ) : (
            visits.map((v) => <VisitRow key={v.id} visit={v} onPress={() => onSelectVisit(v)} />)
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  countWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  countText: { fontSize: 14, color: colors.textSecondary },
  chevron: { fontSize: 18, color: colors.textMuted },
  body: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  empty: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
});
