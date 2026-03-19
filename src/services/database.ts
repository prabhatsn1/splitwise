import { User, Group, Expense, Balance } from "../types";

class DatabaseService {
  private static instance: DatabaseService;
  private connected = false;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Legacy methods kept for compatibility with existing call sites.
  getDb(): never {
    throw new Error(
      "Direct DB access is not available in React Native runtime",
    );
  }

  getUsersCollection(): never {
    throw new Error(
      "Users collection is not available in React Native runtime",
    );
  }

  getGroupsCollection(): never {
    throw new Error(
      "Groups collection is not available in React Native runtime",
    );
  }

  getExpensesCollection(): never {
    throw new Error(
      "Expenses collection is not available in React Native runtime",
    );
  }

  getBalancesCollection(): never {
    throw new Error(
      "Balances collection is not available in React Native runtime",
    );
  }

  ensureConnected(): void {
    if (!this.connected) {
      throw new Error("Database facade not initialized");
    }
  }
}

export default DatabaseService;
