import Realm, { BSON } from "realm";
import { ATLAS_CONFIG } from "../config";
import { allSchemas } from "../models/schemas";

/**
 * DatabaseService — singleton that manages both the Realm App
 * (Atlas App Services authentication) and the synced Realm instance
 * (Flexible Sync with MongoDB Atlas).
 *
 * Usage:
 *   const db = DatabaseService.getInstance();
 *   await db.initialize();          // call once at app start
 *   const realm = db.getRealm();    // local+synced Realm
 *   const app = db.getApp();        // Atlas App (for auth)
 */
class DatabaseService {
  private static instance: DatabaseService;
  private app: Realm.App | null = null;
  private realm: Realm | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the Atlas App connection (does NOT open Realm yet).
   * Call this early in app startup.
   */
  async initialize(): Promise<Realm.App> {
    if (this.app) return this.app;
    this.app = new Realm.App({ id: ATLAS_CONFIG.APP_ID });
    return this.app;
  }

  /**
   * Open (or return) a synced Realm for the currently logged-in user.
   * Requires the user to be authenticated first.
   */
  async openRealm(): Promise<Realm> {
    if (this.realm && !this.realm.isClosed) return this.realm;

    const user = this.getAppUser();

    const config: Realm.Configuration = {
      schema: allSchemas,
      sync: {
        user,
        flexible: true,
        initialSubscriptions: {
          update: (subs, realm) => {
            // Subscribe to all data belonging to the current user
            subs.add(realm.objects("User").filtered("ownerId == $0", user.id), {
              name: "my-users",
            });
            subs.add(
              realm.objects("Expense").filtered("ownerId == $0", user.id),
              { name: "my-expenses" },
            );
            subs.add(
              realm.objects("Group").filtered("ownerId == $0", user.id),
              { name: "my-groups" },
            );
            subs.add(
              realm.objects("Settlement").filtered("ownerId == $0", user.id),
              { name: "my-settlements" },
            );
            subs.add(
              realm.objects("Friendship").filtered("ownerId == $0", user.id),
              { name: "my-friendships" },
            );
            subs.add(
              realm.objects("Invitation").filtered("ownerId == $0", user.id),
              { name: "my-invitations" },
            );
            subs.add(
              realm.objects("Balance").filtered("ownerId == $0", user.id),
              { name: "my-balances" },
            );
          },
        },
        onError: (session, error) => {
          console.error("Realm sync error:", error.message);
        },
      },
    };

    this.realm = await Realm.open(config);
    return this.realm;
  }

  /**
   * Open a local-only (no sync) Realm for offline / anonymous use.
   */
  async openLocalRealm(): Promise<Realm> {
    if (this.realm && !this.realm.isClosed) return this.realm;

    this.realm = await Realm.open({
      schema: allSchemas,
      path: "splitwise-local.realm",
    });
    return this.realm;
  }

  /** Get the currently-open Realm (throws if not open). */
  getRealm(): Realm {
    if (!this.realm || this.realm.isClosed) {
      throw new Error(
        "Realm is not open. Call openRealm() or openLocalRealm() first.",
      );
    }
    return this.realm;
  }

  /** Get the Atlas App (throws if not initialized). */
  getApp(): Realm.App {
    if (!this.app) {
      throw new Error("Atlas App not initialized. Call initialize() first.");
    }
    return this.app;
  }

  /** Convenience: get the currently logged-in Atlas user. */
  getAppUser(): Realm.User {
    const user = this.app?.currentUser;
    if (!user) {
      throw new Error("No authenticated Atlas user. Please log in first.");
    }
    return user;
  }

  /** Check if there's a logged-in Atlas user. */
  hasAuthenticatedUser(): boolean {
    return !!this.app?.currentUser;
  }

  /** Check if Realm is open and usable. */
  isConnected(): boolean {
    return !!this.realm && !this.realm.isClosed;
  }

  /** Pause sync (e.g. when the app is backgrounded). */
  pauseSync(): void {
    if (this.realm?.syncSession) {
      this.realm.syncSession.pause();
    }
  }

  /** Resume sync. */
  resumeSync(): void {
    if (this.realm?.syncSession) {
      this.realm.syncSession.resume();
    }
  }

  /** Wait for any pending uploads/downloads to finish. */
  async waitForSync(timeoutMs = ATLAS_CONFIG.SYNC_TIMEOUT): Promise<void> {
    if (!this.realm?.syncSession) return;
    await Promise.all([
      this.realm.syncSession.uploadAllLocalChanges(timeoutMs),
      this.realm.syncSession.downloadAllServerChanges(timeoutMs),
    ]);
  }

  /** Close the Realm and clean up. */
  async disconnect(): Promise<void> {
    if (this.realm && !this.realm.isClosed) {
      this.realm.close();
    }
    this.realm = null;
  }

  /** Fully log out the Atlas user and close Realm. */
  async logout(): Promise<void> {
    await this.disconnect();
    if (this.app?.currentUser) {
      await this.app.currentUser.logOut();
    }
  }

  // ── Legacy compatibility stubs ──────────────────────────────────────────

  /** @deprecated Use initialize() + openRealm() instead */
  async connect(): Promise<void> {
    await this.initialize();
  }

  /** @deprecated */
  ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error("Database not initialized. Call openRealm() first.");
    }
  }
}

export default DatabaseService;
