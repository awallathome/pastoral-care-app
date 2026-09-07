import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { colors, spacing, typography } from "../theme/theme";
import { PrimaryButton } from "../components/PrimaryButton";

/**
 * Wraps the whole authenticated app. Requires Face ID / fingerprint / the
 * device passcode before showing any parishioner data, and re-locks
 * whenever the app goes to the background — this is the "unauthorized
 * people can't see personal notes" protection Adam asked for, without
 * building a separate PIN system: it rides on whatever lock the minister
 * already put on their phone.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const attemptUnlock = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // No Face ID / fingerprint / passcode set up on this device at all.
        // Rather than silently skip the lock, tell the minister why —
        // and still let them in, since we can't enforce a lock that
        // doesn't exist on the device.
        setError("This device has no screen lock set up — parishioner notes aren't protected. Set a passcode or biometric lock in your phone's settings.");
        setUnlocked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Pastoral Care",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setUnlocked(true);
      } else {
        setError("Unlock canceled or failed. Try again.");
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    attemptUnlock();
  }, [attemptUnlock]);

  // Re-lock whenever the app comes back from the background — e.g. someone
  // else picks up the phone after it was left open.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        setUnlocked(false);
        attemptUnlock();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [attemptUnlock]);

  if (unlocked) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={typography.title}>Pastoral Care</Text>
      <Text style={[typography.body, styles.subtitle]}>
        {checking ? "Verifying it's you..." : "This app is locked to protect parishioner information."}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!checking && (
        <PrimaryButton title="Unlock" onPress={attemptUnlock} style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textSecondary,
  },
  error: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.danger,
  },
});
