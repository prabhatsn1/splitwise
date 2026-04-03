# Quick Start - Testing Setup

## Installation

```bash
npm install
```

This will install all testing dependencies including:
- Jest (test runner)
- React Native Testing Library (component testing)
- Detox (E2E testing)

## Run Tests

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Build app for testing
npm run test:e2e:build

# Run E2E tests
npm run test:e2e
```

## Test Structure

```
__tests__/
├── services/          # Business logic tests
│   ├── currencyService.test.ts
│   ├── analyticsService.test.ts
│   ├── expenseService.test.ts
│   └── syncQueueService.test.ts
├── components/        # UI component tests
│   ├── CategoryPieChart.test.tsx
│   └── MonthlySpendingChart.test.tsx
├── context/          # State management tests
│   └── AppContext.test.tsx
├── e2e/              # End-to-end tests
│   └── expenseFlow.e2e.ts
└── testUtils.ts      # Test helpers
```

## Coverage Goals

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Key Test Files

### Services (Unit Tests)
- **currencyService.test.ts**: Currency conversion, formatting, multi-currency
- **analyticsService.test.ts**: Spending trends, debt simplification, monthly calculations
- **expenseService.test.ts**: Split calculations (equal, exact, percentage, shares), validation
- **syncQueueService.test.ts**: Offline queue, sync processing, retry logic

### Components (Component Tests)
- **CategoryPieChart.test.tsx**: Chart rendering, data display, empty states
- **MonthlySpendingChart.test.tsx**: Monthly data visualization, calculations

### Context (Integration Tests)
- **AppContext.test.tsx**: State management, actions, optimistic updates

### E2E (End-to-End Tests)
- **expenseFlow.e2e.ts**: Complete user flows (login, create expense, groups, settlements)

## Regression Testing

See [TESTING.md](./TESTING.md) for comprehensive regression test plan covering:
- Authentication & User Management
- Expense Management (CRUD, splits, receipts, OCR)
- Group Management
- Settlement & Balances
- Analytics & Insights
- Offline Functionality
- Data Export
- Notifications
- Theme & UI
- Currency & Localization

## CI/CD

GitHub Actions workflow automatically runs tests on:
- Every push to main/develop
- Every pull request
- Multiple Node.js versions (18.x, 20.x)

See `.github/workflows/test.yml`

## Quick Smoke Test

Run these manual tests before each release:

1. ✅ Login/Signup
2. ✅ Create expense
3. ✅ View expenses
4. ✅ Create group
5. ✅ Settle up
6. ✅ View analytics
7. ✅ Export data

**Time**: ~10 minutes

## Troubleshooting

**Tests failing?**
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**E2E tests not running?**
```bash
# Rebuild the app
npm run test:e2e:build

# Check emulator/simulator is running
```

## Next Steps

1. Run `npm test` to verify setup
2. Review [TESTING.md](./TESTING.md) for detailed documentation
3. Add test IDs to components for E2E testing
4. Set up CI/CD pipeline with GitHub Actions

---

**Happy Testing! 🧪**
