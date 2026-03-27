import Realm, { BSON } from "realm";
import { Group, User } from "../types";
import { GroupSchema } from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

export class GroupService {
  private localStorage = LocalStorageService.getInstance();

  // ── Realm helpers ─────────────────────────────────────────────────────

  private getRealm(): Realm {
    return DatabaseService.getInstance().getRealm();
  }

  private getOwnerId(): string {
    try {
      return DatabaseService.getInstance().getAppUser().id;
    } catch {
      return "local";
    }
  }

  private isRealmAvailable(): boolean {
    try {
      this.getRealm();
      return true;
    } catch {
      return false;
    }
  }

  private generateGroupId(): string {
    return new BSON.ObjectId().toHexString();
  }

  /** Convert a Realm GroupSchema object to a plain Group */
  private toGroup(rg: GroupSchema): Group {
    return {
      id: rg.groupId,
      name: rg.name,
      description: rg.description ?? undefined,
      members: Array.from(rg.members).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone ?? undefined,
        avatar: m.avatar ?? undefined,
      })),
      createdAt: rg.createdAt,
      simplifyDebts: rg.simplifyDebts,
    };
  }

  private sortByCreatedAtDesc(groups: Group[]): Group[] {
    return [...groups].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  async createGroup(
    groupData: Omit<Group, "id">,
    userId: string,
  ): Promise<Group> {
    const groupId = this.generateGroupId();
    const createdAt = groupData.createdAt
      ? new Date(groupData.createdAt)
      : new Date();
    const members = groupData.members || [];

    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const ownerId = this.getOwnerId();

      realm.write(() => {
        realm.create("Group", {
          _id: new BSON.ObjectId(),
          groupId,
          name: groupData.name,
          description: groupData.description,
          members: members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone,
            avatar: m.avatar,
          })),
          createdBy: userId,
          createdAt,
          updatedAt: new Date(),
          simplifyDebts: groupData.simplifyDebts ?? true,
          ownerId,
        });
      });
    }

    const group: Group = {
      ...groupData,
      id: groupId,
      createdAt,
      members,
      simplifyDebts: groupData.simplifyDebts ?? true,
    };

    const data = await this.localStorage.getLocalData();
    await this.localStorage.saveGroups([...data.groups, group]);
    return group;
  }

  async getGroupById(id: string): Promise<Group | null> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const found = realm
        .objects<GroupSchema>("Group")
        .filtered("groupId == $0", id)[0];
      return found ? this.toGroup(found) : null;
    }

    const data = await this.localStorage.getLocalData();
    return data.groups.find((g) => g.id === id) || null;
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm
        .objects<GroupSchema>("Group")
        .filtered("ANY members.id == $0", userId);
      return this.sortByCreatedAtDesc(
        Array.from(results).map((r) => this.toGroup(r)),
      );
    }

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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const rg = realm
        .objects<GroupSchema>("Group")
        .filtered("groupId == $0", id)[0];
      if (!rg) return null;

      realm.write(() => {
        if (groupData.name !== undefined) rg.name = groupData.name;
        if (groupData.description !== undefined)
          rg.description = groupData.description;
        if (groupData.simplifyDebts !== undefined)
          rg.simplifyDebts = groupData.simplifyDebts;
        if (groupData.members !== undefined) {
          rg.members.splice(0, rg.members.length);
          groupData.members.forEach((m) => {
            rg.members.push({
              id: m.id,
              name: m.name,
              email: m.email,
              phone: m.phone,
              avatar: m.avatar,
            } as any);
          });
        }
        rg.updatedAt = new Date();
      });

      const updated = this.toGroup(rg);
      // Mirror to local storage
      const data = await this.localStorage.getLocalData();
      const updatedGroups = data.groups.map((g) => (g.id === id ? updated : g));
      await this.localStorage.saveGroups(updatedGroups);
      return updated;
    }

    // Fallback: localStorage
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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const rg = realm
        .objects<GroupSchema>("Group")
        .filtered("groupId == $0", id)[0];
      if (rg) {
        realm.write(() => realm.delete(rg));
      }
    }

    const data = await this.localStorage.getLocalData();
    const updatedGroups = data.groups.filter((g) => g.id !== id);
    const deleted = updatedGroups.length !== data.groups.length;
    if (deleted) {
      await this.localStorage.saveGroups(updatedGroups);
    }
    return deleted;
  }
}
