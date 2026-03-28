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
  ): Promise<User> {
    const db = DatabaseService.getInstance();
    const client = db.getClient();

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
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw new NetworkError("general", insertError.message, false, "signup");
    }

    const user: User = { id: userId, name, email: email.toLowerCase() };
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

      const { data: existing } = await client
        .from("users")
        .select("id")
        .ilike("email", userData.email)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new NetworkError(
          "validation",
          "An account with this email already exists.",
          false,
          "signup",
        );
      }

      const userId = this.generateUserId();
      const now = new Date().toISOString();

      const { error } = await client.from("users").insert({
        id: crypto.randomUUID ? crypto.randomUUID() : userId,
        user_id: userId,
        name: userData.name,
        email: userData.email.toLowerCase(),
        phone: userData.phone || null,
        avatar: userData.avatar || null,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw new NetworkError("general", error.message, true, "signup");
      }

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
    if (existingUser) throw new Error("User with this email already exists");
    const user: User = { ...userData, id: this.generateUserId() };
    await this.localStorage.addFriend(user);
    return user;
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

  async checkConnectivity(): Promise<boolean> {
    try {
      const db = DatabaseService.getInstance();
      return db.isConnected();
    } catch {
      return false;
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
