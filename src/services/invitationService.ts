import { Linking, Platform, Share } from "react-native";
import Realm, { BSON } from "realm";
import { FriendInvitation, InvitationStatus } from "../types";
import { InvitationSchema } from "../models/schemas";
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

  private generateId(): string {
    return new BSON.ObjectId().toHexString();
  }

  private toInvitation(ri: InvitationSchema): FriendInvitation {
    return {
      id: ri._id.toHexString(),
      fromUserId: ri.fromUserId,
      fromUserName: ri.fromUserName,
      toPhone: ri.toPhone,
      toName: ri.toName,
      status: ri.status as InvitationStatus,
      createdAt: ri.createdAt,
      respondedAt: ri.respondedAt ?? undefined,
      message: ri.message ?? undefined,
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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm.objects<InvitationSchema>("Invitation");
      return Array.from(results).map((r) => this.toInvitation(r));
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

    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const ownerId = this.getOwnerId();
      let invitation: FriendInvitation;

      realm.write(() => {
        const ri = realm.create<InvitationSchema>("Invitation", {
          _id: new BSON.ObjectId(),
          fromUserId,
          fromUserName,
          toPhone: normalizedPhone,
          toName: toName.trim(),
          status: "pending",
          createdAt: new Date(),
          message: customMessage,
          ownerId,
        });
        invitation = this.toInvitation(ri);
      });

      return invitation!;
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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const oid = BSON.ObjectId.isValid(invitationId)
        ? new BSON.ObjectId(invitationId)
        : null;
      const ri = oid
        ? realm.objectForPrimaryKey<InvitationSchema>("Invitation", oid)
        : null;

      if (!ri) return null;

      realm.write(() => {
        ri.status = status;
        ri.respondedAt = new Date();
      });
      return this.toInvitation(ri);
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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const oid = BSON.ObjectId.isValid(invitationId)
        ? new BSON.ObjectId(invitationId)
        : null;
      const ri = oid
        ? realm.objectForPrimaryKey<InvitationSchema>("Invitation", oid)
        : null;

      if (ri) {
        realm.write(() => realm.delete(ri));
      }
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
