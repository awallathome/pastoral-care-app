import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/theme";
import { ContactMethod, CONTACT_METHOD_LABELS } from "../types";

const METHODS: ContactMethod[] = ["IN_PERSON", "PHONE", "EMAIL", "TEXT", "OTHER"];

export function ContactMethodPicker({
  value,
  onChange,
}: {
  value: ContactMethod | null;
  onChange: (m: ContactMethod) => void;
}) {
  return (
    <View>
      <Text style={typography.sectionTitle}>How did you connect?</Text>
      <View style={styles.row}>
        {METHODS.map((m) => {
          const selected = value === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {CONTACT_METHOD_LABELS[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
});
