import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../types";
import { ShareChannel } from "../services/invitationService";

type NavProp = StackNavigationProp<RootStackParamList>;

interface ChannelOption {
  key: ShareChannel;
  label: string;
  icon: string;
  color: string;
}

const CHANNELS: ChannelOption[] = [
  { key: "sms", label: "SMS", icon: "chatbubble-ellipses", color: "#5bc5a7" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "logo-whatsapp",
    color: "#25D366",
  },
  { key: "telegram", label: "Telegram", icon: "paper-plane", color: "#0088cc" },
  {
    key: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    color: "#E1306C",
  },
  {
    key: "snapchat",
    label: "Snapchat",
    icon: "logo-snapchat",
    color: "#FFFC00",
  },
  { key: "share_sheet", label: "More...", icon: "share-social", color: "#888" },
];

export default function InviteFriendScreen() {
  const { sendInvitation } = useApp();
  const navigation = useNavigation<NavProp>();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ShareChannel>("sms");

  const validatePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleSend = async (channel?: ShareChannel) => {
    const chosenChannel = channel ?? selectedChannel;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert("Name Required", "Please enter your friend's name.");
      return;
    }

    // Phone is required for SMS & WhatsApp; optional for others
    const phoneRequired =
      chosenChannel === "sms" || chosenChannel === "whatsapp";
    if (phoneRequired && !trimmedPhone) {
      Alert.alert(
        "Phone Required",
        `Please enter a mobile number for ${chosenChannel === "sms" ? "SMS" : "WhatsApp"}.`,
      );
      return;
    }
    if (trimmedPhone && !validatePhone(trimmedPhone)) {
      Alert.alert(
        "Invalid Number",
        "Please enter a valid mobile number (10–15 digits).",
      );
      return;
    }

    setSending(true);
    try {
      await sendInvitation(
        trimmedPhone || "unknown",
        trimmedName,
        message.trim() || undefined,
        chosenChannel,
      );
      const channelLabel =
        CHANNELS.find((c) => c.key === chosenChannel)?.label ?? chosenChannel;
      Alert.alert(
        "Invite Sent!",
        `Invitation prepared via ${channelLabel} for ${trimmedName}. Complete the send in the app that opened.`,
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert("Failed", error.message || "Could not send invitation.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header illustration */}
        <View style={s.hero}>
          <View style={s.iconCircle}>
            <Ionicons name="paper-plane" size={36} color="#fff" />
          </View>
          <Text style={s.heroTitle}>Invite a Friend</Text>
          <Text style={s.heroSubtitle}>
            Send an invite via SMS, WhatsApp, or any social media app so your
            friend can join and connect with you.
          </Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.label}>Friend's Name *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#999"
            autoCapitalize="words"
          />

          <Text style={s.label}>
            Mobile Number
            {selectedChannel === "sms" || selectedChannel === "whatsapp"
              ? " *"
              : " (optional)"}
          </Text>
          <View style={s.phoneRow}>
            <TextInput
              style={[s.input, s.phoneInput]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={16}
            />
            <Ionicons
              name="call-outline"
              size={20}
              color="#999"
              style={s.phoneIcon}
            />
          </View>

          <Text style={s.label}>Personal Message (optional)</Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={message}
            onChangeText={setMessage}
            placeholder="Hey! Let's split expenses together..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Channel picker */}
        <Text style={s.sectionLabel}>Share via</Text>
        <View style={s.channelGrid}>
          {CHANNELS.map((ch) => {
            const isSelected = selectedChannel === ch.key;
            return (
              <TouchableOpacity
                key={ch.key}
                style={[
                  s.channelBtn,
                  isSelected && { borderColor: ch.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedChannel(ch.key)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    s.channelIcon,
                    { backgroundColor: ch.color },
                    ch.key === "snapchat" && { backgroundColor: "#FFFC00" },
                  ]}
                >
                  <Ionicons
                    name={ch.icon as any}
                    size={22}
                    color={ch.key === "snapchat" ? "#000" : "#fff"}
                  />
                </View>
                <Text
                  style={[
                    s.channelLabel,
                    isSelected && { fontWeight: "700", color: "#333" },
                  ]}
                >
                  {ch.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            s.sendBtn,
            {
              backgroundColor:
                CHANNELS.find((c) => c.key === selectedChannel)?.color ??
                "#5bc5a7",
            },
            sending && s.sendBtnDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={
                  (CHANNELS.find((c) => c.key === selectedChannel)?.icon ??
                    "send") as any
                }
                size={20}
                color={selectedChannel === "snapchat" ? "#000" : "#fff"}
              />
              <Text
                style={[
                  s.sendBtnText,
                  selectedChannel === "snapchat" && { color: "#000" },
                ]}
              >
                Send via{" "}
                {CHANNELS.find((c) => c.key === selectedChannel)?.label}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.footerNote}>
          This will open the selected app with a pre-filled invite message.
          {selectedChannel === "sms" && " Standard SMS rates may apply."}
          {selectedChannel === "instagram" &&
            "\nInstagram will open your DM inbox — paste the invite message to your friend."}
          {selectedChannel === "snapchat" &&
            "\nSnapchat will open — send a chat to your friend with the invite."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 20, paddingBottom: 40 },

  hero: { alignItems: "center", marginBottom: 24 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#5bc5a7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
  },
  phoneRow: { position: "relative" },
  phoneInput: { paddingRight: 40 },
  phoneIcon: { position: "absolute", right: 12, top: 14 },
  multiline: { height: 80, paddingTop: 12 },

  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5bc5a7",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: "#5bc5a7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  channelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  channelBtn: {
    alignItems: "center",
    width: 90,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  channelLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  footerNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
});
