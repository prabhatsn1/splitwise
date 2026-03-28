import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPABASE_CONFIG } from "../config";

/**
 * DatabaseService — singleton that manages the Supabase client
 * and authentication state.
 *
 * Usage:
 *   const db = DatabaseService.getInstance();
 *   await db.initialize();
 *   const client = db.getClient();
 */
class DatabaseService {
  private static instance: DatabaseService;
  private client: SupabaseClient | null = null;
  private session: Session | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<SupabaseClient> {
    if (this.client) return this.client;

    this.client = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Restore persisted session
    const {
      data: { session },
    } = await this.client.auth.getSession();
    this.session = session;

    // Listen for auth state changes
    this.client.auth.onAuthStateChange((_event, session) => {
      this.session = session;
    });

    return this.client;
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error("Supabase not initialized. Call initialize() first.");
    }
    return this.client;
  }

  getSession(): Session | null {
    return this.session;
  }

  getUserId(): string {
    if (!this.session?.user) {
      throw new Error("No authenticated user.");
    }
    return this.session.user.id;
  }

  hasAuthenticatedUser(): boolean {
    return !!this.session?.user;
  }

  isConnected(): boolean {
    return !!this.client && !!this.session;
  }

  async logout(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.session = null;
  }

  // Legacy stubs for smooth migration
  async connect(): Promise<void> {
    await this.initialize();
  }
  async openRealm(): Promise<void> {
    await this.initialize();
  }
  async openLocalRealm(): Promise<void> {
    await this.initialize();
  }
  async disconnect(): Promise<void> {}
  pauseSync(): void {}
  resumeSync(): void {}
  async waitForSync(): Promise<void> {}
  ensureConnected(): void {
    if (!this.client) throw new Error("Database not initialized.");
  }
}

export { DatabaseService };
export default DatabaseService;
