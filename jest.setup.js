// Learn more: https://jestjs.io/docs/configuration

import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: jest.fn().mockReturnValue('/'),
  useSearchParams: jest.fn().mockReturnValue({
    get: jest.fn(),
    getAll: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    toString: jest.fn(),
  }),
}));

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }),
  }),
}));

// Mock for matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 