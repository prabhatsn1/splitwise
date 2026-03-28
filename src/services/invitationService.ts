import { Linking, Platform, Share } from "react-native";
import { FriendInvitation, InvitationStatus } from "../types";
import { InvitationRow } from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

export type ShareChannel =
  | "sms"
  | "whatsapp"
  | "telegram"
  | "instagram"
  | "snapchat"
  | "share_sheet";

const INVITATIONS_KEY = "@splitwise_invitations";

class InvitationService {
  private static instance: InvitationService;
  private localStorage = LocalStorageService.getInstance();

  static getInstance(): InvitationService {
    if (!InvitationService.instance) {
      InvitationService.instance = new InvitationService();
    }
    return InvitationService.instance;
  }

  // ── Supabase helpers ──────────────────────────────────────────────────

  private isSupabaseAvailable(): boolean {
    try {
      const db = DatabaseService.getInstance();
      return db.isConnected();
    } catch {
      return false;
    }
  }

  private generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toInvitation(row: InvitationRow): FriendInvitation {
    return {
      id: row.id,
      fromUserId: row.from_user_id,
      fromUserName: row.from_user_name,
      toPhone: row.to_phone,
      toName: row.to_name,
      status: row.status as InvitationStatus,
      createdAt: new Date(row.created_at),
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
      message: row.message ?? undefined,
    };
  }

  /**
   * Normalise a phone number to digits-only for consistent lookups.
   */
  normalizePhone(phone: string): string {
    const trimmed = phone.trim();
    if (trimmed.startsWith("+")) {
      return "+" + trimmed.slice(1).replace(/\D/g, "");
    }
    return trimmed.replace(/\D/g, "");
  }

  // ── AsyncStorage fallback persistence ─────────────────────────────────

  private async saveInvitationsLocal(
    invitations: FriendInvitation[],
  ): Promise<void> {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(INVITATIONS_KEY, JSON.stringify(invitations));
  }

  private async getInvitationsLocal(): Promise<FriendInvitation[]> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const raw = await AsyncStorage.getItem(INVITATIONS_KEY);
      if (!raw) return [];
      const invitations: FriendInvitation[] = JSON.parse(raw);
      return invitations.map((inv) => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        respondedAt: inv.respondedAt ? new Date(inv.respondedAt) : undefined,
      }));
    } catch {
      return [];
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  async getInvitations(): Promise<FriendInvitation[]> {
    if (this.isSupabaseAvailable()) {
      const client = DatabaseService.getInstance().getClient();
      const userId = DatabaseService.getInstance().getUserId();
      const { data, error } = await client
        .from("invitations")
        .select("*")
        .eq("from_user_id", userId);
      if (error) throw error;
      return (data || []).map((r: InvitationRow) => this.toInvitation(r));
    }
    return this.getInvitationsLocal();
  }

  async sendInvitation(
    fromUserId: string,
    fromUserName: string,
    toPhone: string,
    toName: string,
    customMessage?: string,
    channel: ShareChannel = "sms",
  ): Promise<FriendInvitation> {
    const normalizedPhone = this.normalizePhone(toPhone);

    // Check for duplicate pending invitation
    const existing = await this.getInvitations();
    const duplicate = existing.find(
      (inv) => inv.toPhone === normalizedPhone && inv.status === "pending",
    );
    if (duplicate) {
      throw new Error("An invitation to this number is already pending.");
    }

    const body = this.buildSmsBody(fromUserName, customMessage);
    await this.shareViaChannel(channel, normalizedPhone, body);

    if (this.isSupabaseAvailable()) {
      const client = DatabaseService.getInstance().getClient();
      const { data, error } = await client
        .from("invitations")
        .insert({
          from_user_id: fromUserId,
          from_user_name: fromUserName,
          to_phone: normalizedPhone,
          to_name: toName.trim(),
          status: "pending",
          message: customMessage ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return this.toInvitation(data as InvitationRow);
    }

    // Fallback: AsyncStorage
    const invitation: FriendInvitation = {
      id: this.generateId(),
      fromUserId,
      fromUserName,
      toPhone: normalizedPhone,
      toName: toName.trim(),
      status: "pending",
      createdAt: new Date(),
      message: customMessage,
    };
    await this.saveInvitationsLocal([...existing, invitation]);
    return invitation;
  }

  async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<FriendInvitation | null> {
    if (this.isSupabaseAvailable()) {
      const client = DatabaseService.getInstance().getClient();
      const { data, error } = await client
        .from("invitations")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", invitationId)
        .select()
        .single();
      if (error) return null;
      return this.toInvitation(data as InvitationRow);
    }

    // Fallback
    const invitations = await this.getInvitationsLocal();
    const idx = invitations.findIndex((inv) => inv.id === invitationId);
    if (idx === -1) return null;
    invitations[idx] = { ...invitations[idx], status, respondedAt: new Date() };
    await this.saveInvitationsLocal(invitations);
    return invitations[idx];
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    if (this.isSupabaseAvailable()) {
      const client = DatabaseService.getInstance().getClient();
      await client.from("invitations").delete().eq("id", invitationId);
      return;
    }

    const invitations = await this.getInvitationsLocal();
    await this.saveInvitationsLocal(
      invitations.filter((inv) => inv.id !== invitationId),
    );
  }

  async resendInvitation(invitationId: string): Promise<void> {
    const invitations = await this.getInvitations();
    const invitation = invitations.find((inv) => inv.id === invitationId);
    if (!invitation || invitation.status !== "pending") {
      throw new Error("Invitation not found or no longer pending.");
    }
    const body = this.buildSmsBody(invitation.fromUserName, invitation.message);
    await this.openSmsComposer(invitation.toPhone, body);
  }

  // ── Sharing helpers ───────────────────────────────────────────────────

  private buildSmsBody(fromName: string, customMessage?: string): string {
    const base = `Hey! ${fromName} is inviting you to join Splitwise — the easiest way to split expenses with friends.\n\nDownload the app and connect using your mobile number.`;
    return customMessage ? `${base}\n\n${customMessage}` : base;
  }

  private async shareViaChannel(
    channel: ShareChannel,
    phone: string,
    body: string,
  ): Promise<void> {
    switch (channel) {
      case "sms":
        return this.openSmsComposer(phone, body);
      case "whatsapp":
        return this.openWhatsApp(phone, body);
      case "telegram":
        return this.openTelegram(body);
      case "instagram":
        return this.openInstagramDM();
      case "snapchat":
        return this.openSnapchat();
      case "share_sheet":
        return this.openNativeShareSheet(body);
      default:
        return this.openNativeShareSheet(body);
    }
  }

  private async openSmsComposer(phone: string, body: string): Promise<void> {
    const encoded = encodeURIComponent(body);
    const separator = Platform.OS === "ios" ? "&" : "?";
    const url = `sms:${phone}${separator}body=${encoded}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error("SMS is not available on this device.");
    }
    await Linking.openURL(url);
  }

  private async openWhatsApp(phone: string, body: string): Promise<void> {
    const digits = phone.replace(/\D/g, "");
    const encoded = encodeURIComponent(body);
    const url = `whatsapp://send?phone=${digits}&text=${encoded}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported)
      throw new Error("WhatsApp is not installed on this device.");
    await Linking.openURL(url);
  }

  private async openTelegram(body: string): Promise<void> {
    const encoded = encodeURIComponent(body);
    const url = `tg://msg?text=${encoded}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported)
      throw new Error("Telegram is not installed on this device.");
    await Linking.openURL(url);
  }

  private async openInstagramDM(): Promise<void> {
    const url = "instagram://direct-inbox";
    const supported = await Linking.canOpenURL(url);
    if (!supported)
      throw new Error("Instagram is not installed on this device.");
    await Linking.openURL(url);
  }

  private async openSnapchat(): Promise<void> {
    const url = "snapchat://";
    const supported = await Linking.canOpenURL(url);
    if (!supported)
      throw new Error("Snapchat is not installed on this device.");
    await Linking.openURL(url);
  }

  private async openNativeShareSheet(body: string): Promise<void> {
    await Share.share({ message: body });
  }
}

export default InvitationService;
