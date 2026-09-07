import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/theme";

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

// react-native-community/datetimepicker has no web implementation — Metro
// picks this file automatically for web builds (the .web.tsx suffix wins
// over DateTimeField.tsx there). A plain HTML datetime-local input covers
// the same "pick a date and time" job using the browser's own picker.
export function DateTimeField({ label, value, onChange }: Props) {
  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) return;
    const next = new Date(raw);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="datetime-local"
        value={toLocalInputValue(value)}
        onChange={handleChange}
        style={webInputStyle}
      />
    </View>
  );
}

const webInputStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: colors.border,
  backgroundColor: colors.surface,
  borderRadius: radii.sm,
  padding: `${spacing.sm}px ${spacing.md}px`,
  fontSize: 16,
  color: colors.textPrimary,
  fontFamily: "inherit",
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs, fontWeight: "600" },
});
