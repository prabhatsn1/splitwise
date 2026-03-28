import { Settlement } from "../types";
import { SettlementRow } from "../models/schemas";
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

  private toSettlement(row: SettlementRow): Settlement {
    return {
      id: row.settlement_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      amount: row.amount,
      date: new Date(row.date),
      note: row.note ?? undefined,
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
    const settlementId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date();

    if (this.isSupabaseAvailable()) {
      await this.getClient()
        .from("settlements")
        .insert({
          settlement_id: settlementId,
          from_user_id: data.fromUserId,
          to_user_id: data.toUserId,
          amount: data.amount,
          currency: data.currency || "INR",
          payment_method: data.paymentMethod || "cash",
          date: date.toISOString(),
          note: data.note || null,
          group_id: data.groupId || null,
          created_at: date.toISOString(),
          owner_id: this.getOwnerId(),
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
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("settlements")
        .select("*")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("date", { ascending: false });
      return (data || []).map((row: any) =>
        this.toSettlement(row as SettlementRow),
      );
    }
    return [];
  }

  async getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("settlements")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: false });
      return (data || []).map((row: any) =>
        this.toSettlement(row as SettlementRow),
      );
    }
    return [];
  }

  async deleteSettlement(id: string): Promise<boolean> {
    if (this.isSupabaseAvailable()) {
      const { error } = await this.getClient()
        .from("settlements")
        .delete()
        .eq("settlement_id", id);
      return !error;
    }
    return false;
  }
}
