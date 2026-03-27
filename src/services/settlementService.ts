import Realm, { BSON } from "realm";
import { Settlement } from "../types";
import { SettlementSchema } from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

export class SettlementService {
  private static instance: SettlementService;
  private localStorage = LocalStorageService.getInstance();

  static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

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

  private toSettlement(rs: SettlementSchema): Settlement {
    return {
      id: rs.settlementId,
      fromUserId: rs.fromUserId,
      toUserId: rs.toUserId,
      amount: rs.amount,
      date: rs.date,
      note: rs.note ?? undefined,
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  async createSettlement(data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency?: string;
    paymentMethod?: string;
    note?: string;
    groupId?: string;
  }): Promise<Settlement> {
    const settlementId = new BSON.ObjectId().toHexString();
    const date = new Date();

    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const ownerId = this.getOwnerId();

      realm.write(() => {
        realm.create("Settlement", {
          _id: new BSON.ObjectId(),
          settlementId,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          amount: data.amount,
          currency: data.currency || "INR",
          paymentMethod: data.paymentMethod || "cash",
          date,
          note: data.note,
          groupId: data.groupId,
          createdAt: new Date(),
          ownerId,
        });
      });
    }

    return {
      id: settlementId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      date,
      note: data.note,
    };
  }

  async getSettlementsByUserId(userId: string): Promise<Settlement[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm
        .objects<SettlementSchema>("Settlement")
        .filtered("fromUserId == $0 OR toUserId == $0", userId);
      return Array.from(results)
        .map((r) => this.toSettlement(r))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }
    return [];
  }

  async getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm
        .objects<SettlementSchema>("Settlement")
        .filtered("groupId == $0", groupId);
      return Array.from(results)
        .map((r) => this.toSettlement(r))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }
    return [];
  }

  async deleteSettlement(id: string): Promise<boolean> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const rs = realm
        .objects<SettlementSchema>("Settlement")
        .filtered("settlementId == $0", id)[0];
      if (rs) {
        realm.write(() => realm.delete(rs));
        return true;
      }
    }
    return false;
  }
}
