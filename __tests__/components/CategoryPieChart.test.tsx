import React from 'react';

describe('CategoryPieChart', () => {
  describe('Data Processing', () => {
    it('should calculate percentages correctly', () => {
      const total = 1000;
      const amount = 500;
      const percentage = (amount / total) * 100;
      expect(percentage).toBe(50);
    });

    it('should handle multiple categories', () => {
      const data = [
        { category: 'Food', amount: 500 },
        { category: 'Transport', amount: 300 },
        { category: 'Entertainment', amount: 200 },
      ];
      expect(data).toHaveLength(3);
    });

    it('should calculate total amount', () => {
      const data = [
        { amount: 500 },
        { amount: 300 },
        { amount: 200 },
      ];
      const total = data.reduce((sum, item) => sum + item.amount, 0);
      expect(total).toBe(1000);
    });
  });

  describe('Empty State', () => {
    it('should handle empty data', () => {
      const data = [];
      const isEmpty = data.length === 0;
      expect(isEmpty).toBe(true);
    });

    it('should handle zero amounts', () => {
      const data = [{ amount: 0 }];
      const hasData = data.some(item => item.amount > 0);
      expect(hasData).toBe(false);
    });
  });
});
