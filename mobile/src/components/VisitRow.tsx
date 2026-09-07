import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/theme";
import { StatusBadge } from "./Badge";
import { formatTime } from "../lib/dates";
import { Visit } from "../types";

interface Props {
  visit: Visit;
  onPress: () => void;
}

export function VisitRow({ visit, onPress }: Props) {
  const name = visit.person ? `${visit.person.firstName} ${visit.person.lastName}` : "Parishioner";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{formatTime(visit.scheduledFor)}</Text>
      </View>
      <View style={styles.mainCol}>
        <Text style={typography.bodyStrong}>{name}</Text>
        {visit.person?.address && (
          <Text style={typography.caption} numberOfLines={1}>
            {visit.person.address}
          </Text>
        )}
      </View>
      <StatusBadge status={visit.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  timeCol: { width: 72 },
  time: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  mainCol: { flex: 1, gap: 2 },
});
