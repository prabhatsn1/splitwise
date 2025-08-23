# Splitwise - Expense Sharing App

A React Native expense sharing application built with Expo, featuring MongoDB integration for dynamic, user-specific data management.

## Features

- **Dynamic Data Management**: All data is stored in MongoDB and user-specific
- **User Management**: Create and manage user accounts
- **Group Management**: Create groups and add friends
- **Expense Tracking**: Add, view, and manage expenses with filtering
- **Smart Balance Calculation**: Automatic balance calculation between users
- **Real-time Updates**: All changes are synchronized with the database
- **Modern UI**: Clean, intuitive interface with custom styling system
- **TypeScript Support**: Full type safety throughout the application

## Tech Stack

- **Frontend**: React Native 0.79.5 with Expo 53
- **Database**: MongoDB with native driver
- **State Management**: React Context API with useReducer
- **Navigation**: React Navigation 7 (Stack + Bottom Tabs)
- **UI**: Custom styling system with Expo Vector Icons
- **Language**: TypeScript with strict mode
- **Build Tools**: Expo CLI with New Architecture enabled

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
│   └── LoadingScreen.tsx         # Loading and error states component
├── config/
│   └── index.ts                  # App and database configuration
├── context/
│   └── AppContext.tsx            # Global state management with Context API
├── screens/
│   ├── DashboardScreen.tsx       # Main dashboard with balance overview
│   ├── AddExpenseScreen.tsx      # Add new expenses with group selection
│   ├── CreateGroupScreen.tsx     # Create new groups with member selection
│   ├── ExpensesScreen.tsx        # View and filter all expenses
│   ├── GroupsScreen.tsx          # Manage groups and view group details
│   ├── FriendsScreen.tsx         # Manage friends and view balances
│   └── AccountScreen.tsx         # User profile and account statistics
├── services/
│   ├── database.ts               # MongoDB connection service (Singleton)
│   ├── userService.ts            # User CRUD operations
│   ├── groupService.ts           # Group CRUD operations
│   └── expenseService.ts         # Expense CRUD operations
├── styles/
│   ├── common/
│   │   ├── colors.ts             # Color palette and theme
│   │   ├── typography.ts         # Font sizes, weights, and line heights
│   │   ├── shadows.ts            # Shadow presets for elevation
│   │   └── spacing.ts            # Spacing and border radius constants
│   ├── screens/                  # Screen-specific styles
│   └── index.ts                  # Style exports
├── types/
│   └── index.ts                  # TypeScript type definitions
└── utils/                        # Utility functions
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

### 1. **Dynamic User Management**

- Automatic demo user creation for testing
- User-specific data loading and filtering
- Friend management system with email-based addition

### 2. **Advanced Group Management**

- Create groups with multiple members
- Group-specific expense tracking
- Member management and group settings
- Debt simplification options

### 3. **Comprehensive Expense Tracking**

- Add expenses with group or personal categorization
- Multiple split types (equal split implemented)
- Expense filtering (All, You paid, You owe)
- Delete expenses with balance recalculation

### 4. **Smart Balance Calculations**

- Real-time balance updates after expense changes
- Individual friend balances
- Group-specific balance tracking
- Net balance calculations across all expenses

### 5. **Modern UI/UX**

- Custom styling system with consistent design tokens
- Responsive layout with proper spacing and typography
- Icon-based navigation with Expo Vector Icons
- Loading states and error handling
- Empty states with helpful messaging

## Custom Styling System

The app uses a comprehensive styling system located in `src/styles/`:

- **Colors**: Consistent color palette with primary, secondary, and semantic colors
- **Typography**: Standardized font sizes, weights, and line heights
- **Shadows**: Predefined shadow presets for elevation (sm, md, lg, xl)
- **Spacing**: Consistent spacing scale and border radius values

## Usage Guide

### Adding Expenses

1. Navigate to Dashboard or Expenses tab
2. Tap the "+" floating action button
3. Enter expense description and amount
4. Choose between Personal or Group expense
5. Select who paid for the expense
6. Choose who to split the expense between
7. Review the split preview and save

### Creating Groups

1. Go to Groups tab
2. Tap the "+" floating action button
3. Enter group name and optional description
4. Select friends to add to the group
5. Configure group settings (debt simplification)
6. Review group preview and create

### Managing Friends

1. Go to Friends tab
2. Tap the "+" floating action button
3. Enter friend's name and email
4. Add friend to your contacts
5. View individual balances with each friend

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

- **Services**: Business logic and database operations
- **Context**: Global state management with typed actions
- **Components**: Reusable UI components
- **Screens**: Feature-specific screen components
- **Types**: Centralized type definitions

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
