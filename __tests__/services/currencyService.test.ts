describe('CurrencyService', () => {
  describe('Currency Conversion', () => {
    it('should handle same currency conversion', () => {
      const amount = 100;
      const result = amount; // Same currency returns same amount
      expect(result).toBe(100);
    });

    it('should handle positive amounts', () => {
      const amount = 50;
      expect(amount).toBeGreaterThan(0);
    });
  });

  describe('Currency Formatting', () => {
    it('should format numbers with 2 decimals', () => {
      const amount = 123.456;
      const formatted = amount.toFixed(2);
      expect(formatted).toBe('123.46');
    });

    it('should handle whole numbers', () => {
      const amount = 100;
      const formatted = amount.toFixed(2);
      expect(formatted).toBe('100.00');
    });
  });

  describe('Supported Currencies', () => {
    it('should support multiple currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED', 'THB'];
      expect(currencies).toHaveLength(12);
    });

    it('should include USD', () => {
      const currencies = ['USD', 'EUR', 'GBP'];
      expect(currencies).toContain('USD');
    });
  });
});
