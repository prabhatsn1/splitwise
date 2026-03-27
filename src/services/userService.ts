import Realm, { BSON } from "realm";
import { User } from "../types";
import { UserSchema } from "../models/schemas";
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
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

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

  private generateUserId(): string {
    return new BSON.ObjectId().toHexString();
  }

  /** Convert a Realm UserSchema object to a plain User */
  private toUser(realmUser: UserSchema): User {
    return {
      id: realmUser.userId,
      name: realmUser.name,
      email: realmUser.email,
      phone: realmUser.phone ?? undefined,
      avatar: realmUser.avatar ?? undefined,
    };
  }

  // ── Auth (Atlas App Services) ─────────────────────────────────────────

  /**
   * Register a new user with Atlas email/password auth AND create a
   * User record in Realm.
   */
  async registerUser(
    email: string,
    password: string,
    name: string,
  ): Promise<User> {
    const db = DatabaseService.getInstance();
    const app = db.getApp();

    // Register credentials with Atlas App Services
    await app.emailPasswordAuth.registerUser({ email, password });

    // Log in immediately
    const credentials = Realm.Credentials.emailPassword(email, password);
    await app.logIn(credentials);

    // Open synced Realm
    await db.openRealm();

    const userId = this.generateUserId();
    const realm = this.getRealm();

    realm.write(() => {
      realm.create("User", {
        _id: new BSON.ObjectId(),
        userId,
        name,
        email: email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: app.currentUser!.id,
      });
    });

    const user: User = { id: userId, name, email: email.toLowerCase() };
    await this.localStorage.saveUser(user);
    return user;
  }

  /**
   * Log in an existing user via Atlas email/password auth.
   */
  async loginWithPassword(email: string, password: string): Promise<User> {
    const db = DatabaseService.getInstance();
    const app = db.getApp();

    const credentials = Realm.Credentials.emailPassword(email, password);
    await app.logIn(credentials);

    // Open synced Realm
    await db.openRealm();

    const realm = this.getRealm();
    const realmUser = realm
      .objects<UserSchema>("User")
      .filtered("email ==[c] $0", email)[0];

    if (!realmUser) {
      throw new NetworkError(
        "auth",
        "User profile not found. Please sign up.",
        false,
        "login",
      );
    }

    const user = this.toUser(realmUser);
    await this.localStorage.saveUser(user);
    return user;
  }

  /**
   * Log in anonymously (for offline/guest mode that still syncs).
   */
  async loginAnonymously(): Promise<void> {
    const db = DatabaseService.getInstance();
    const app = db.getApp();
    const credentials = Realm.Credentials.anonymous();
    await app.logIn(credentials);
    await db.openRealm();
  }

  // ── CRUD (Realm-backed, falls back to localStorage) ───────────────────

  async createUser(userData: Omit<User, "id">): Promise<User> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const existing = realm
        .objects<UserSchema>("User")
        .filtered("email ==[c] $0", userData.email);

      if (existing.length > 0) {
        throw new NetworkError(
          "validation",
          "An account with this email already exists.",
          false,
          "signup",
        );
      }

      const userId = this.generateUserId();
      realm.write(() => {
        realm.create("User", {
          _id: new BSON.ObjectId(),
          userId,
          name: userData.name,
          email: userData.email.toLowerCase(),
          phone: userData.phone,
          avatar: userData.avatar,
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerId: this.getOwnerId(),
        });
      });

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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const found = realm
        .objects<UserSchema>("User")
        .filtered("userId == $0", id)[0];
      return found ? this.toUser(found) : null;
    }

    const data = await this.localStorage.getLocalData();
    const users = this.getAllKnownUsers(data);
    return users.find((u) => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const found = realm
        .objects<UserSchema>("User")
        .filtered("email ==[c] $0", email)[0];
      return found ? this.toUser(found) : null;
    }

    const data = await this.localStorage.getLocalData();
    const users = this.getAllKnownUsers(data);
    return (
      users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
    );
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const realmUser = realm
        .objects<UserSchema>("User")
        .filtered("userId == $0", id)[0];
      if (!realmUser) return null;

      realm.write(() => {
        if (userData.name !== undefined) realmUser.name = userData.name;
        if (userData.email !== undefined)
          realmUser.email = userData.email.toLowerCase();
        if (userData.phone !== undefined) realmUser.phone = userData.phone;
        if (userData.avatar !== undefined) realmUser.avatar = userData.avatar;
        realmUser.updatedAt = new Date();
      });

      const updated = this.toUser(realmUser);
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
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      return Array.from(realm.objects<UserSchema>("User")).map(this.toUser);
    }

    const data = await this.localStorage.getLocalData();
    return this.getAllKnownUsers(data);
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
