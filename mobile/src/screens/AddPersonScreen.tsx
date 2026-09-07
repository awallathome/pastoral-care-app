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
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.post("/people", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notesFlag: notesFlag.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save — check your connection.");
    } finally {
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
      <PrimaryButton
        title="Save parishioner"
        onPress={save}
        loading={saving}
        disabled={!firstName.trim() || !lastName.trim()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
