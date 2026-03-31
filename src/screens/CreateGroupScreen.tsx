import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, Group, User } from "../types";
import { styles } from "../styles/screens/CreateGroupScreen.styles";

type CreateGroupNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CreateGroup"
>;

export default function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupNavigationProp>();
  const { state, createGroup } = useApp();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([
    state.currentUser?.id || "",
  ]);
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const availableMembers = [state.currentUser!, ...state.friends];

  const filteredMembers = availableMembers.filter((member) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  const handleMemberToggle = (userId: string) => {
    if (userId === state.currentUser?.id) {
      // Can't remove current user
      return;
    }

    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    if (selectedMembers.length < 2) {
      Alert.alert("Error", "A group must have at least 2 members");
      return;
    }

    const groupMembers = availableMembers.filter((member) =>
      selectedMembers.includes(member.id),
    );

    const newGroupData: Omit<Group, "id"> = {
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
      members: groupMembers,
      createdAt: new Date(),
      simplifyDebts,
    };

    try {
      await createGroup(newGroupData);
      Alert.alert("Success", "Group created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to create group. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Group Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            placeholderTextColor="#999"
          />
        </View>

        {/* Group Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={groupDescription}
            onChangeText={setGroupDescription}
            placeholder="What's this group for?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Group Members */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Members</Text>
          <Text style={styles.helperText}>
            Select friends to add to this group
          </Text>

          {/* Search Bar */}
          {availableMembers.length > 3 && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search members..."
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.membersList}>
            {filteredMembers.map((member) => {
              const isCurrentUser = member.id === state.currentUser?.id;
              const isSelected = selectedMembers.includes(member.id);

              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberOption,
                    isSelected && styles.selectedMemberOption,
                    isCurrentUser && styles.currentUserOption,
                  ]}
                  onPress={() => handleMemberToggle(member.id)}
                  disabled={isCurrentUser}
                >
                  <View style={styles.memberInfo}>
                    <View
                      style={[
                        styles.avatar,
                        isCurrentUser && styles.currentUserAvatar,
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>
                        {member.name} {isCurrentUser && "(You)"}
                      </Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                  </View>

                  {isCurrentUser ? (
                    <Ionicons name="person" size={20} color="#5bc5a7" />
                  ) : isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#5bc5a7"
                    />
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#ccc"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {state.friends.length === 0 && (
            <View style={styles.noFriendsMessage}>
              <Ionicons name="person-add-outline" size={32} color="#ccc" />
              <Text style={styles.noFriendsText}>No friends added yet</Text>
              <Text style={styles.noFriendsSubtext}>
                Add friends first to create groups with them
              </Text>
            </View>
          )}
        </View>

        {/* Group Settings */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Settings</Text>

          <TouchableOpacity
            style={styles.settingOption}
            onPress={() => setSimplifyDebts(!simplifyDebts)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Simplify debts</Text>
              <Text style={styles.settingDescription}>
                Reduce the number of transactions between group members
              </Text>
            </View>
            <View style={[styles.toggle, simplifyDebts && styles.toggleActive]}>
              {simplifyDebts && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Selected Members Preview */}
        {selectedMembers.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.label}>Group Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewGroupName}>
                {groupName || "New Group"}
              </Text>
              <Text style={styles.previewMembers}>
                {selectedMembers.length} member
                {selectedMembers.length !== 1 ? "s" : ""}:
              </Text>
              <Text style={styles.previewMembersList}>
                {selectedMembers
                  .map((id) => availableMembers.find((m) => m.id === id)?.name)
                  .join(", ")}
              </Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.createButton,
          (!groupName.trim() || selectedMembers.length < 2) &&
            styles.createButtonDisabled,
        ]}
        onPress={handleCreateGroup}
        disabled={!groupName.trim() || selectedMembers.length < 2}
      >
        <Text style={styles.createButtonText}>Create Group</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
