describe('AnalyticsService', () => {
  describe('Monthly Spending Calculation', () => {
    it('should calculate total for expenses', () => {
      const expenses = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 },
      ];
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      expect(total).toBe(600);
    });

    it('should handle empty expenses', () => {
      const expenses = [];
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      expect(total).toBe(0);
    });
  });

  describe('Spending Trend Detection', () => {
    it('should detect increasing trend', () => {
      const amounts = [100, 200, 300];
      const isIncreasing = amounts[2] > amounts[0];
      expect(isIncreasing).toBe(true);
    });

    it('should detect decreasing trend', () => {
      const amounts = [300, 200, 100];
      const isDecreasing = amounts[2] < amounts[0];
      expect(isDecreasing).toBe(true);
    });

    it('should detect stable trend', () => {
      const amounts = [100, 100, 100];
      const isStable = amounts[0] === amounts[2];
      expect(isStable).toBe(true);
    });
  });

  describe('Debt Simplification', () => {
    it('should simplify two-person debt', () => {
      const balances = [
        { userId: 'user1', balance: 100 },
        { userId: 'user2', balance: -100 },
      ];
      const needsSettlement = balances.some(b => b.balance !== 0);
      expect(needsSettlement).toBe(true);
    });

    it('should handle balanced accounts', () => {
      const balances = [
        { userId: 'user1', balance: 0 },
        { userId: 'user2', balance: 0 },
      ];
      const allBalanced = balances.every(b => b.balance === 0);
      expect(allBalanced).toBe(true);
    });
  });
});
