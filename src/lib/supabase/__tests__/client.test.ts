/* eslint-disable @typescript-eslint/no-require-imports */
// require() is necessary here for jest.resetModules() to pick up env var changes

// Mock the @supabase/ssr module
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn().mockReturnValue({
    auth: {},
    from: jest.fn(),
  }),
}));

describe('Supabase Browser Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createClient', () => {
    it('should return null when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      // Clear the module cache to pick up new env vars
      jest.resetModules();
      const { createClient: freshCreateClient } = require('../client');

      expect(freshCreateClient()).toBeNull();
    });

    it('should return null when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

      jest.resetModules();
      const { createClient: freshCreateClient } = require('../client');

      expect(freshCreateClient()).toBeNull();
    });

    it('should create a browser client when env vars are present', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      jest.resetModules();
      const { createBrowserClient } = require('@supabase/ssr');
      const { createClient: freshCreateClient } = require('../client');

      const client = freshCreateClient();

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
      expect(client).toBeDefined();
    });

    it('should log a warning when configuration is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      jest.resetModules();
      const { createClient: freshCreateClient } = require('../client');

      const result = freshCreateClient();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing Supabase environment variables')
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('Supabase Admin Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createAdminClient', () => {
    it('should throw an error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';

      jest.resetModules();

      // Mock the @supabase/supabase-js module
      jest.doMock('@supabase/supabase-js', () => ({
        createClient: jest.fn(),
      }));

      const { createAdminClient } = require('../admin');

      expect(() => createAdminClient()).toThrow('Supabase admin configuration missing');
    });

    it('should create an admin client with correct options when env vars are present', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      jest.resetModules();

      const mockCreateClient = jest.fn().mockReturnValue({ auth: {} });
      jest.doMock('@supabase/supabase-js', () => ({
        createClient: mockCreateClient,
      }));

      const { createAdminClient } = require('../admin');

      const client = createAdminClient();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-role-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      expect(client).toBeDefined();
    });
  });
});
