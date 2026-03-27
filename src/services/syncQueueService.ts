import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseService } from "./database";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SyncActionType =
  | "CREATE_EXPENSE"
  | "UPDATE_EXPENSE"
  | "DELETE_EXPENSE"
  | "CREATE_GROUP"
  | "ADD_FRIEND"
  | "SETTLE_UP";

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  payload: any;
  createdAt: string; // ISO string
  retryCount: number;
  lastError?: string;
}

export type SyncStatus = "idle" | "syncing" | "error";

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  status: SyncStatus;
}

// ── Listeners ──────────────────────────────────────────────────────────────────

type SyncProgressListener = (progress: SyncProgress) => void;

// ── Service ────────────────────────────────────────────────────────────────────
// NOTE: With Realm Device Sync, most sync operations are handled automatically
// by the Realm SDK. This service is kept as a lightweight fallback for edge
// cases where operations fail outside of Realm (e.g. pure AsyncStorage mode).
// When a synced Realm is active, enqueued items are auto-cleared since Realm
// handles all synchronization.

const QUEUE_STORAGE_KEY = "@splitwise_sync_queue";

class SyncQueueService {
  private static instance: SyncQueueService;
  private queue: SyncQueueItem[] = [];
  private isSyncing = false;
  private listeners: SyncProgressListener[] = [];

  private constructor() {
    this.loadQueue();
  }

  static getInstance(): SyncQueueService {
    if (!SyncQueueService.instance) {
      SyncQueueService.instance = new SyncQueueService();
    }
    return SyncQueueService.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async enqueue(action: SyncActionType, payload: any): Promise<string> {
    // If Realm sync is active, writes are synced automatically — skip queue
    const db = DatabaseService.getInstance();
    if (db.getRealm() && db.hasAuthenticatedUser()) {
      return "realm-synced";
    }

    const item: SyncQueueItem = {
      id: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.queue.push(item);
    await this.persistQueue();
    return item.id;
  }

  async remove(itemId: string): Promise<void> {
    this.queue = this.queue.filter((i) => i.id !== itemId);
    await this.persistQueue();
  }

  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  addProgressListener(listener: SyncProgressListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async flush(
    _userId?: string,
    _dispatch?: React.Dispatch<any>,
  ): Promise<SyncProgress> {
    // When Realm sync is active, there's nothing to flush — Realm handles it.
    const db = DatabaseService.getInstance();
    if (db.getRealm() && db.hasAuthenticatedUser()) {
      // Clear any stale queued items since Realm is now syncing
      if (this.queue.length > 0) {
        this.queue = [];
        await this.persistQueue();
      }
      return { total: 0, completed: 0, failed: 0, status: "idle" };
    }

    // No queued items
    if (this.isSyncing || this.queue.length === 0) {
      return {
        total: this.queue.length,
        completed: 0,
        failed: 0,
        status: "idle",
      };
    }

    return {
      total: this.queue.length,
      completed: 0,
      failed: 0,
      status: "idle",
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private async loadQueue(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw) as SyncQueueItem[];
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
      this.queue = [];
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Failed to persist sync queue:", error);
    }
  }

  // ── Listener helpers ─────────────────────────────────────────────────────

  private notifyListeners(progress: SyncProgress): void {
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch {
        // swallow
      }
    }
  }

  destroy(): void {
    this.listeners = [];
  }
}

export default SyncQueueService;
