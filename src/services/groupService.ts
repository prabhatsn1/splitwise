import DatabaseService from "./database";
import { Group, User } from "../types";
import { ObjectId } from "mongodb";

export class GroupService {
  private db = DatabaseService.getInstance();

  async createGroup(
    groupData: Omit<Group, "id">,
    userId: string
  ): Promise<Group> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    const result = await collection.insertOne({
      ...groupData,
      _id: new ObjectId(),
      createdBy: userId,
      createdAt: new Date(),
    } as any);

    const group = await collection.findOne({ _id: result.insertedId });
    return this.transformGroup(group);
  }

  async getGroupById(id: string): Promise<Group | null> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    const group = await collection.findOne({ _id: new ObjectId(id) });
    return group ? this.transformGroup(group) : null;
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    const groups = await collection
      .find({
        $or: [{ createdBy: userId }, { "members.id": userId }],
      })
      .toArray();

    return groups.map((group) => this.transformGroup(group));
  }

  async updateGroup(
    id: string,
    groupData: Partial<Group>
  ): Promise<Group | null> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: groupData });

    const group = await collection.findOne({ _id: new ObjectId(id) });
    return group ? this.transformGroup(group) : null;
  }

  async addMemberToGroup(groupId: string, member: User): Promise<Group | null> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    await collection.updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members: member } }
    );

    const group = await collection.findOne({ _id: new ObjectId(groupId) });
    return group ? this.transformGroup(group) : null;
  }

  async removeMemberFromGroup(
    groupId: string,
    memberId: string
  ): Promise<Group | null> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    await collection.updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { members: { id: memberId } } }
    );

    const group = await collection.findOne({ _id: new ObjectId(groupId) });
    return group ? this.transformGroup(group) : null;
  }

  async deleteGroup(id: string): Promise<boolean> {
    await this.db.connect();
    const collection = this.db.getGroupsCollection();

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  private transformGroup(group: any): Group {
    return {
      id: group._id.toString(),
      name: group.name,
      description: group.description,
      members: group.members || [],
      createdAt: group.createdAt,
      simplifyDebts: group.simplifyDebts ?? true,
    };
  }
}
