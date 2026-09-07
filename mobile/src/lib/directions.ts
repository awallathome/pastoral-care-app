import { Linking, Platform } from "react-native";

/**
 * "Map view of parishioners for routing" — implemented as directions links
 * rather than an embedded map. An embedded map (react-native-maps or
 * expo-maps) needs a native module + API keys and, on this SDK, a custom
 * dev-client build instead of the Expo Go workflow this project already
 * uses — a much bigger lift than "see how to get there." This gets the
 * routing value (turn-by-turn, multi-stop) using the Maps app everyone
 * already has, on every platform including the web build.
 */

// Single destination — uses each platform's own Maps app for the most
// native feel when there's only one stop.
export function openDirections(address: string): void {
  const encoded = encodeURIComponent(address);
  const url =
    Platform.OS === "ios"
      ? `https://maps.apple.com/?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url).catch(() => {});
}

// Multi-stop route (today's whole schedule). Apple Maps' URL scheme has no
// public multi-waypoint option, so this always uses Google Maps' directions
// URL — it opens fine in a browser on any platform even without the Google
// Maps app installed. Stops are visited in the order given; the last
// address is the final destination, everything before it is a waypoint.
export function openRoute(addresses: string[]): void {
  const stops = addresses.filter((a) => a.trim().length > 0);
  if (stops.length === 0) return;

  const destination = encodeURIComponent(stops[stops.length - 1]);
  const waypoints = stops.slice(0, -1).map(encodeURIComponent).join("|");

  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${
    waypoints ? `&waypoints=${waypoints}` : ""
  }`;
  Linking.openURL(url).catch(() => {});
}
