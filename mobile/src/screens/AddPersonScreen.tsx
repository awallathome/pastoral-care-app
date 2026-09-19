import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/theme";
import { TextField } from "../components/TextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { api, ApiError } from "../api/client";

export function AddPersonScreen() {
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notesFlag, setNotesFlag] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.post("/people", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notesFlag: notesFlag.trim() || null,
      });
      setSaved(true);
      // Brief confirmation, then return so the roster refresh shows them.
      setTimeout(() => navigation.goBack(), 600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save — check your connection.");
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextField label="First name" value={firstName} onChangeText={setFirstName} />
      <TextField label="Last name" value={lastName} onChangeText={setLastName} />
      <TextField label="Address" value={address} onChangeText={setAddress} />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField
        label="Flag (optional — e.g. Homebound, Hospital)"
        value={notesFlag}
        onChangeText={setNotesFlag}
        placeholder="Shown on their card to every role"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {saved && <Text style={styles.saved}>Parishioner saved.</Text>}
      <PrimaryButton
        title={saved ? "Saved" : "Save parishioner"}
        onPress={save}
        loading={saving && !saved}
        disabled={!firstName.trim() || !lastName.trim() || saved}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  saved: { color: colors.accent, fontWeight: "600", marginBottom: spacing.md },
});
