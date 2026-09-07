import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// Show a banner/sound even while the app is open — otherwise a reminder
// that arrives while someone's mid-visit would silently vanish.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission and returns an Expo push token, or null
 * if that's not possible here — no push service on web, no hardware on a
 * simulator, or the user said no. Callers should treat null as "just skip
 * registering," not an error to surface.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null; // no push service in a browser build
  if (!Device.isDevice) return null; // simulators/emulators have no push token

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    status = request.status;
  }
  if (status !== "granted") return null;

  try {
    // projectId is only required once this app is built with EAS (a
    // standalone build); Expo Go resolves it without one. Constants.expoConfig
    // won't have it until an eas.json/EAS project is set up — see README.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token;
  } catch (err) {
    console.warn("Couldn't get a push token:", err);
    return null;
  }
}
