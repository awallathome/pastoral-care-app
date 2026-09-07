import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, radii, spacing, typography } from "../theme/theme";
import { formatDateTime } from "../lib/dates";

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

/**
 * A date + time picker that works the same way on iOS and Android: tap once
 * to pick the date, then the time, using each platform's native picker
 * dialog. (Android doesn't support a combined date+time mode, so we always
 * do it in two steps for consistency.)
 */
export function DateTimeField({ label, value, onChange }: Props) {
  const [step, setStep] = useState<"none" | "date" | "time">("none");

  const handleDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === "android") setStep("none");
    if (event.type === "dismissed" || !selected) {
      if (Platform.OS === "android") setStep("none");
      return;
    }
    const next = new Date(value);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    onChange(next);
    if (Platform.OS === "android") setStep("time");
  };

  const handleTimeChange = (event: any, selected?: Date) => {
    if (Platform.OS === "android") setStep("none");
    if (event.type === "dismissed" || !selected) return;
    const next = new Date(value);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setStep("date")}>
        <Text style={styles.buttonText}>{formatDateTime(value.toISOString())}</Text>
      </Pressable>

      {step === "date" && (
        <DateTimePicker value={value} mode="date" display="default" onChange={handleDateChange} />
      )}
      {step === "time" && (
        <DateTimePicker value={value} mode="time" display="default" onChange={handleTimeChange} />
      )}
      {/* iOS shows both pickers as inline modals from a single tap sequence;
          tapping again lets you adjust the time. */}
      {Platform.OS === "ios" && step === "date" && (
        <Pressable style={styles.iosNextTime} onPress={() => setStep("time")}>
          <Text style={styles.iosNextTimeText}>Set time →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs, fontWeight: "600" },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: { fontSize: 16, color: colors.textPrimary },
  iosNextTime: { alignSelf: "flex-end", marginTop: spacing.xs },
  iosNextTimeText: { color: colors.accent, fontWeight: "600" },
});
