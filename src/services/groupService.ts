import { Group, User } from "../types";
import LocalStorageService from "./localStorageService";

export class GroupService {
  private localStorage = LocalStorageService.getInstance();

  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private sortByCreatedAtDesc(groups: Group[]): Group[] {
    return [...groups].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async createGroup(
    groupData: Omit<Group, "id">,
    userId: string,
  ): Promise<Group> {
    const data = await this.localStorage.getLocalData();
    const group: Group = {
      ...groupData,
      id: this.generateGroupId(),
      createdAt: groupData.createdAt
        ? new Date(groupData.createdAt)
        : new Date(),
      members: groupData.members || [],
      simplifyDebts: groupData.simplifyDebts ?? true,
    };

    await this.localStorage.saveGroups([...data.groups, group]);
    return group;
  }

  async getGroupById(id: string): Promise<Group | null> {
    const data = await this.localStorage.getLocalData();
    return data.groups.find((group) => group.id === id) || null;
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    const data = await this.localStorage.getLocalData();
    const groups = data.groups.filter((group) =>
      (group.members || []).some((member) => member.id === userId),
    );
    return this.sortByCreatedAtDesc(groups);
  }

  async updateGroup(
    id: string,
    groupData: Partial<Group>,
  ): Promise<Group | null> {
    const data = await this.localStorage.getLocalData();
    let updatedGroup: Group | null = null;

    const updatedGroups = data.groups.map((group) => {
      if (group.id !== id) return group;
      updatedGroup = { ...group, ...groupData, id };
      return updatedGroup;
    });

    await this.localStorage.saveGroups(updatedGroups);
    return updatedGroup;
  }

  async addMemberToGroup(groupId: string, member: User): Promise<Group | null> {
    const group = await this.getGroupById(groupId);
    if (!group) return null;

    const alreadyMember = (group.members || []).some((m) => m.id === member.id);
    const members = alreadyMember
      ? group.members
      : [...(group.members || []), member];
    return this.updateGroup(groupId, { members });
  }

  async removeMemberFromGroup(
    groupId: string,
    memberId: string,
  ): Promise<Group | null> {
    const group = await this.getGroupById(groupId);
    if (!group) return null;

    const members = (group.members || []).filter(
      (member) => member.id !== memberId,
    );
    return this.updateGroup(groupId, { members });
  }

  async deleteGroup(id: string): Promise<boolean> {
    const data = await this.localStorage.getLocalData();
    const updatedGroups = data.groups.filter((group) => group.id !== id);
    const deleted = updatedGroups.length !== data.groups.length;
    if (deleted) {
      await this.localStorage.saveGroups(updatedGroups);
    }
    return deleted;
  }
}
