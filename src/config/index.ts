// MongoDB Atlas App Services Configuration
// ─────────────────────────────────────────────────────────────────────────────
// 1. Create an Atlas App Services app at https://cloud.mongodb.com
// 2. Enable Email/Password authentication in App Services → Authentication
// 3. Enable Device Sync (Flexible Sync) on your cluster
//    - Add "ownerId" as a queryable field for all collections
// 4. Replace the APP_ID below with your actual App ID
// ─────────────────────────────────────────────────────────────────────────────

export const ATLAS_CONFIG = {
  // Replace with your Atlas App Services App ID (found in App Services → App Settings)
  APP_ID: process.env.ATLAS_APP_ID || "splitwise-app-XXXXX",

  // Base URL (only needed for custom deployments, leave empty for default)
  BASE_URL: process.env.ATLAS_BASE_URL || undefined,

  // Sync timeout in ms
  SYNC_TIMEOUT: 10000,
};

// Legacy alias — some files still reference DATABASE_CONFIG
export const DATABASE_CONFIG = {
  MONGODB_URI: "",
  DB_NAME: "splitwise",
  COLLECTIONS: {
    USERS: "User",
    GROUPS: "Group",
    EXPENSES: "Expense",
    BALANCES: "Balance",
    SETTLEMENTS: "Settlement",
    FRIENDSHIPS: "Friendship",
    INVITATIONS: "Invitation",
  },
};

// App Configuration
export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
};
