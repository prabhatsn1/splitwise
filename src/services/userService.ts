import { User } from "../types";
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

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

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

  private async withRetry<T>(
    operation: () => Promise<T>,
    action?: "login" | "signup" | "sync" | "load_data",
    retries = this.maxRetries,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Retrying operation, ${retries} attempts left...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.withRetry(operation, action, retries - 1);
      }
      throw this.enhanceError(error, action);
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors that are worth retrying
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED")
      return true;
    if (error.message?.includes("timeout")) return true;
    if (error.message?.includes("connection")) return true;
    if (error.message?.includes("network")) return true;

    // MongoDB specific retryable errors
    if (error.code === 11000) return false; // Duplicate key, don't retry
    if (error.codeName === "NetworkTimeout") return true;
    if (error.codeName === "HostUnreachable") return true;

    return false;
  }

  private enhanceError(
    error: any,
    action?: "login" | "signup" | "sync" | "load_data",
  ): NetworkError {
    // Network connectivity errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return new NetworkError(
        "network",
        "Unable to connect to server. Please check your internet connection.",
        true,
        action,
      );
    }

    // Timeout errors
    if (error.message?.includes("timeout")) {
      return new NetworkError(
        "network",
        "Connection timed out. Please try again.",
        true,
        action,
      );
    }

    // Database connection errors
    if (
      error.message?.includes("MongoServerError") ||
      error.message?.includes("connection")
    ) {
      return new NetworkError(
        "network",
        "Database connection failed. Please check your connection and try again.",
        true,
        action,
      );
    }

    // Authentication specific errors
    if (action === "login" && error.message?.includes("not found")) {
      return new NetworkError(
        "auth",
        "User not found. Please check your email or sign up for a new account.",
        false,
        action,
      );
    }

    // Validation errors
    if (error.code === 11000) {
      return new NetworkError(
        "validation",
        "An account with this email already exists. Please try logging in instead.",
        false,
        action,
      );
    }

    // Generic error
    return new NetworkError(
      "general",
      error.message || "An unexpected error occurred. Please try again.",
      this.isRetryableError(error),
      action,
    );
  }

  async createUser(userData: Omit<User, "id">): Promise<User> {
    return this.withRetry(async () => {
      const data = await this.localStorage.getLocalData();
      const users = this.getAllKnownUsers(data);
      const existingUser = users.find(
        (user) => user.email.toLowerCase() === userData.email.toLowerCase(),
      );

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const user: User = {
        ...userData,
        id: this.generateUserId(),
      };

      await this.localStorage.addFriend(user);

      return user;
    }, "signup");
  }

  async getUserById(id: string): Promise<User | null> {
    return this.withRetry(async () => {
      const data = await this.localStorage.getLocalData();
      const users = this.getAllKnownUsers(data);
      return users.find((user) => user.id === id) || null;
    }, "load_data");
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.withRetry(async () => {
      const data = await this.localStorage.getLocalData();
      const users = this.getAllKnownUsers(data);
      return (
        users.find(
          (user) => user.email.toLowerCase() === email.toLowerCase(),
        ) || null
      );
    }, "login");
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    return this.withRetry(async () => {
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
    }, "sync");
  }

  async getAllUsers(): Promise<User[]> {
    return this.withRetry(async () => {
      const data = await this.localStorage.getLocalData();
      return this.getAllKnownUsers(data);
    }, "load_data");
  }

  // Health check method to test connectivity
  async checkConnectivity(): Promise<boolean> {
    try {
      await this.localStorage.getLocalData();
      return true;
    } catch (error) {
      console.log("Connectivity check failed:", error);
      return false;
    }
  }
}
