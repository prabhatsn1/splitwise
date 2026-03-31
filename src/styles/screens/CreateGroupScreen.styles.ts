import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  membersList: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  memberOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedMemberOption: {
    backgroundColor: "#f0faf9",
  },
  currentUserOption: {
    backgroundColor: "#f8f9fa",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5bc5a7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  currentUserAvatar: {
    backgroundColor: "#2196F3",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: "#666",
  },
  noFriendsMessage: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  noFriendsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  noFriendsSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  settingOption: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "#5bc5a7",
  },
  previewSection: {
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#5bc5a7",
  },
  previewGroupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  previewMembers: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  previewMembersList: {
    fontSize: 14,
    color: "#5bc5a7",
  },
  createButton: {
    backgroundColor: "#5bc5a7",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
