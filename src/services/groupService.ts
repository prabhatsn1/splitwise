import { Group, User } from "../types";
import { GroupRow } from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

export class GroupService {
  private localStorage = LocalStorageService.getInstance();

  // ── Supabase helpers ──────────────────────────────────────────────────

  private getClient() {
    return DatabaseService.getInstance().getClient();
  }

  private getOwnerId(): string {
    try {
      return DatabaseService.getInstance().getUserId();
    } catch {
      return "local";
    }
  }

  private isSupabaseAvailable(): boolean {
    try {
      this.getClient();
      return DatabaseService.getInstance().hasAuthenticatedUser();
    } catch {
      return false;
    }
  }

  private generateGroupId(): string {
    return `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toGroup(row: GroupRow): Group {
    return {
      id: row.group_id,
      name: row.name,
      description: row.description ?? undefined,
      members: (row.members || []).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone ?? undefined,
        avatar: m.avatar ?? undefined,
      })),
      createdAt: new Date(row.created_at),
      simplifyDebts: row.simplify_debts,
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

    if (this.isSupabaseAvailable()) {
      const now = new Date().toISOString();
      await this.getClient()
        .from("groups")
        .insert({
          group_id: groupId,
          name: groupData.name,
          description: groupData.description || null,
          members: members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone,
            avatar: m.avatar,
          })),
          created_by: userId,
          created_at: createdAt.toISOString(),
          updated_at: now,
          simplify_debts: groupData.simplifyDebts ?? true,
          owner_id: this.getOwnerId(),
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
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("groups")
        .select("*")
        .eq("group_id", id)
        .single();
      return data ? this.toGroup(data as GroupRow) : null;
    }

    const localData = await this.localStorage.getLocalData();
    return localData.groups.find((g) => g.id === id) || null;
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    if (this.isSupabaseAvailable()) {
      // members is a jsonb array — filter in memory
      const { data } = await this.getClient()
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (!data) return [];

      return data
        .map((row: any) => this.toGroup(row as GroupRow))
        .filter((g) => g.members.some((m) => m.id === userId));
    }

    const localData = await this.localStorage.getLocalData();
    const groups = localData.groups.filter((group) =>
      (group.members || []).some((member) => member.id === userId),
    );
    return this.sortByCreatedAtDesc(groups);
  }

  async updateGroup(
    id: string,
    groupData: Partial<Group>,
  ): Promise<Group | null> {
    if (this.isSupabaseAvailable()) {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (groupData.name !== undefined) updates.name = groupData.name;
      if (groupData.description !== undefined)
        updates.description = groupData.description;
      if (groupData.simplifyDebts !== undefined)
        updates.simplify_debts = groupData.simplifyDebts;
      if (groupData.members !== undefined) {
        updates.members = groupData.members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          avatar: m.avatar,
        }));
      }

      const { data, error } = await this.getClient()
        .from("groups")
        .update(updates)
        .eq("group_id", id)
        .select("*")
        .single();

      if (error || !data) return null;

      const updated = this.toGroup(data as GroupRow);
      const localData = await this.localStorage.getLocalData();
      const updatedGroups = localData.groups.map((g) =>
        g.id === id ? updated : g,
      );
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
    if (this.isSupabaseAvailable()) {
      await this.getClient().from("groups").delete().eq("group_id", id);
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
