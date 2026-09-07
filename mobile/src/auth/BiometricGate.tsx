import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const isAuthenticating = useRef(false);
  // Timestamp of the last successful unlock. Face ID's own system prompt
  // keeps the app in "inactive" for its *entire* duration — often 2+
  // seconds, not a quick blip — and the AppState "active" event it fires on
  // dismiss lands AFTER our authenticateAsync promise has already resolved
  // (confirmed by logging: the "active" event consistently arrives ~2s
  // after a successful result). So there's no "mid-authentication" flag
  // left to check by the time that event shows up. Instead: ignore any
  // "returned to active" event that lands shortly after a successful
  // unlock — that's Face ID's own prompt closing, not a real
  // background/foreground cycle. This is what fixed the endless-unlock
  // loop (the previous two attempts guessed wrong about the timing).
  const lastUnlockedAt = useRef<number>(0);

  const attemptUnlock = useCallback(async () => {
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;
    setChecking(true);
    setError(null);
    try {
      // The web build (Vercel) has no Face ID/fingerprint/passcode concept
      // to hook into, and there's no "someone else picks up the phone"
      // background/foreground cycle to re-lock on either — so there's
      // nothing this gate can meaningfully protect there. Skip it outright
      // rather than showing a "this device has no screen lock" warning on
      // every page load.
      if (Platform.OS === "web") {
        setUnlocked(true);
        return;
      }

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
        lastUnlockedAt.current = Date.now();
        setUnlocked(true);
      } else {
        setError("Unlock canceled or failed. Try again.");
      }
    } finally {
      setChecking(false);
      isAuthenticating.current = false;
    }
  }, []);

  useEffect(() => {
    attemptUnlock();
  }, [attemptUnlock]);

  // Re-lock whenever the app comes back from the background — e.g. someone
  // else picks up the phone after it was left open. Skips the bounce caused
  // by Face ID's own prompt dismissing (see lastUnlockedAt above).
  useEffect(() => {
    const UNLOCK_GRACE_MS = 3000;

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const wasAway = appState.current === "inactive" || appState.current === "background";
      const nowActive = next === "active";

      if (wasAway && nowActive) {
        const sinceUnlock = Date.now() - lastUnlockedAt.current;
        if (sinceUnlock > UNLOCK_GRACE_MS && !isAuthenticating.current) {
          setUnlocked(false);
          attemptUnlock();
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [attemptUnlock]);

  if (unlocked) return <>{children}</>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={typography.title}>Pastoral Care</Text>
      <Text style={[typography.body, styles.subtitle]}>
        {checking ? "Verifying it's you..." : "This app is locked to protect parishioner information."}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!checking && (
        <PrimaryButton title="Unlock" onPress={attemptUnlock} style={{ marginTop: spacing.lg }} />
      )}
    </SafeAreaView>
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
