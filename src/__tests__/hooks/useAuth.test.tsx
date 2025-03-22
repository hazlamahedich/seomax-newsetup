import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  const mockSignIn = jest.fn();
  const mockSignOut = jest.fn();
  const mockGetUser = jest.fn();
  const mockOnAuthStateChange = jest.fn();
  
  const unsubscribe = jest.fn();
  
  mockOnAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe
      }
    }
  });
  
  return {
    createClient: jest.fn(() => ({
      auth: {
        signInWithPassword: mockSignIn,
        signOut: mockSignOut,
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange
      }
    }))
  };
});

// Create a wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful user authentication
    const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
    const mockClient = mockCreateClient();
    
    // Mock getUser
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    } as any);
    
    // Mock onAuthStateChange
    mockClient.auth.onAuthStateChange.mockImplementation((callback) => {
      // Immediately trigger the callback with a session
      callback('SIGNED_IN', {
        user: { id: '123', email: 'test@example.com' }
      } as any);
      
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      };
    });
  });
  
  it('should throw an error when used outside of AuthProvider', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.error).toEqual(Error('useAuth must be used within an AuthProvider'));
  });
  
  it('should provide user authentication context', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    
    // Wait for the initial user fetch to complete
    await waitForNextUpdate();
    
    expect(result.current.user).toEqual({ id: '123', email: 'test@example.com' });
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });
  
  it('should handle sign-in', async () => {
    const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
    const mockClient = mockCreateClient();
    
    // Mock successful sign-in
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    } as any);
    
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    
    // Wait for the initial user fetch to complete
    await waitForNextUpdate();
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });
  
  it('should handle sign-out', async () => {
    const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
    const mockClient = mockCreateClient();
    
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    
    // Wait for the initial user fetch to complete
    await waitForNextUpdate();
    
    await act(async () => {
      await result.current.signOut();
    });
    
    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });
}); 