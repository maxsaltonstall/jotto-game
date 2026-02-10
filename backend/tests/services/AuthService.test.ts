/**
 * AuthService unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from '../../src/services/AuthService.js';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { ValidationError } from '../../src/utils/errors.js';
import { createMockUserWithPassword, generateUserId } from '../utils/testFactories.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock bcrypt and jwt
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: UserRepository;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mocked user repository
    mockUserRepository = {
      createUser: vi.fn(),
      getUserByUsername: vi.fn(),
      getUserById: vi.fn(),
      updateUser: vi.fn(),
      checkUsernameExists: vi.fn()
    } as any;

    authService = new AuthService(mockUserRepository);

    // Default bcrypt mock behavior
    vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

    // Default jwt mock behavior
    vi.mocked(jwt.sign).mockReturnValue('mock.jwt.token' as any);
    vi.mocked(jwt.verify).mockReturnValue({ userId: 'user-123', username: 'testuser' } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.createUser).mockResolvedValue(undefined);

      const result = await authService.registerUser('testuser', 'password123', 'Test User');

      expect(result.userId).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.token).toBe('mock.jwt.token');
      expect(mockUserRepository.createUser).toHaveBeenCalledTimes(1);
    });

    it('should normalize username to lowercase', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.createUser).mockResolvedValue(undefined);

      await authService.registerUser('TestUser', 'password123', 'Test User');

      const call = vi.mocked(mockUserRepository.createUser).mock.calls[0][0];
      expect(call.username).toBe('testuser');
    });

    it('should hash the password', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.createUser).mockResolvedValue(undefined);

      await authService.registerUser('testuser', 'password123', 'Test User');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      const call = vi.mocked(mockUserRepository.createUser).mock.calls[0][0];
      expect(call.passwordHash).toBe('$2b$10$hashedpassword');
    });

    it('should generate JWT token with user info', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.createUser).mockResolvedValue(undefined);

      await authService.registerUser('testuser', 'password123', 'Test User');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser'
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: '7d' })
      );
    });

    it('should initialize stats to zero', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.createUser).mockResolvedValue(undefined);

      await authService.registerUser('testuser', 'password123', 'Test User');

      const call = vi.mocked(mockUserRepository.createUser).mock.calls[0][0];
      expect(call.totalGames).toBe(0);
      expect(call.totalWins).toBe(0);
      expect(call.totalGuesses).toBe(0);
      expect(call.averageGuessesToWin).toBe(0);
    });

    it('should include email if provided', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.createUser).mockResolvedValue(undefined);

      await authService.registerUser('testuser', 'password123', 'Test User', 'test@example.com');

      const call = vi.mocked(mockUserRepository.createUser).mock.calls[0][0];
      expect(call.email).toBe('test@example.com');
    });

    it('should throw ValidationError if username is too short', async () => {
      await expect(
        authService.registerUser('ab', 'password123', 'Test User')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.registerUser('ab', 'password123', 'Test User')
      ).rejects.toThrow('Username must be at least 3 characters');
    });

    it('should throw ValidationError if username is empty', async () => {
      await expect(
        authService.registerUser('', 'password123', 'Test User')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if password is too short', async () => {
      await expect(
        authService.registerUser('testuser', '12345', 'Test User')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.registerUser('testuser', '12345', 'Test User')
      ).rejects.toThrow('Password must be at least 6 characters');
    });

    it('should throw ValidationError if display name is missing', async () => {
      await expect(
        authService.registerUser('testuser', 'password123', '')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.registerUser('testuser', 'password123', '')
      ).rejects.toThrow('Display name is required');
    });

    it('should throw ValidationError if username already exists', async () => {
      vi.mocked(mockUserRepository.checkUsernameExists).mockResolvedValue(true);

      await expect(
        authService.registerUser('existinguser', 'password123', 'Test User')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.registerUser('existinguser', 'password123', 'Test User')
      ).rejects.toThrow('Username already taken');
    });
  });

  describe('loginUser', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = createMockUserWithPassword({
        userId: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: '$2b$10$hashedpassword',
        totalGames: 10,
        totalWins: 5,
        totalGuesses: 50,
        averageGuessesToWin: 10
      });

      vi.mocked(mockUserRepository.getUserByUsername).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      const result = await authService.loginUser('testuser', 'password123');

      expect(result.userId).toBe('user-123');
      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.token).toBe('mock.jwt.token');
      expect(result.stats).toEqual({
        totalGames: 10,
        totalWins: 5,
        totalGuesses: 50,
        averageGuessesToWin: 10
      });
    });

    it('should verify password with bcrypt', async () => {
      const mockUser = createMockUserWithPassword({
        passwordHash: '$2b$10$hashedpassword'
      });

      vi.mocked(mockUserRepository.getUserByUsername).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      await authService.loginUser('testuser', 'password123');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2b$10$hashedpassword');
    });

    it('should generate JWT token on successful login', async () => {
      const mockUser = createMockUserWithPassword({
        userId: 'user-123',
        username: 'testuser'
      });

      vi.mocked(mockUserRepository.getUserByUsername).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      await authService.loginUser('testuser', 'password123');

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user-123', username: 'testuser' },
        expect.any(String),
        { expiresIn: '7d' }
      );
    });

    it('should throw ValidationError if username is missing', async () => {
      await expect(
        authService.loginUser('', 'password123')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.loginUser('', 'password123')
      ).rejects.toThrow('Username and password are required');
    });

    it('should throw ValidationError if password is missing', async () => {
      await expect(
        authService.loginUser('testuser', '')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if user not found', async () => {
      vi.mocked(mockUserRepository.getUserByUsername).mockRejectedValue(new Error('Not found'));

      await expect(
        authService.loginUser('nonexistent', 'password123')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.loginUser('nonexistent', 'password123')
      ).rejects.toThrow('Invalid username or password');
    });

    it('should throw ValidationError if password is incorrect', async () => {
      const mockUser = createMockUserWithPassword();

      vi.mocked(mockUserRepository.getUserByUsername).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      await expect(
        authService.loginUser('testuser', 'wrongpassword')
      ).rejects.toThrow(ValidationError);

      await expect(
        authService.loginUser('testuser', 'wrongpassword')
      ).rejects.toThrow('Invalid username or password');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: 'user-123', username: 'testuser' } as any);

      const result = authService.verifyToken('valid.jwt.token');

      expect(result.userId).toBe('user-123');
      expect(result.username).toBe('testuser');
      expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', expect.any(String));
    });

    it('should throw ValidationError if token is invalid', () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        authService.verifyToken('invalid.token');
      }).toThrow(ValidationError);

      expect(() => {
        authService.verifyToken('invalid.token');
      }).toThrow('Invalid or expired token');
    });

    it('should throw ValidationError if token is expired', () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Token expired');
      });

      expect(() => {
        authService.verifyToken('expired.token');
      }).toThrow(ValidationError);
    });
  });

  describe('extractUserIdFromHeader', () => {
    it('should extract user ID from valid Bearer token', () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: 'user-123', username: 'testuser' } as any);

      const result = authService.extractUserIdFromHeader('Bearer valid.jwt.token');

      expect(result).toBe('user-123');
    });

    it('should return null if header is missing', () => {
      const result = authService.extractUserIdFromHeader(undefined);

      expect(result).toBeNull();
    });

    it('should return null if header does not start with Bearer', () => {
      const result = authService.extractUserIdFromHeader('Basic credentials');

      expect(result).toBeNull();
    });

    it('should return null if token is invalid', () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = authService.extractUserIdFromHeader('Bearer invalid.token');

      expect(result).toBeNull();
    });

    it('should handle Bearer token with correct formatting', () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: 'user-456', username: 'anotheruser' } as any);

      const result = authService.extractUserIdFromHeader('Bearer token.with.parts');

      expect(result).toBe('user-456');
      expect(jwt.verify).toHaveBeenCalledWith('token.with.parts', expect.any(String));
    });
  });
});
