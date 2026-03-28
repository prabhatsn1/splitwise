# Supabase Setup Guide

This guide walks you through setting up a Supabase backend for the Splitwise app. Supabase replaces the previous MongoDB Atlas/Realm backend and provides authentication, a PostgreSQL database, and Row Level Security out of the box.

---

## Prerequisites

- A free [Supabase](https://supabase.com) account
- Node.js 18+ and npm/yarn installed
- The project dependencies already installed (`npm install`)

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose an organization (or create one)
4. Fill in:
   - **Project name**: e.g. `splitwise`
   - **Database password**: save this somewhere safe
   - **Region**: pick one closest to your users
5. Click **Create new project** and wait for it to finish provisioning

---

## 2. Get Your API Credentials

Once the project is ready:

1. Go to **Project Settings → API** (or click the gear icon → API)
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long `eyJ...` JWT string

---

## 3. Configure the App

Open `src/config/index.ts` and replace the placeholder values:

```ts
export const SUPABASE_CONFIG = {
  URL: "https://your-project-id.supabase.co", // ← paste your Project URL
  ANON_KEY: "eyJhbGciOiJI...", // ← paste your anon key
};
```

**Using environment variables (recommended for production):**

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your environment or `.env` file. The config will pick them up automatically:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

---

## 4. Run the Database Schema

1. In the Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `SUPABASE_SETUP.sql` from this project root
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** (or Ctrl/Cmd + Enter)

This creates 6 tables with Row Level Security policies:

| Table         | Purpose                                    |
| ------------- | ------------------------------------------ |
| `users`       | User profiles (linked to Supabase Auth)    |
| `friendships` | Friend connections between users           |
| `invitations` | Friend invitations via SMS/WhatsApp/etc.   |
| `expenses`    | Shared expenses with split details (jsonb) |
| `groups`      | Expense groups with member lists (jsonb)   |
| `settlements` | Settle-up payments between users           |

It also creates indexes for common queries and `updated_at` triggers.

---

## 5. Enable Email/Password Authentication

1. Go to **Authentication → Providers** in the Supabase Dashboard
2. Make sure **Email** provider is enabled (it is by default)
3. Optionally configure:
   - **Confirm email**: toggle off for development to skip email verification
   - **Minimum password length**: default is 6 characters

### Optional: Disable Email Confirmation (Development Only)

For faster local testing:

1. Go to **Authentication → Settings**
2. Under **Email Auth**, toggle off **Enable email confirmations**
3. New signups will be auto-confirmed

> **Warning**: Re-enable email confirmations before going to production.

---

## 6. Verify the Setup

After completing steps 1–5:

1. Start the app:

   ```bash
   npx expo start
   ```

2. Create a new account through the app's signup screen

3. Verify in the Supabase Dashboard:
   - **Authentication → Users** — you should see the new user
   - **Table Editor → users** — you should see a profile row

---

## Architecture Overview

```
┌─────────────────────┐
│    React Native      │
│    (Expo SDK 53)     │
├─────────────────────┤
│  @supabase/supabase-js  ←──── Auth + REST API
├─────────────────────┤
│  AsyncStorage        │ ←──── Offline cache / session persistence
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Supabase Cloud     │
├─────────────────────┤
│  Auth (email/pass)   │
│  PostgreSQL + RLS    │
│  Auto-generated API  │
└─────────────────────┘
```

### How it works

- **Online mode**: All reads/writes go directly to Supabase via the auto-generated REST API
- **Offline mode**: Data is cached in AsyncStorage via `LocalStorageService`. When back online and authenticated, the app reads fresh data from Supabase
- **Auth sessions**: Persisted in AsyncStorage, auto-restored on app launch
- **Row Level Security**: Every table has RLS policies so users can only access their own data (and shared expenses/groups they belong to)

---

## Database Tables Reference

### `users`

| Column    | Type          | Notes                   |
| --------- | ------------- | ----------------------- |
| `id`      | uuid (PK)     | Matches `auth.users.id` |
| `user_id` | text (unique) | App-level ID            |
| `name`    | text          | Display name            |
| `email`   | text (unique) | Email address           |
| `phone`   | text          | Optional phone number   |
| `avatar`  | text          | Optional avatar URL     |

### `expenses`

| Column          | Type          | Notes                           |
| --------------- | ------------- | ------------------------------- |
| `id`            | uuid (PK)     | Auto-generated                  |
| `expense_id`    | text (unique) | App-level ID                    |
| `amount`        | numeric(12,2) | Expense amount                  |
| `paid_by`       | jsonb         | `{id, name, email, ...}`        |
| `split_between` | jsonb         | Array of participants           |
| `splits`        | jsonb         | Array of `{userId, amount}`     |
| `category`      | text          | Expense category                |
| `location`      | jsonb         | Optional `{lat, lng, address}`  |
| `recurring`     | jsonb         | Optional `{frequency, endDate}` |
| `tags`          | jsonb         | Array of tag strings            |

### `groups`

| Column           | Type          | Notes                             |
| ---------------- | ------------- | --------------------------------- |
| `id`             | uuid (PK)     | Auto-generated                    |
| `group_id`       | text (unique) | App-level ID                      |
| `name`           | text          | Group name                        |
| `members`        | jsonb         | Array of `{id, name, email, ...}` |
| `simplify_debts` | boolean       | Debt simplification toggle        |

### `settlements`

| Column           | Type          | Notes                |
| ---------------- | ------------- | -------------------- |
| `id`             | uuid (PK)     | Auto-generated       |
| `settlement_id`  | text (unique) | App-level ID         |
| `from_user_id`   | text          | Who paid             |
| `to_user_id`     | text          | Who received         |
| `amount`         | numeric(12,2) | Settlement amount    |
| `payment_method` | text          | e.g. "cash", "venmo" |

### `friendships`

| Column      | Type      | Notes                     |
| ----------- | --------- | ------------------------- |
| `id`        | uuid (PK) | Auto-generated            |
| `user_id`   | text      | Owner of the friendship   |
| `friend_id` | text      | Friend's user ID          |
| `status`    | text      | "active", "blocked", etc. |

### `invitations`

| Column         | Type      | Notes                             |
| -------------- | --------- | --------------------------------- |
| `id`           | uuid (PK) | Auto-generated                    |
| `from_user_id` | text      | Sender                            |
| `to_phone`     | text      | Recipient phone number            |
| `status`       | text      | "pending", "accepted", "declined" |

---

## Troubleshooting

### "Supabase not initialized" error

Make sure you call `DatabaseService.getInstance().initialize()` before any database operations. The `AppContext` does this automatically on app launch.

### Row Level Security errors (403 / empty results)

- Check that the user is authenticated (`db.hasAuthenticatedUser()`)
- Verify that the `owner_id` column in the inserted row matches `auth.uid()`
- Run `select auth.uid()` in SQL Editor while impersonating a user to debug

### Auth session not persisting

Ensure `@react-native-async-storage/async-storage` is properly installed and linked. The Supabase client uses it to persist JWT tokens.

### "relation does not exist" error

The SQL schema hasn't been run yet. Go to SQL Editor and run `SUPABASE_SETUP.sql`.

---

## Going to Production

Before releasing to the App Store / Play Store:

1. **Enable email confirmations** in Authentication → Settings
2. **Restrict the anon key** — use environment variables, never commit keys to git
3. **Review RLS policies** — test with different users to confirm data isolation
4. **Enable Point-in-Time Recovery** (PITR) for database backups (paid plan)
5. **Set up rate limiting** if needed via Supabase Dashboard → Edge Functions or API settings
