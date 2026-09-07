import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * expo-secure-store has no real implementation on web (it throws "not
 * available on web" if you call it there). The Vercel deployment runs the
 * app in a browser, so anything that touches storage — the auth token, the
 * cached user — goes through this wrapper instead of expo-secure-store
 * directly. Native platforms are unaffected: this just forwards to
 * SecureStore, keeping the same Keychain/Keystore-backed encryption.
 *
 * Web falls back to localStorage. That's not secure storage — it's plain
 * browser storage, readable by anything with access to the device/browser —
 * which is an acceptable tradeoff for a shareable *testing* deployment, but
 * worth revisiting (e.g. short-lived tokens, no persisted notes) before any
 * real parishioner data goes through the web build.
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore — e.g. private browsing with storage blocked.
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
