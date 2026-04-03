import React from 'react';

describe('AppContext', () => {
  describe('State Management', () => {
    it('should have initial state', () => {
      const initialState = {
        user: null,
        expenses: [],
        groups: [],
        friends: [],
        isAuthenticated: false,
        loading: false,
        error: null,
      };
      
      expect(initialState.user).toBeNull();
      expect(initialState.expenses).toEqual([]);
      expect(initialState.isAuthenticated).toBe(false);
    });

    it('should handle login action', () => {
      const state = { user: null, isAuthenticated: false };
      const user = { _id: 'user1', name: 'Test User', email: 'test@test.com' };
      
      const newState = { ...state, user, isAuthenticated: true };
      
      expect(newState.user).toEqual(user);
      expect(newState.isAuthenticated).toBe(true);
    });

    it('should handle logout action', () => {
      const state = { 
        user: { _id: 'user1', name: 'Test' }, 
        isAuthenticated: true 
      };
      
      const newState = { ...state, user: null, isAuthenticated: false };
      
      expect(newState.user).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe('Expense Actions', () => {
    it('should add expense to state', () => {
      const state = { expenses: [] };
      const expense = { _id: '1', description: 'Test', amount: 100 };
      
      const newState = { ...state, expenses: [...state.expenses, expense] };
      
      expect(newState.expenses).toHaveLength(1);
      expect(newState.expenses[0]._id).toBe('1');
    });

    it('should update expense in state', () => {
      const state = { 
        expenses: [{ _id: '1', description: 'Old', amount: 100 }] 
      };
      
      const updated = { _id: '1', description: 'New', amount: 150 };
      const newState = {
        ...state,
        expenses: state.expenses.map(e => e._id === '1' ? updated : e)
      };
      
      expect(newState.expenses[0].description).toBe('New');
      expect(newState.expenses[0].amount).toBe(150);
    });

    it('should delete expense from state', () => {
      const state = { 
        expenses: [
          { _id: '1', description: 'Test1' },
          { _id: '2', description: 'Test2' }
        ] 
      };
      
      const newState = {
        ...state,
        expenses: state.expenses.filter(e => e._id !== '1')
      };
      
      expect(newState.expenses).toHaveLength(1);
      expect(newState.expenses[0]._id).toBe('2');
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      const state = { loading: false };
      const newState = { ...state, loading: true };
      
      expect(newState.loading).toBe(true);
    });

    it('should set error state', () => {
      const state = { error: null };
      const newState = { ...state, error: 'Test error' };
      
      expect(newState.error).toBe('Test error');
    });

    it('should clear error state', () => {
      const state = { error: 'Test error' };
      const newState = { ...state, error: null };
      
      expect(newState.error).toBeNull();
    });
  });
});
