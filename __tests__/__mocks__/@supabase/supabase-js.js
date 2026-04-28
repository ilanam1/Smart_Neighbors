export const mockAuthUser = {
  id: 'test-auth-uuid-1234',
  email: 'test@example.com',
  role: 'authenticated',
};

export const mockProfile = {
  auth_uid: 'test-auth-uuid-1234',
  first_name: 'Test',
  last_name: 'User',
  building_id: 'building-uuid',
  is_approved: true,
  role: 'tenant',
};

export const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: mockAuthUser, session: { access_token: 'fake-token' } },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: mockAuthUser, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    updateUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser }, error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
    mfa: {
      getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
      listFactors: jest.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
      challenge: jest.fn().mockResolvedValue({ data: { id: 'challenge_id' }, error: null }),
      verify: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
  from: jest.fn((table) => {
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        if (table === 'profiles') {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      }),
      single: jest.fn().mockImplementation(() => {
        if (table === 'profiles') {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      }),
      then: jest.fn().mockImplementation((resolve) => {
         // Resolve default list or single based on standard operations
         return resolve({ data: [], error: null });
      })
    };
  }),
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: { clientSecret: 'pi_secret_test' }, error: null }),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://fake-url.com' } }),
    })),
  },
};

export const createClient = jest.fn(() => mockSupabase);
