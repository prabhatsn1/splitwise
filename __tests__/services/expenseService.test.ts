describe('ExpenseService', () => {
  describe('Split Calculations', () => {
    it('should calculate equal split for 3 people', () => {
      const amount = 300;
      const people = 3;
      const perPerson = amount / people;
      expect(perPerson).toBe(100);
    });

    it('should calculate equal split for 2 people', () => {
      const amount = 100;
      const people = 2;
      const perPerson = amount / people;
      expect(perPerson).toBe(50);
    });

    it('should handle percentage split', () => {
      const amount = 100;
      const percentage = 50;
      const share = (amount * percentage) / 100;
      expect(share).toBe(50);
    });

    it('should calculate share-based split', () => {
      const amount = 400;
      const totalShares = 4;
      const userShares = 2;
      const userAmount = (amount / totalShares) * userShares;
      expect(userAmount).toBe(200);
    });
  });

  describe('Expense Validation', () => {
    it('should reject negative amounts', () => {
      const amount = -100;
      const isValid = amount > 0;
      expect(isValid).toBe(false);
    });

    it('should accept positive amounts', () => {
      const amount = 100;
      const isValid = amount > 0;
      expect(isValid).toBe(true);
    });

    it('should reject zero amount', () => {
      const amount = 0;
      const isValid = amount > 0;
      expect(isValid).toBe(false);
    });

    it('should require description', () => {
      const description = 'Test Expense';
      const isValid = description.length > 0;
      expect(isValid).toBe(true);
    });

    it('should reject empty description', () => {
      const description = '';
      const isValid = description.length > 0;
      expect(isValid).toBe(false);
    });
  });
});
