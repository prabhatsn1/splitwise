# Testing Guide - Splitwise App

## Overview

This document outlines the comprehensive testing strategy for the Splitwise expense sharing application, including unit tests, integration tests, component tests, and end-to-end (E2E) tests.

## Test Structure

```
__tests__/
├── services/           # Unit tests for business logic
├── components/         # Component rendering tests
├── context/           # State management integration tests
└── e2e/               # End-to-end user flow tests
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run E2E Tests
```bash
# Build the app first
npm run test:e2e:build

# Run E2E tests
npm run test:e2e
```

## Test Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Regression Test Plan

### 1. Authentication & User Management

#### Test Cases:
- ✅ User can sign up with email and name
- ✅ User can login with existing credentials
- ✅ User can continue in offline mode
- ✅ Biometric authentication works (Face ID/Fingerprint)
- ✅ User session persists after app restart
- ✅ User can logout successfully
- ✅ Network status indicator shows correct state

**Priority**: Critical
**Frequency**: Every release

### 2. Expense Management

#### Test Cases:
- ✅ Create expense with equal split
- ✅ Create expense with exact amounts
- ✅ Create expense with percentage split
- ✅ Create expense with share-based split
- ✅ Edit existing expense
- ✅ Delete expense
- ✅ Add receipt to expense (camera/gallery)
- ✅ OCR extracts total and merchant correctly
- ✅ Recurring expenses are created correctly
- ✅ Location is attached to expense
- ✅ Tags are added and filtered correctly
- ✅ Multi-currency expenses work
- ✅ Expense validation prevents invalid data

**Priority**: Critical
**Frequency**: Every release

### 3. Group Management

#### Test Cases:
- ✅ Create new group with members
- ✅ Edit group details
- ✅ Add members to existing group
- ✅ Remove members from group
- ✅ Delete group
- ✅ View group expenses
- ✅ Group analytics display correctly
- ✅ Debt simplification works in groups

**Priority**: High
**Frequency**: Every release

### 4. Settlement & Balances

#### Test Cases:
- ✅ Record payment between users
- ✅ Settle up with suggested amount
- ✅ All payment methods work (Cash, UPI, Bank, Card, Other)
- ✅ Balance calculations are accurate
- ✅ Friend balances update after expense
- ✅ Group balances update correctly
- ✅ Settlement history displays correctly

**Priority**: Critical
**Frequency**: Every release

### 5. Analytics & Insights

#### Test Cases:
- ✅ Monthly spending chart displays correctly
- ✅ Category breakdown is accurate
- ✅ Year-over-year comparison works
- ✅ Spending trend detection is correct
- ✅ Friend ranking displays top spenders
- ✅ Group analytics show correct data
- ✅ Debt simplification algorithm works

**Priority**: High
**Frequency**: Major releases

### 6. Offline Functionality

#### Test Cases:
- ✅ Create expense offline
- ✅ Edit expense offline
- ✅ Delete expense offline
- ✅ Create group offline
- ✅ Sync queue stores mutations
- ✅ Auto-sync on reconnection
- ✅ Reference migration after sync
- ✅ Conflict resolution works

**Priority**: Critical
**Frequency**: Every release

### 7. Data Export

#### Test Cases:
- ✅ Export data as CSV
- ✅ Export data as PDF
- ✅ CSV contains all expense data
- ✅ PDF is properly formatted
- ✅ Share functionality works
- ✅ Date filtering in exports

**Priority**: Medium
**Frequency**: Major releases

### 8. Notifications

#### Test Cases:
- ✅ Push notification permissions requested
- ✅ New expense notification sent
- ✅ Settlement notification sent
- ✅ Recurring expense reminder scheduled
- ✅ Notification tap opens correct screen

**Priority**: Medium
**Frequency**: Major releases

### 9. Theme & UI

#### Test Cases:
- ✅ Light theme displays correctly
- ✅ Dark theme displays correctly
- ✅ System theme follows device setting
- ✅ Theme preference persists
- ✅ All screens respect theme
- ✅ Color contrast is accessible

**Priority**: Low
**Frequency**: Major releases

### 10. Currency & Localization

#### Test Cases:
- ✅ All 12 currencies supported
- ✅ Currency conversion is accurate
- ✅ Live exchange rates fetched
- ✅ Offline fallback rates work
- ✅ Currency symbols display correctly
- ✅ Decimal formatting is correct

**Priority**: High
**Frequency**: Major releases

## Automated Test Suites

### Unit Tests (Services)

**Files Tested:**
- `currencyService.test.ts` - Currency conversion and formatting
- `analyticsService.test.ts` - Analytics calculations and trends
- `expenseService.test.ts` - Expense validation and split calculations

**Coverage**: Business logic, edge cases, error handling

### Integration Tests (Context)

**Files Tested:**
- `AppContext.test.tsx` - State management and actions

**Coverage**: State updates, optimistic UI, error handling

### Component Tests

**Files Tested:**
- `CategoryPieChart.test.tsx` - Chart rendering and data display
- `MonthlySpendingChart.test.tsx` - Chart rendering and calculations

**Coverage**: Rendering, props, empty states

### E2E Tests

**Files Tested:**
- `expenseFlow.e2e.ts` - Complete user flows

**Coverage**: Login, expense creation, groups, settlements, analytics, export

## Manual Testing Checklist

### Pre-Release Testing

- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test on different screen sizes
- [ ] Test with slow network
- [ ] Test with no network (offline mode)
- [ ] Test with different currencies
- [ ] Test biometric authentication
- [ ] Test camera permissions
- [ ] Test location permissions
- [ ] Test notification permissions
- [ ] Test data export (CSV/PDF)
- [ ] Test theme switching
- [ ] Verify no console errors
- [ ] Check memory leaks
- [ ] Test app performance

### Smoke Tests (Quick Validation)

1. Login/Signup works
2. Create expense works
3. View expenses works
4. Create group works
5. Settle up works
6. Analytics display
7. Export works

**Time**: ~10 minutes
**Frequency**: Every build

## Performance Testing

### Metrics to Monitor:
- App launch time < 3 seconds
- Screen navigation < 500ms
- Expense creation < 1 second
- Sync queue processing < 5 seconds
- Chart rendering < 1 second
- Memory usage < 200MB

### Tools:
- React Native Performance Monitor
- Flipper
- Chrome DevTools

## Security Testing

### Checklist:
- [ ] No credentials in code
- [ ] API keys in environment variables
- [ ] Biometric data handled securely
- [ ] Local storage encrypted
- [ ] Network requests use HTTPS
- [ ] Input validation prevents injection
- [ ] Error messages don't leak sensitive data

## Continuous Integration

### GitHub Actions Workflow (Recommended)

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Bug Reporting Template

```markdown
**Bug Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Device: [iOS/Android]
- OS Version: [e.g., iOS 17.0]
- App Version: [e.g., 1.0.0]
- Network: [Online/Offline]

**Screenshots:**
[If applicable]

**Logs:**
[Console errors or relevant logs]
```

## Test Data Setup

### Mock Users
```javascript
const testUsers = [
  { email: 'user1@test.com', name: 'Test User 1' },
  { email: 'user2@test.com', name: 'Test User 2' },
  { email: 'user3@test.com', name: 'Test User 3' },
];
```

### Mock Expenses
```javascript
const testExpenses = [
  { description: 'Lunch', amount: 50, category: 'Food' },
  { description: 'Taxi', amount: 20, category: 'Transport' },
  { description: 'Movie', amount: 30, category: 'Entertainment' },
];
```

## Troubleshooting Tests

### Common Issues:

**Tests timing out:**
- Increase timeout in jest.setup.js
- Check for unresolved promises

**Mock not working:**
- Verify mock path matches actual import
- Clear jest cache: `jest --clearCache`

**E2E tests failing:**
- Rebuild app: `npm run test:e2e:build`
- Check device/emulator is running
- Verify test IDs in components

**Coverage not meeting threshold:**
- Add tests for uncovered branches
- Remove dead code
- Update coverage thresholds

## Best Practices

1. **Write tests first** (TDD approach when possible)
2. **Keep tests isolated** (no dependencies between tests)
3. **Use descriptive test names** (describe what is being tested)
4. **Test edge cases** (empty data, null values, errors)
5. **Mock external dependencies** (API calls, storage, permissions)
6. **Keep tests fast** (unit tests < 100ms, integration < 1s)
7. **Update tests with code changes** (maintain test coverage)
8. **Review test failures** (don't ignore failing tests)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2026
**Maintained By**: Development Team
