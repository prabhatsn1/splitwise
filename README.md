# Splitwise - Expense Sharing App

A full-featured React Native expense sharing application built with Expo, featuring MongoDB integration, offline-first architecture, analytics, OCR receipt scanning, multi-currency support, and much more.

## Features

- **Offline-First Architecture**: Full local storage with automatic sync queue and background reconnection
- **Authentication**: Email login/signup, offline mode, biometric authentication (Face ID, Fingerprint, Iris)
- **Expense Management**: Full CRUD with equal, exact, percentage, and share-based splits
- **Recurring Expenses**: Weekly, monthly, or yearly recurring expenses with automatic scheduling
- **Receipt Scanning**: Camera-based OCR receipt scanning with auto-extraction of totals and merchants
- **Multi-Currency**: 12 supported currencies with live exchange rates and offline fallback
- **Group Management**: Create groups, manage members, track group-specific expenses
- **Debt Simplification**: Greedy algorithm minimizes number of payments with visual flow diagrams
- **Settlement Tracking**: Record payments via Cash, UPI, Bank Transfer, Card, or Other
- **Analytics & Insights**: Monthly spending charts, category breakdowns, friend rankings, spending trends, year-over-year comparison
- **Group Analytics**: Group spending summaries, member breakdowns, category analysis
- **Data Export**: CSV and styled PDF export with sharing support
- **Push Notifications**: New expense alerts, settlement notifications, recurring expense reminders
- **Dark Mode**: Light, Dark, and System theme modes with 23 semantic color tokens
- **Network-Aware**: Real-time connectivity monitoring with automatic retry on reconnection
- **Location-Aware Expenses**: Attach GPS coordinates and query expenses by geographic radius
- **TypeScript Support**: Full type safety with strict mode throughout the application

## Tech Stack

- **Frontend**: React Native 0.79.5 with Expo 53
- **Database**: MongoDB with native driver + AsyncStorage for offline persistence
- **State Management**: React Context API with useReducer (22 action types)
- **Navigation**: React Navigation 7 (Stack + Bottom Tabs, 8 stack routes, 6 tabs)
- **Camera & OCR**: expo-camera + OCR.space API for receipt scanning
- **Authentication**: expo-local-authentication for biometrics
- **Notifications**: expo-notifications with local push notifications
- **Export**: expo-print (PDF) + expo-sharing (CSV/PDF sharing)
- **Offline Storage**: @react-native-async-storage/async-storage + Realm
- **UI**: Custom styling system with Expo Vector Icons and theming
- **Language**: TypeScript with strict mode
- **Build Tools**: Expo CLI with EAS Build support

## Prerequisites

Before running this application, make sure you have:

- Node.js (v16 or higher recommended)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- MongoDB (local installation or MongoDB Atlas account)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd splitwise
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure MongoDB Connection**

   Edit `src/config/index.ts` and update the `MONGODB_URI` if needed:

   ```typescript
   export const DATABASE_CONFIG = {
     // For local development
     MONGODB_URI: "mongodb://localhost:27017/splitwise",

     // For production with MongoDB Atlas:
     // MONGODB_URI: "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/splitwise?retryWrites=true&w=majority",

     DB_NAME: "splitwise",
     COLLECTIONS: {
       USERS: "users",
       GROUPS: "groups",
       EXPENSES: "expenses",
       BALANCES: "balances",
     },
   };
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser

## Database Setup

### Option 1: Local MongoDB

1. Install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:

   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community

   # On Windows/Linux
   mongod
   ```

3. The app will connect to `mongodb://localhost:27017/splitwise` by default

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update the `MONGODB_URI` in `src/config/index.ts`

## Application Architecture

### Project Structure

```
src/
├── components/
│   ├── CategoryPieChart.tsx         # Horizontal bar chart for category breakdown
│   ├── DebtSimplificationView.tsx   # Visual flow diagram for simplified debts
│   ├── LoadingScreen.tsx            # Loading and error states component
│   ├── MonthlySpendingChart.tsx     # Vertical bar chart for monthly spending
│   ├── ReceiptCamera.tsx            # Full-screen camera for receipt scanning
│   ├── SpendingTrendsCard.tsx       # Spending trend detection with advice
│   └── YearOverYearChart.tsx        # Year-over-year comparison chart
├── config/
│   └── index.ts                     # App, database, and API configuration
├── context/
│   ├── AppContext.tsx               # Global state management with Context API
│   ├── authActions.ts               # Authentication actions (login, signup, offline)
│   ├── dataActions.ts               # Data CRUD actions with optimistic updates
│   ├── reducer.ts                   # State reducer with 22 action types
│   ├── ThemeContext.tsx              # Theme provider (Light/Dark/System)
│   └── types.ts                     # State and action type definitions
├── hooks/
│   └── useNetworkAwareAuth.ts       # Network-aware authentication hook
├── screens/
│   ├── AccountScreen.tsx            # User profile and account statistics
│   ├── AddExpenseScreen.tsx         # Add/edit expenses with split options
│   ├── AnalyticsScreen.tsx          # Personal spending analytics dashboard
│   ├── CreateGroupScreen.tsx        # Create groups with member selection
│   ├── DashboardScreen.tsx          # Main dashboard with balance overview
│   ├── ExpenseDetailsScreen.tsx     # Expense detail view with inline editing
│   ├── ExpensesScreen.tsx           # Expense list with filtering
│   ├── FriendsScreen.tsx            # Friend management and balances
│   ├── GroupAnalyticsScreen.tsx     # Group-specific analytics and debt simplification
│   ├── GroupDetailsScreen.tsx       # Group details and member management
│   ├── GroupsScreen.tsx             # Group list and management
│   ├── LoginScreen.tsx              # Login/signup with offline mode
│   └── SettleUpScreen.tsx           # Payment recording and settlement
├── services/
│   ├── analyticsService.ts          # Spending analytics and trend detection
│   ├── biometricService.ts          # Face ID / Fingerprint / Iris authentication
│   ├── currencyService.ts           # Multi-currency conversion with live rates
│   ├── database.ts                  # MongoDB connection service (Singleton)
│   ├── expenseService.ts            # Expense CRUD operations
│   ├── exportService.ts             # CSV and PDF export with sharing
│   ├── groupService.ts              # Group CRUD operations
│   ├── localStorageService.ts       # AsyncStorage persistence layer
│   ├── networkService.ts            # Connectivity monitoring service
│   ├── notificationService.ts       # Push notification management
│   ├── ocrService.ts                # OCR receipt text extraction
│   ├── syncQueueService.ts          # Offline mutation queue with retry
│   └── userService.ts               # User CRUD operations
├── styles/
│   ├── common/
│   │   ├── colors.ts                # Color palette and theme
│   │   ├── typography.ts            # Font sizes, weights, and line heights
│   │   ├── shadows.ts               # Shadow presets for elevation
│   │   └── spacing.ts               # Spacing and border radius constants
│   ├── components/                  # Component-specific styles
│   ├── screens/                     # Screen-specific styles
│   └── index.ts                     # Style exports
└── types/
    └── index.ts                     # TypeScript type definitions
```

### Key Dependencies

```json
{
  "expo": "~53.0.20",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "@react-navigation/native": "^7.1.17",
  "@react-navigation/bottom-tabs": "^7.4.6",
  "@react-navigation/stack": "^7.4.7",
  "mongodb": "^6.18.0",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "expo-camera": "^16.1.11",
  "expo-local-authentication": "~16.0.5",
  "expo-notifications": "~0.31.5",
  "expo-print": "~14.1.4",
  "expo-sharing": "~13.1.5",
  "expo-image-picker": "^16.1.4",
  "expo-location": "^18.1.6",
  "expo-file-system": "~18.1.11",
  "realm": "^20.2.0",
  "@expo/vector-icons": "^14.1.0",
  "react-native-reanimated": "~3.17.4",
  "typescript": "~5.8.3"
}
```

## Database Schema

The application uses the following MongoDB collections:

### Users Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  avatar?: String
}
```

### Groups Collection

```javascript
{
  _id: ObjectId,
  name: String,
  description?: String,
  members: [User],
  createdBy: String,
  createdAt: Date,
  simplifyDebts: Boolean
}
```

### Expenses Collection

```javascript
{
  _id: ObjectId,
  description: String,
  amount: Number,
  paidBy: User,
  splitBetween: [User],
  splitType: "equal" | "exact" | "percentage",
  splits: [{
    userId: String,
    amount: Number,
    percentage?: Number
  }],
  category: String,
  date: Date,
  groupId?: String,
  receipt?: String
}
```

## Features Implemented

### 1. **Authentication & Security**

- Email-based login and signup with toggle between modes
- **Offline-first login** — "Continue Offline" creates a local-only user
- **Biometric authentication** — Face ID, Fingerprint, and Iris support via `expo-local-authentication`
  - Hardware availability detection with human-readable labels
  - Enable/disable preference persisted in AsyncStorage
  - Customizable prompt with passcode fallback
- **Network-aware auth** — real-time connectivity indicator (online/offline/checking)
- Automatic retry on reconnection with retry count tracking (max 3)
- Typed error handling with `NetworkError` class (`network`, `auth`, `validation`, `sync`, `general`)

### 2. **Advanced Expense Management**

- Full CRUD with **optimistic UI updates** — expenses appear instantly with temp IDs, swapped after backend confirmation, rolled back on failure
- **4 split types**: Equal, Exact amounts, Percentage, Shares
- **7 categories**: Food, Transport, Entertainment, Bills, Shopping, Travel, Other (with mapped icons)
- **Recurring expenses** — weekly, monthly, yearly frequency with optional end date; bulk creation of future instances
- **Location-aware expenses** — attach GPS coordinates and address; query by geographic radius (Haversine formula)
- **Expense tagging** — arbitrary tags with tag-based filtering
- **Receipt attachment** — base64 image or file path stored per expense
- **Multi-currency** — each expense can have its own currency code
- **Inline editing** — edit description, amount, and category from the detail screen
- Split breakdown view with participant avatars

### 3. **OCR Receipt Scanning**

- Full-screen camera modal with front/back toggle and flash modes (off/on/auto)
- Receipt alignment guide overlay for optimal positioning
- Image preview with retake/confirm workflow
- Gallery picker alternative via `expo-image-picker`
- Permission handling with prompt UI
- OCR processing via OCR.space API (Engine 2)
- Smart total extraction with priority keyword matching (`grand total`, `total`, `amount due`, etc.)
- Fallback to largest currency amount in text
- Merchant/description extraction from first meaningful text line
- Confidence score and raw OCR text output

### 4. **Multi-Currency Support**

- **12 supported currencies**: INR, USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, SGD, AED, THB
- Live exchange rates fetched from API with 6-hour cache
- Offline fallback with hardcoded approximate rates relative to INR
- Currency conversion between any two supported currencies via INR intermediary
- Symbol-prefixed display with 2 decimal places

### 5. **Group Management**

- Create groups with name, description, and member selection
- **Debt simplification toggle** per group
- Group-specific expense tracking and balances
- Member management and group settings
- Offline group creation with sync queue fallback

### 6. **Settlement / Settle Up**

- Record payments between users with custom or suggested amounts
- Auto-populated settlement amount based on current net balance
- **5 payment methods**: Cash, UPI, Bank Transfer, Card, Other
- Optional notes on settlements
- Direction-aware balance display ("X owes you" / "You owe X")
- Local push notification on payment recorded

### 7. **Analytics & Insights**

#### Personal Analytics
- **Monthly spending** — bar chart of last 12 months
- **Category breakdown** — horizontal bar chart with percentages and amounts
- **Friend spending ranking** — top 5 friends by shared expense volume
- **Average expense amount** and most expensive expense highlight
- **Spending trend detection** — classifies 3-month trend as increasing, decreasing, or stable with contextual financial advice
- **Year-over-year comparison** — side-by-side bar chart (current vs. previous year) with percentage change summary

#### Group Analytics
- Group summary cards (expense count, total spend, average)
- Group monthly spending charts
- Group category breakdown
- **Member spending breakdown** — per member: total paid, total share, net balance
- **Debt simplification** — greedy algorithm minimizes number of payments with visual flow diagram (from→to arrows with amounts)

### 8. **Data Visualization Components**

- **CategoryPieChart** — color-coded horizontal bar chart with amounts, percentages, and total
- **MonthlySpendingChart** — vertical bar chart with Y-axis labels and per-bar amounts
- **YearOverYearChart** — paired vertical bars (current vs. previous year) with legend, totals, and % change
- **SpendingTrendsCard** — icon + text card with contextual advice based on trend direction
- **DebtSimplificationView** — visual flow diagram with user avatars, colored directional arrows, amount badges, and "all settled" empty state

### 9. **Export & Reporting**

- **CSV export** — date-sorted with columns: Date, Description, Amount, Currency, Category, Paid By, Group, Split Type, Tags; proper CSV escaping
- **PDF export** — styled HTML-to-PDF via `expo-print` with:
  - User-personalized header
  - Summary cards (total expenses, total amount)
  - Full expense table with HTML escaping
  - Branded Splitwise green theme styling
- Both formats shared via system share sheet with correct MIME types

### 10. **Push Notifications**

- Push notification registration with Expo push tokens and permission handling
- Android notification channel with custom vibration pattern and brand color
- Foreground notification display (alert, sound, badge)
- **Notification types**: New expense added, settlement recorded, recurring expense reminder (scheduled)
- Cancel individual or all scheduled notifications
- Badge count control (iOS)
- Notification tap response listeners

### 11. **Offline-First Architecture**

#### Local Storage
- Full data persistence — user, groups, expenses, friends, balances, last sync date via AsyncStorage
- Complete CRUD operations for all entity types locally
- Offline user creation with timestamped unique IDs
- **Reference migration** — updates friend/group IDs across all related data when syncing offline→online
- Synced data cleanup — removes items with `offline_` prefix after successful sync

#### Sync Queue
- Persisted queue of offline mutations (CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, CREATE_GROUP, ADD_FRIEND, SETTLE_UP)
- FIFO processing with retry logic (max 3 retries per item)
- **Auto-flush on reconnection** — network listener triggers automatic queue processing
- Progress tracking with `SyncProgress` updates (total, completed, failed, status)
- Manual flush API with connectivity check

#### Network Service
- Periodic connectivity polling every 30 seconds via Google favicon ping
- 5-second timeout on connectivity checks
- Event-driven listener-based status change notifications
- On-demand connectivity check API

### 12. **Theming**

- **3 theme modes**: Light, Dark, System (follows device setting)
- **23 semantic color tokens** per theme — primary, secondary, success, error, warning, text variants, backgrounds, borders, card, header, tab bar, etc.
- Persisted preference in AsyncStorage, restored on app launch
- React Context with `useTheme()` hook exposing `colors`, `isDark`, `themeMode`, `setThemeMode`

### 13. **Smart Balance Calculations**

- Real-time balance updates after expense changes
- Individual friend balances
- Group-specific balance tracking
- Net balance calculations across all expenses

### 14. **Modern UI/UX**

- Custom styling system with consistent design tokens
- Responsive layout with proper spacing and typography
- Icon-based navigation with Expo Vector Icons
- Loading states and error handling
- Empty states with helpful messaging
- Optimistic UI updates for instant feedback

## Custom Styling System

The app uses a comprehensive styling system located in `src/styles/`:

- **Colors**: Consistent color palette with primary, secondary, and semantic colors
- **Typography**: Standardized font sizes, weights, and line heights
- **Shadows**: Predefined shadow presets for elevation (sm, md, lg, xl)
- **Spacing**: Consistent spacing scale and border radius values

## Usage Guide

### Logging In

1. Open the app and enter your name and email
2. Tap **Login** or **Sign Up** depending on your status
3. Alternatively, tap **Continue Offline** to use the app without a network connection
4. Enable biometric login (Face ID / Fingerprint) from Account settings

### Adding Expenses

1. Navigate to Dashboard or Expenses tab
2. Tap the "+" floating action button
3. Enter expense description and amount
4. Choose between Personal or Group expense
5. Select who paid for the expense
6. Choose who to split the expense between
7. Select split type (Equal, Exact, Percentage, or Shares)
8. Optionally: add tags, select currency, attach receipt, set as recurring
9. Review the split preview and save

### Scanning a Receipt

1. Tap the camera icon when adding an expense
2. Grant camera permission when prompted
3. Align the receipt within the guide overlay
4. Toggle flash (off/on/auto) or switch camera if needed
5. Capture the receipt or pick from gallery
6. Preview and confirm — the total and merchant are auto-extracted via OCR

### Creating Groups

1. Go to Groups tab
2. Tap the "+" floating action button
3. Enter group name and optional description
4. Select friends to add to the group
5. Configure group settings (debt simplification)
6. Review group preview and create

### Settling Up

1. Navigate to a friend's balance or group details
2. Tap **Settle Up**
3. The owed amount is auto-populated
4. Select payment method (Cash, UPI, Bank Transfer, Card, Other)
5. Add an optional note and confirm

### Viewing Analytics

1. Go to the **Analytics** tab for personal insights
2. View monthly spending charts, category breakdowns, and spending trends
3. Check year-over-year comparisons
4. From a group, tap **Group Analytics** for group-specific insights and debt simplification view

### Exporting Data

1. Go to the **Account** tab
2. Tap **Export as CSV** or **Export as PDF**
3. A share sheet opens to save or send the file

### Managing Friends

1. Go to Friends tab
2. Tap the "+" floating action button
3. Enter friend's name and email
4. Add friend to your contacts
5. View individual balances with each friend

### Changing Theme

1. Go to the **Account** tab
2. Select **Light**, **Dark**, or **System** theme mode
3. The preference is saved and restored on next launch

### Viewing Balances

1. Dashboard shows overall balance summary
2. Account tab displays detailed balance breakdown
3. Friends tab shows individual friend balances
4. Groups tab shows group-specific balances

## Development

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start on Android emulator
- `npm run ios` - Start on iOS simulator
- `npm run web` - Start on web browser

### TypeScript Configuration

The project uses strict TypeScript with:

- Strict mode enabled for better type safety
- Custom type definitions for Expo Vector Icons
- Comprehensive interfaces for all data models
- Proper typing for navigation and routes

### Code Structure

- **Services**: Business logic, database operations, analytics, OCR, notifications, sync, export
- **Context**: Global state management with typed actions, auth actions, data actions, theme provider
- **Hooks**: Custom hooks for network-aware authentication
- **Components**: Reusable UI and data visualization components (charts, camera, debt views)
- **Screens**: Feature-specific screen components (14 screens)
- **Types**: Centralized type definitions for all data models and navigation

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running locally or Atlas cluster is accessible
- Check network connectivity and firewall settings
- Verify connection string format and credentials

### App Not Loading

- Check if all dependencies are installed (`npm install`)
- Clear Expo cache: `expo start -c`
- Ensure MongoDB is running and accessible

### TypeScript Errors

- Run `npm run typecheck` to verify TypeScript compilation
- Check that all required dependencies are installed
- Verify import paths and type definitions

### Data Not Syncing

- Check MongoDB connection in app logs
- Verify proper error handling in service calls
- Ensure user authentication state is properly managed

## Environment Variables

For production deployment, set these environment variables:

```bash
MONGODB_URI=your-production-mongodb-uri
NODE_ENV=production
```

## Deployment

### Expo Build

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Build for web
expo build:web
```

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform all
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ using React Native and Expo**
