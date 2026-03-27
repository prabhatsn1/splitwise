import Realm, { BSON } from "realm";

// ── User Schema ─────────────────────────────────────────────────────────────

export class UserSchema extends Realm.Object<UserSchema> {
  _id!: BSON.ObjectId;
  userId!: string;
  name!: string;
  email!: string;
  phone?: string;
  avatar?: string;
  passwordHash?: string;
  createdAt!: Date;
  updatedAt!: Date;
  ownerId!: string; // Atlas App Services user id for permissions

  static schema: Realm.ObjectSchema = {
    name: "User",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      userId: { type: "string", indexed: true },
      name: "string",
      email: { type: "string", indexed: true },
      phone: "string?",
      avatar: "string?",
      passwordHash: "string?",
      createdAt: { type: "date", default: () => new Date() },
      updatedAt: { type: "date", default: () => new Date() },
      ownerId: "string",
    },
  };
}

// ── Friendship Schema ───────────────────────────────────────────────────────

export class FriendshipSchema extends Realm.Object<FriendshipSchema> {
  _id!: BSON.ObjectId;
  userId!: string;
  friendId!: string;
  friendName!: string;
  friendEmail!: string;
  friendPhone?: string;
  friendAvatar?: string;
  status!: string; // "active" | "blocked"
  createdAt!: Date;
  ownerId!: string;

  static schema: Realm.ObjectSchema = {
    name: "Friendship",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      userId: { type: "string", indexed: true },
      friendId: { type: "string", indexed: true },
      friendName: "string",
      friendEmail: "string",
      friendPhone: "string?",
      friendAvatar: "string?",
      status: { type: "string", default: "active" },
      createdAt: { type: "date", default: () => new Date() },
      ownerId: "string",
    },
  };
}

// ── Invitation Schema ───────────────────────────────────────────────────────

export class InvitationSchema extends Realm.Object<InvitationSchema> {
  _id!: BSON.ObjectId;
  fromUserId!: string;
  fromUserName!: string;
  toPhone!: string;
  toName!: string;
  status!: string; // "pending" | "accepted" | "declined" | "expired"
  createdAt!: Date;
  respondedAt?: Date;
  message?: string;
  ownerId!: string;

  static schema: Realm.ObjectSchema = {
    name: "Invitation",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      fromUserId: { type: "string", indexed: true },
      fromUserName: "string",
      toPhone: { type: "string", indexed: true },
      toName: "string",
      status: { type: "string", default: "pending", indexed: true },
      createdAt: { type: "date", default: () => new Date() },
      respondedAt: "date?",
      message: "string?",
      ownerId: "string",
    },
  };
}

// ── Split Schema (embedded) ─────────────────────────────────────────────────

export class SplitSchema extends Realm.Object<SplitSchema> {
  userId!: string;
  amount?: number;
  percentage?: number;
  shares?: number;

  static schema: Realm.ObjectSchema = {
    name: "Split",
    embedded: true,
    properties: {
      userId: "string",
      amount: "double?",
      percentage: "double?",
      shares: "double?",
    },
  };
}

// ── Participant Schema (embedded) ───────────────────────────────────────────

export class ParticipantSchema extends Realm.Object<ParticipantSchema> {
  id!: string;
  name!: string;
  email!: string;
  phone?: string;
  avatar?: string;

  static schema: Realm.ObjectSchema = {
    name: "Participant",
    embedded: true,
    properties: {
      id: "string",
      name: "string",
      email: "string",
      phone: "string?",
      avatar: "string?",
    },
  };
}

// ── Location Schema (embedded) ──────────────────────────────────────────────

export class LocationSchema extends Realm.Object<LocationSchema> {
  latitude!: number;
  longitude!: number;
  address!: string;

  static schema: Realm.ObjectSchema = {
    name: "Location",
    embedded: true,
    properties: {
      latitude: "double",
      longitude: "double",
      address: "string",
    },
  };
}

// ── RecurringConfig Schema (embedded) ───────────────────────────────────────

export class RecurringConfigSchema extends Realm.Object<RecurringConfigSchema> {
  frequency!: string; // "weekly" | "monthly" | "yearly"
  endDate?: Date;

  static schema: Realm.ObjectSchema = {
    name: "RecurringConfig",
    embedded: true,
    properties: {
      frequency: "string",
      endDate: "date?",
    },
  };
}

// ── Expense Schema ──────────────────────────────────────────────────────────

export class ExpenseSchema extends Realm.Object<ExpenseSchema> {
  _id!: BSON.ObjectId;
  expenseId!: string;
  description!: string;
  amount!: number;
  currency?: string;
  paidBy!: ParticipantSchema;
  splitBetween!: Realm.List<ParticipantSchema>;
  splitType!: string; // "equal" | "exact" | "percentage" | "shares"
  splits!: Realm.List<SplitSchema>;
  category!: string;
  date!: Date;
  groupId?: string;
  receipt?: string;
  location?: LocationSchema;
  recurring?: RecurringConfigSchema;
  tags!: Realm.List<string>;
  createdAt!: Date;
  updatedAt!: Date;
  ownerId!: string;

  static schema: Realm.ObjectSchema = {
    name: "Expense",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      expenseId: { type: "string", indexed: true },
      description: "string",
      amount: "double",
      currency: { type: "string", default: "INR" },
      paidBy: "Participant",
      splitBetween: "Participant[]",
      splitType: { type: "string", default: "equal" },
      splits: "Split[]",
      category: { type: "string", default: "Other", indexed: true },
      date: { type: "date", indexed: true },
      groupId: { type: "string", optional: true, indexed: true },
      receipt: "string?",
      location: "Location?",
      recurring: "RecurringConfig?",
      tags: "string[]",
      createdAt: { type: "date", default: () => new Date() },
      updatedAt: { type: "date", default: () => new Date() },
      ownerId: "string",
    },
  };
}

// ── Group Schema ────────────────────────────────────────────────────────────

export class GroupSchema extends Realm.Object<GroupSchema> {
  _id!: BSON.ObjectId;
  groupId!: string;
  name!: string;
  description?: string;
  members!: Realm.List<ParticipantSchema>;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
  simplifyDebts!: boolean;
  ownerId!: string;

  static schema: Realm.ObjectSchema = {
    name: "Group",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      groupId: { type: "string", indexed: true },
      name: "string",
      description: "string?",
      members: "Participant[]",
      createdBy: { type: "string", indexed: true },
      createdAt: { type: "date", default: () => new Date() },
      updatedAt: { type: "date", default: () => new Date() },
      simplifyDebts: { type: "bool", default: true },
      ownerId: "string",
    },
  };
}

// ── Settlement Schema ───────────────────────────────────────────────────────

export class SettlementSchema extends Realm.Object<SettlementSchema> {
  _id!: BSON.ObjectId;
  settlementId!: string;
  fromUserId!: string;
  toUserId!: string;
  amount!: number;
  currency?: string;
  paymentMethod?: string; // "cash" | "upi" | "bank_transfer" | "card" | "other"
  date!: Date;
  note?: string;
  groupId?: string;
  createdAt!: Date;
  ownerId!: string;

  static schema: Realm.ObjectSchema = {
    name: "Settlement",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      settlementId: { type: "string", indexed: true },
      fromUserId: { type: "string", indexed: true },
      toUserId: { type: "string", indexed: true },
      amount: "double",
      currency: { type: "string", default: "INR" },
      paymentMethod: { type: "string", default: "cash" },
      date: { type: "date", indexed: true },
      note: "string?",
      groupId: { type: "string", optional: true, indexed: true },
      createdAt: { type: "date", default: () => new Date() },
      ownerId: "string",
    },
  };
}

// ── Balance Schema ──────────────────────────────────────────────────────────

export class BalanceEntrySchema extends Realm.Object<BalanceEntrySchema> {
  odId!: string; // the other user's id
  amount!: number;

  static schema: Realm.ObjectSchema = {
    name: "BalanceEntry",
    embedded: true,
    properties: {
      odId: "string",
      amount: "double",
    },
  };
}

export class BalanceSchema extends Realm.Object<BalanceSchema> {
  _id!: BSON.ObjectId;
  userId!: string;
  owes!: Realm.List<BalanceEntrySchema>;
  owedBy!: Realm.List<BalanceEntrySchema>;
  totalBalance!: number;
  updatedAt!: Date;
  ownerId!: string;

  static schema: Realm.ObjectSchema = {
    name: "Balance",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      userId: { type: "string", indexed: true },
      owes: "BalanceEntry[]",
      owedBy: "BalanceEntry[]",
      totalBalance: { type: "double", default: 0 },
      updatedAt: { type: "date", default: () => new Date() },
      ownerId: "string",
    },
  };
}

// ── Export all schemas ──────────────────────────────────────────────────────

export const allSchemas = [
  UserSchema,
  FriendshipSchema,
  InvitationSchema,
  SplitSchema,
  ParticipantSchema,
  LocationSchema,
  RecurringConfigSchema,
  ExpenseSchema,
  GroupSchema,
  SettlementSchema,
  BalanceEntrySchema,
  BalanceSchema,
];
