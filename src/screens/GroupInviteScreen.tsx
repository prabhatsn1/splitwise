import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  Alert,
  StyleSheet,
  ScrollView,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { RootStackParamList } from "../types";

type GroupInviteRouteProp = RouteProp<RootStackParamList, "GroupInvite">;

export default function GroupInviteScreen() {
  const route = useRoute<GroupInviteRouteProp>();
  const { state } = useApp();
  const { colors } = useTheme();
  const { groupId } = route.params;

  const group = state.groups.find((g) => g.id === groupId);
  const [copied, setCopied] = useState(false);

  // Build deep-link URL:  splitwise://group/<groupId>
  const inviteLink = `splitwise://group/${groupId}`;

  const shareMessage = `${state.currentUser?.name ?? "Someone"} invited you to join the group "${group?.name ?? "a group"}" on Splitwise!\n\nOpen the link to join:\n${inviteLink}`;

  const handleCopy = () => {
    Clipboard.setString(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: shareMessage, url: inviteLink });
    } catch {
      Alert.alert("Error", "Unable to open share sheet.");
    }
  };

  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Group not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
        <View
          style={[styles.groupIcon, { backgroundColor: colors.primaryLight }]}
        >
          <Ionicons name="people" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.groupName, { color: colors.textPrimary }]}>
          {group.name}
        </Text>
        <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* QR Code */}
      <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Scan to Join
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Share this QR code with anyone you want to invite
        </Text>
        <View style={styles.qrWrapper}>
          <QRCode
            value={inviteLink}
            size={200}
            color={colors.textPrimary}
            backgroundColor={colors.card}
          />
        </View>
      </View>

      {/* Link section */}
      <View style={[styles.linkCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Invite Link
        </Text>
        <View
          style={[
            styles.linkBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.linkText, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {inviteLink}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: copied ? "#22C55E" : colors.primaryLight },
            ]}
            onPress={handleCopy}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={18}
              color={copied ? "#fff" : colors.primary}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: copied ? "#fff" : colors.primary },
              ]}
            >
              {copied ? "Copied!" : "Copy Link"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Members list */}
      <View style={[styles.membersCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Current Members
        </Text>
        {group.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View
              style={[
                styles.memberAvatar,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text style={[styles.memberInitial, { color: colors.primary }]}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.memberName, { color: colors.textPrimary }]}>
              {member.name}
              {member.id === state.currentUser?.id ? "  (You)" : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Info note */}
      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.primaryLight, borderColor: colors.primary },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.primary}
        />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Anyone with this link can join your group directly. The link is tied
          to this specific group only.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, marginTop: 12 },

  headerCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  groupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  groupName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  memberCount: { fontSize: 13 },

  qrCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  sectionSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  linkCard: {
    padding: 16,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  linkBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  linkText: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: { fontSize: 14, fontWeight: "600" },

  membersCard: {
    padding: 16,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  memberInitial: { fontSize: 15, fontWeight: "700" },
  memberName: { fontSize: 14, fontWeight: "500" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
