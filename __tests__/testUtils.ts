export const mockUsers = [
  { _id: 'user1', name: 'Alice Johnson', email: 'alice@test.com' },
  { _id: 'user2', name: 'Bob Smith', email: 'bob@test.com' },
  { _id: 'user3', name: 'Charlie Brown', email: 'charlie@test.com' },
];

export const mockExpenses = [
  {
    _id: 'exp1',
    description: 'Lunch at Restaurant',
    amount: 150,
    paidBy: mockUsers[0],
    splitBetween: mockUsers,
    category: 'Food',
    date: new Date('2024-01-15'),
  },
  {
    _id: 'exp2',
    description: 'Taxi Ride',
    amount: 30,
    paidBy: mockUsers[1],
    splitBetween: [mockUsers[0], mockUsers[1]],
    category: 'Transport',
    date: new Date('2024-01-20'),
  },
];

export const mockGroups = [
  {
    _id: 'group1',
    name: 'Roommates',
    description: 'Apartment expenses',
    members: [mockUsers[0], mockUsers[1]],
    createdBy: 'user1',
    createdAt: new Date('2024-01-01'),
  },
];

export const createMockExpense = (overrides = {}) => ({
  _id: `exp_${Date.now()}`,
  description: 'Test Expense',
  amount: 100,
  paidBy: mockUsers[0],
  splitBetween: [mockUsers[0], mockUsers[1]],
  category: 'Other',
  date: new Date(),
  ...overrides,
});

export const createMockGroup = (overrides = {}) => ({
  _id: `group_${Date.now()}`,
  name: 'Test Group',
  description: 'Test Description',
  members: [mockUsers[0], mockUsers[1]],
  createdBy: 'user1',
  createdAt: new Date(),
  ...overrides,
});

export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
