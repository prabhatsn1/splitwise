import { MongoClient, Db, Collection } from "mongodb";
import { User, Group, Expense, Balance } from "../types";
import { DATABASE_CONFIG } from "../config";

class DatabaseService {
  private static instance: DatabaseService;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    try {
      if (!this.client) {
        this.client = new MongoClient(DATABASE_CONFIG.MONGODB_URI);
        await this.client.connect();
        this.db = this.client.db(DATABASE_CONFIG.DB_NAME);
        console.log("Connected to MongoDB");
      }
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected");
    }
    return this.db;
  }

  // Collection getters
  getUsersCollection(): Collection<User> {
    return this.getDb().collection<User>(DATABASE_CONFIG.COLLECTIONS.USERS);
  }

  getGroupsCollection(): Collection<Group> {
    return this.getDb().collection<Group>(DATABASE_CONFIG.COLLECTIONS.GROUPS);
  }

  getExpensesCollection(): Collection<Expense> {
    return this.getDb().collection<Expense>(
      DATABASE_CONFIG.COLLECTIONS.EXPENSES
    );
  }

  getBalancesCollection(): Collection<Balance> {
    return this.getDb().collection<Balance>(
      DATABASE_CONFIG.COLLECTIONS.BALANCES
    );
  }
}

export default DatabaseService;
