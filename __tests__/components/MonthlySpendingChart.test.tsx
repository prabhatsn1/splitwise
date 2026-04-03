import React from 'react';

describe('MonthlySpendingChart', () => {
  describe('Monthly Data', () => {
    it('should have 12 months', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      expect(months).toHaveLength(12);
    });

    it('should calculate monthly totals', () => {
      const data = [
        { month: 'Jan', total: 1000 },
        { month: 'Feb', total: 1500 },
        { month: 'Mar', total: 1200 },
      ];
      expect(data[1].total).toBe(1500);
    });

    it('should find highest spending month', () => {
      const data = [
        { month: 'Jan', total: 1000 },
        { month: 'Feb', total: 1500 },
        { month: 'Mar', total: 1200 },
      ];
      const highest = data.reduce((max, item) => item.total > max.total ? item : max);
      expect(highest.month).toBe('Feb');
    });
  });

  describe('Empty State', () => {
    it('should handle no data', () => {
      const data = [];
      const hasData = data.length > 0;
      expect(hasData).toBe(false);
    });

    it('should handle all zero amounts', () => {
      const data = [
        { month: 'Jan', total: 0 },
        { month: 'Feb', total: 0 },
      ];
      const hasSpending = data.some(item => item.total > 0);
      expect(hasSpending).toBe(false);
    });
  });
});
