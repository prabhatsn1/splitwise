# MongoDB Atlas App Services Setup Guide

This guide walks through setting up MongoDB Atlas App Services for the Splitwise app — **no backend server required**.

## Architecture

```
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────┐
│  React Native   │──────▶│  Atlas App Services   │──────▶│ MongoDB Atlas│
│  (Realm SDK)    │◀──────│  (Auth + Sync)        │◀──────│  (Database)  │
└─────────────────┘       └──────────────────────┘       └──────────────┘
    Local Realm              Authentication                 Cloud DB
    (Offline)                Flexible Sync                  Collections
```

- **Realm SDK** on device acts as the local database (replaces AsyncStorage for data)
- **Atlas Device Sync** (Flexible Sync) automatically syncs data to/from MongoDB Atlas
- **Atlas Authentication** handles user signup/login (email/password)
- Data works **offline-first** — changes sync when connectivity returns

## Step 1: Create a MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and sign in (or create a free account)
2. Create a **Free Tier (M0)** cluster if you don't have one
3. Note your cluster name (e.g., `Cluster0`)

## Step 2: Create an Atlas App Services App

1. In the Atlas dashboard, click **"App Services"** in the top nav
2. Click **"Create a New App"**
3. Settings:
   - **App Name**: `splitwise-app`
   - **Cluster**: select your cluster
   - **Deployment Model**: Global or Single Region
4. Click **Create App**
5. **Copy the App ID** (e.g., `splitwise-app-abcde`) — you'll need this

## Step 3: Enable Email/Password Authentication

1. In your App Services app, go to **Authentication → Providers**
2. Click **Email/Password**
3. Configure:
   - **User Confirmation Method**: `Automatically confirm users` (simplest for development)
   - **Password Reset Method**: `Send a password reset email` (or `Run a password reset function`)
4. Click **Save Draft** then **Review Draft & Deploy**

## Step 4: Define Schemas

Go to **Schema** in the left sidebar and define these schemas (or let Device Sync auto-create them).

### User

```json
{
  "title": "User",
  "bsonType": "object",
  "required": ["_id", "userId", "name", "email", "ownerId"],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "userId": { "bsonType": "string" },
    "name": { "bsonType": "string" },
    "email": { "bsonType": "string" },
    "phone": { "bsonType": "string" },
    "avatar": { "bsonType": "string" },
    "passwordHash": { "bsonType": "string" },
    "createdAt": { "bsonType": "date" },
    "updatedAt": { "bsonType": "date" },
    "ownerId": { "bsonType": "string" }
  }
}
```

### Expense

```json
{
  "title": "Expense",
  "bsonType": "object",
  "required": [
    "_id",
    "expenseId",
    "description",
    "amount",
    "paidBy",
    "splitType",
    "category",
    "date",
    "ownerId"
  ],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "expenseId": { "bsonType": "string" },
    "description": { "bsonType": "string" },
    "amount": { "bsonType": "double" },
    "currency": { "bsonType": "string" },
    "paidBy": {
      "bsonType": "object",
      "properties": {
        "id": { "bsonType": "string" },
        "name": { "bsonType": "string" },
        "email": { "bsonType": "string" },
        "phone": { "bsonType": "string" },
        "avatar": { "bsonType": "string" }
      }
    },
    "splitBetween": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "id": { "bsonType": "string" },
          "name": { "bsonType": "string" },
          "email": { "bsonType": "string" },
          "phone": { "bsonType": "string" },
          "avatar": { "bsonType": "string" }
        }
      }
    },
    "splitType": { "bsonType": "string" },
    "splits": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "userId": { "bsonType": "string" },
          "amount": { "bsonType": "double" },
          "percentage": { "bsonType": "double" },
          "shares": { "bsonType": "double" }
        }
      }
    },
    "category": { "bsonType": "string" },
    "date": { "bsonType": "date" },
    "groupId": { "bsonType": "string" },
    "receipt": { "bsonType": "string" },
    "location": {
      "bsonType": "object",
      "properties": {
        "latitude": { "bsonType": "double" },
        "longitude": { "bsonType": "double" },
        "address": { "bsonType": "string" }
      }
    },
    "recurring": {
      "bsonType": "object",
      "properties": {
        "frequency": { "bsonType": "string" },
        "endDate": { "bsonType": "date" }
      }
    },
    "tags": { "bsonType": "array", "items": { "bsonType": "string" } },
    "createdAt": { "bsonType": "date" },
    "updatedAt": { "bsonType": "date" },
    "ownerId": { "bsonType": "string" }
  }
}
```

### Group

```json
{
  "title": "Group",
  "bsonType": "object",
  "required": ["_id", "groupId", "name", "createdBy", "ownerId"],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "groupId": { "bsonType": "string" },
    "name": { "bsonType": "string" },
    "description": { "bsonType": "string" },
    "members": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "id": { "bsonType": "string" },
          "name": { "bsonType": "string" },
          "email": { "bsonType": "string" },
          "phone": { "bsonType": "string" },
          "avatar": { "bsonType": "string" }
        }
      }
    },
    "createdBy": { "bsonType": "string" },
    "createdAt": { "bsonType": "date" },
    "updatedAt": { "bsonType": "date" },
    "simplifyDebts": { "bsonType": "bool" },
    "ownerId": { "bsonType": "string" }
  }
}
```

### Settlement

```json
{
  "title": "Settlement",
  "bsonType": "object",
  "required": [
    "_id",
    "settlementId",
    "fromUserId",
    "toUserId",
    "amount",
    "date",
    "ownerId"
  ],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "settlementId": { "bsonType": "string" },
    "fromUserId": { "bsonType": "string" },
    "toUserId": { "bsonType": "string" },
    "amount": { "bsonType": "double" },
    "currency": { "bsonType": "string" },
    "paymentMethod": { "bsonType": "string" },
    "date": { "bsonType": "date" },
    "note": { "bsonType": "string" },
    "groupId": { "bsonType": "string" },
    "createdAt": { "bsonType": "date" },
    "ownerId": { "bsonType": "string" }
  }
}
```

### Friendship

```json
{
  "title": "Friendship",
  "bsonType": "object",
  "required": [
    "_id",
    "userId",
    "friendId",
    "friendName",
    "friendEmail",
    "ownerId"
  ],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "userId": { "bsonType": "string" },
    "friendId": { "bsonType": "string" },
    "friendName": { "bsonType": "string" },
    "friendEmail": { "bsonType": "string" },
    "friendPhone": { "bsonType": "string" },
    "friendAvatar": { "bsonType": "string" },
    "status": { "bsonType": "string" },
    "createdAt": { "bsonType": "date" },
    "ownerId": { "bsonType": "string" }
  }
}
```

### Invitation

```json
{
  "title": "Invitation",
  "bsonType": "object",
  "required": [
    "_id",
    "fromUserId",
    "fromUserName",
    "toPhone",
    "toName",
    "status",
    "ownerId"
  ],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "fromUserId": { "bsonType": "string" },
    "fromUserName": { "bsonType": "string" },
    "toPhone": { "bsonType": "string" },
    "toName": { "bsonType": "string" },
    "status": { "bsonType": "string" },
    "createdAt": { "bsonType": "date" },
    "respondedAt": { "bsonType": "date" },
    "message": { "bsonType": "string" },
    "ownerId": { "bsonType": "string" }
  }
}
```

### Balance

```json
{
  "title": "Balance",
  "bsonType": "object",
  "required": ["_id", "userId", "totalBalance", "ownerId"],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "userId": { "bsonType": "string" },
    "owes": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "odId": { "bsonType": "string" },
          "amount": { "bsonType": "double" }
        }
      }
    },
    "owedBy": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "odId": { "bsonType": "string" },
          "amount": { "bsonType": "double" }
        }
      }
    },
    "totalBalance": { "bsonType": "double" },
    "updatedAt": { "bsonType": "date" },
    "ownerId": { "bsonType": "string" }
  }
}
```

## Step 5: Enable Device Sync (Flexible Sync)

1. Go to **Device Sync** in the left sidebar
2. Select **Flexible Sync**
3. Choose your cluster and database name: `splitwise`
4. **Queryable Fields** — add:
   - `ownerId` (required for all collections)
   - `userId` (for User, Balance)
   - `expenseId` (for Expense)
   - `groupId` (for Group, Expense, Settlement)
   - `fromUserId`, `toUserId` (for Settlement)
   - `status` (for Invitation)
5. Click **Enable Sync**

## Step 6: Set Up Rules (Permissions)

Go to **Rules** → select each collection and set:

### Default Rule (for all collections)

```json
{
  "roles": [
    {
      "name": "owner-read-write",
      "apply_when": { "%%user.id": "%%root.ownerId" },
      "document_filters": {
        "read": true,
        "write": true
      },
      "read": true,
      "write": true,
      "insert": true,
      "delete": true
    }
  ]
}
```

This ensures each user can only read/write their own data.

## Step 7: Configure the App

Update [src/config/index.ts](src/config/index.ts):

```typescript
export const ATLAS_CONFIG = {
  APP_ID: "splitwise-app-XXXXX", // ← Replace with YOUR App ID
};
```

## Step 8: Install Dependencies & Run

```bash
cd splitwise
npm install
npx expo start
```

## How It Works

### Online Flow

1. User signs up/logs in → Atlas App Services creates auth session
2. Realm SDK opens a synced Realm with Flexible Sync subscriptions
3. All CRUD operations write to Realm → automatically synced to Atlas
4. Other devices with the same account see changes in real-time

### Offline Flow

1. User taps "Continue Offline" → opens a local-only Realm
2. All operations work normally against the local Realm
3. When user logs in later, data migrates to a synced Realm

### Data Sync

- Realm handles conflict resolution automatically (last-write-wins)
- Changes made offline are uploaded when connectivity returns
- Subscriptions filter data so each user only downloads their own data

## Collections in MongoDB Atlas

After setup, you'll see these collections in your Atlas database:

| Collection   | Purpose                                        |
| ------------ | ---------------------------------------------- |
| `User`       | User profiles (name, email, avatar)            |
| `Expense`    | All expenses with splits, categories, location |
| `Group`      | Groups with members and settings               |
| `Settlement` | Payment records between users                  |
| `Friendship` | Friend relationships                           |
| `Invitation` | Friend invitations (pending/accepted/declined) |
| `Balance`    | Cached balance calculations per user           |

## Troubleshooting

### "Atlas App not initialized"

- Ensure `ATLAS_CONFIG.APP_ID` matches your actual App Services App ID

### "No authenticated Atlas user"

- The user needs to log in first (email/password or anonymous)

### Sync not working

- Check that Device Sync is enabled in App Services
- Verify `ownerId` is a queryable field
- Check the App Services logs for sync errors

### "Realm is not open"

- Ensure `openRealm()` or `openLocalRealm()` is called after auth
