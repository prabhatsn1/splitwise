import { User } from "../types";
import { UserRow } from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

// Enhanced error types for better network failure handling
export class NetworkError extends Error {
  constructor(
    public type: "network" | "auth" | "validation" | "sync" | "general",
    message: string,
    public isRetryable: boolean = true,
    public action?: "login" | "signup" | "sync" | "load_data",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class UserService {
  private localStorage = LocalStorageService.getInstance();

  // ── Supabase helpers ──────────────────────────────────────────────────

  private getClient() {
    return DatabaseService.getInstance().getClient();
  }

  private isSupabaseAvailable(): boolean {
    try {
      this.getClient();
      return DatabaseService.getInstance().hasAuthenticatedUser();
    } catch {
      return false;
    }
  }

  private generateUserId(): string {
    return `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toUser(row: UserRow): User {
    return {
      id: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? undefined,
      avatar: row.avatar ?? undefined,
    };
  }

  // ── Auth (Supabase Auth) ──────────────────────────────────────────────

  async registerUser(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ): Promise<User> {
    const db = DatabaseService.getInstance();
    const client = db.getClient();

    // Check email uniqueness before attempting auth signup
    const { data: existingEmail } = await client
      .from("users")
      .select("user_id")
      .ilike("email", email)
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      throw new NetworkError(
        "validation",
        "An account with this email address is already registered. Please log in instead.",
        false,
        "signup",
      );
    }

    // Check phone uniqueness if provided
    if (phone) {
      const { data: existingPhone } = await client
        .from("users")
        .select("user_id")
        .eq("phone", phone)
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        throw new NetworkError(
          "validation",
          "This phone number is already associated with another account.",
          false,
          "signup",
        );
      }
    }

    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new NetworkError("auth", authError.message, false, "signup");
    }

    if (!authData.user) {
      throw new NetworkError("auth", "Signup failed.", false, "signup");
    }

    const userId = this.generateUserId();
    const now = new Date().toISOString();

    const { error: insertError } = await client.from("users").insert({
      id: authData.user.id,
      user_id: userId,
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw new NetworkError("general", insertError.message, false, "signup");
    }

    const user: User = { id: userId, name, email: email.toLowerCase(), phone };
    await this.localStorage.saveUser(user);
    return user;
  }

  async loginWithPassword(email: string, password: string): Promise<User> {
    const db = DatabaseService.getInstance();
    const client = db.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new NetworkError("auth", error.message, false, "login");
    }

    if (!data.user) {
      throw new NetworkError("auth", "Login failed.", false, "login");
    }

    const { data: profile, error: profileError } = await client
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      throw new NetworkError(
        "auth",
        "User profile not found. Please sign up.",
        false,
        "login",
      );
    }

    const user = this.toUser(profile as UserRow);
    await this.localStorage.saveUser(user);
    return user;
  }

  // ── CRUD (Supabase-backed, falls back to localStorage) ────────────────

  async createUser(userData: Omit<User, "id">): Promise<User> {
    if (this.isSupabaseAvailable()) {
      const client = this.getClient();

      // If the user already has an account, return their existing profile
      // so callers can link them as a friend instead of failing.
      const { data: existing } = await client
        .from("users")
        .select("*")
        .ilike("email", userData.email)
        .limit(1);

      if (existing && existing.length > 0) {
        return this.toUser(existing[0] as UserRow);
      }

      // If user doesn't exist in database, create a local-only friend
      // (they haven't signed up yet)
      const userId = this.generateUserId();
      const user: User = {
        ...userData,
        id: userId,
        email: userData.email.toLowerCase(),
      };
      await this.localStorage.addFriend(user);
      return user;
    }

    // Fallback: localStorage only
    const data = await this.localStorage.getLocalData();
    const users = this.getAllKnownUsers(data);
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === userData.email.toLowerCase(),
    );
    if (existingUser) return existingUser;
    const user: User = { ...userData, id: this.generateUserId() };
    await this.localStorage.addFriend(user);
    return user;
  }

  /**
   * Given arrays of normalised emails and phone numbers, return all
   * registered users whose profile matches any of them.
   * Used for "find which of your contacts are already on the app".
   */
  async findRegisteredContacts(
    emails: string[],
    phones: string[],
  ): Promise<User[]> {
    if (!this.isSupabaseAvailable()) return [];
    if (emails.length === 0 && phones.length === 0) return [];

    const client = this.getClient();
    const results: User[] = [];
    const seenIds = new Set<string>();

    const addUnique = (rows: any[]) => {
      (rows || []).forEach((row) => {
        const u = this.toUser(row as UserRow);
        if (!seenIds.has(u.id)) {
          seenIds.add(u.id);
          results.push(u);
        }
      });
    };

    // Cap to avoid excessively large queries
    const emailSlice = emails.slice(0, 200);
    const phoneSlice = phones.slice(0, 200);

    if (emailSlice.length > 0) {
      const { data } = await client
        .from("users")
        .select("*")
        .in("email", emailSlice);
      addUnique(data || []);
    }

    if (phoneSlice.length > 0) {
      const { data } = await client
        .from("users")
        .select("*")
        .in("phone", phoneSlice);
      addUnique(data || []);
    }

    return results;
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("users")
        .select("*")
        .eq("user_id", id)
        .single();
      return data ? this.toUser(data as UserRow) : null;
    }

    const localData = await this.localStorage.getLocalData();
    const users = this.getAllKnownUsers(localData);
    return users.find((u) => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("users")
        .select("*")
        .ilike("email", email)
        .single();
      return data ? this.toUser(data as UserRow) : null;
    }

    const localData = await this.localStorage.getLocalData();
    const users = this.getAllKnownUsers(localData);
    return (
      users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
    );
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    if (this.isSupabaseAvailable()) {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (userData.name !== undefined) updates.name = userData.name;
      if (userData.email !== undefined)
        updates.email = userData.email.toLowerCase();
      if (userData.phone !== undefined) updates.phone = userData.phone;
      if (userData.avatar !== undefined) updates.avatar = userData.avatar;

      const { data, error } = await this.getClient()
        .from("users")
        .update(updates)
        .eq("user_id", id)
        .select("*")
        .single();

      if (error || !data) return null;

      const updated = this.toUser(data as UserRow);
      await this.localStorage.saveUser(updated);
      return updated;
    }

    // Fallback
    const data = await this.localStorage.getLocalData();
    let updatedUser: User | null = null;

    if (data.currentUser?.id === id) {
      updatedUser = { ...data.currentUser, ...userData, id };
      await this.localStorage.saveUser(updatedUser);
    }

    const updatedFriends = data.friends.map((friend) => {
      if (friend.id !== id) return friend;
      updatedUser = { ...friend, ...userData, id };
      return updatedUser;
    });

    await this.localStorage.saveFriends(updatedFriends);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient().from("users").select("*");
      return (data || []).map((row: any) => this.toUser(row as UserRow));
    }

    const localData = await this.localStorage.getLocalData();
    return this.getAllKnownUsers(localData);
  }

  /**
   * Fetch only the users that the current user has explicitly added as friends,
   * using the `friendships` table as the source of truth.
   */
  async getFriends(currentUserId: string): Promise<User[]> {
    if (this.isSupabaseAvailable()) {
      const client = this.getClient();
      const db = DatabaseService.getInstance();

      // Get the Supabase auth UUID for the current user
      const authUserId = db.getUserId();

      // Rows where the current user is the one who added the friend
      const { data: rows, error } = await client
        .from("friendships")
        .select(
          "friend_id, friend_name, friend_email, friend_phone, friend_avatar",
        )
        .eq("user_id", authUserId)
        .eq("status", "active");

      if (error) {
        console.error("Failed to fetch friendships:", error);
        // Fall through to localStorage
      } else {
        return (rows || []).map(
          (row: any): User => ({
            id: row.friend_id,
            name: row.friend_name,
            email: row.friend_email,
            phone: row.friend_phone ?? undefined,
            avatar: row.friend_avatar ?? undefined,
          }),
        );
      }
    }

    const localData = await this.localStorage.getLocalData();
    return localData.friends;
  }

  /**
   * Persist a friendship record so loadFriends can later restore it from
   * the `friendships` table rather than scanning all users.
   */
  async saveFriendship(currentUserId: string, friend: User): Promise<void> {
    if (this.isSupabaseAvailable()) {
      const client = this.getClient();
      const db = DatabaseService.getInstance();
      const now = new Date().toISOString();

      // Get the Supabase auth UUID for the current user
      const authUserId = db.getUserId();

      const { error } = await client.from("friendships").upsert(
        {
          user_id: authUserId,
          friend_id: friend.id,
          friend_name: friend.name,
          friend_email: friend.email,
          friend_phone: friend.phone || null,
          friend_avatar: friend.avatar || null,
          status: "active",
          created_at: now,
        },
        { onConflict: "user_id,friend_id" },
      );

      if (error) {
        console.error("Failed to save friendship:", error);
      }
    }
    // localStorage is handled separately by the caller via localStorage.addFriend
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const db = DatabaseService.getInstance();
      return db.isConnected();
    } catch {
      return false;
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const db = DatabaseService.getInstance();
    const client = db.getClient();

    const { error } = await client.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
    );

    if (error) {
      throw new NetworkError("auth", error.message, false, "login");
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private getAllKnownUsers(data: {
    currentUser: User | null;
    friends: User[];
  }): User[] {
    const users = [data.currentUser, ...data.friends].filter(Boolean) as User[];
    const seen = new Set<string>();
    return users.filter((user) => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });
  }
}
