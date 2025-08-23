// MongoDB Configuration
export const DATABASE_CONFIG = {
  // For local development - replace with your MongoDB connection string
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/splitwise",

  // For production, use MongoDB Atlas:
  // MONGODB_URI: 'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/splitwise?retryWrites=true&w=majority',

  // Database name
  DB_NAME: "splitwise",

  // Collections
  COLLECTIONS: {
    USERS: "users",
    GROUPS: "groups",
    EXPENSES: "expenses",
    BALANCES: "balances",
  },
};

// App Configuration
export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
};
