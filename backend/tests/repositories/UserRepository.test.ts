/**
 * UserRepository integration tests with mocked DynamoDB
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  createMockUserWithPassword,
  createMockUserItem,
  generateUserId
} from '../utils/testFactories.js';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();

  return {
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: mockSend
      }))
    },
    PutCommand: vi.fn((input) => ({ input, type: 'PutCommand' })),
    GetCommand: vi.fn((input) => ({ input, type: 'GetCommand' })),
    QueryCommand: vi.fn((input) => ({ input, type: 'QueryCommand' })),
    UpdateCommand: vi.fn((input) => ({ input, type: 'UpdateCommand' }))
  };
});

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get reference to the mocked send function
    const docClient = DynamoDBDocumentClient.from({} as any);
    mockSend = docClient.send;

    repository = new UserRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createUser', () => {
    it('should create user and username index', async () => {
      const user = createMockUserWithPassword({
        userId: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: '$2b$10$hashedpassword'
      });

      mockSend.mockResolvedValue({});

      await repository.createUser(user);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify user item was created
      const userCall = mockSend.mock.calls[0][0];
      expect(userCall.type).toBe('PutCommand');
      expect(userCall.input.Item.PK).toBe('USER#user-123');
      expect(userCall.input.Item.SK).toBe('PROFILE');
      expect(userCall.input.Item.username).toBe('testuser');
      expect(userCall.input.Item.passwordHash).toBe('$2b$10$hashedpassword');

      // Verify username index was created with condition
      const indexCall = mockSend.mock.calls[1][0];
      expect(indexCall.type).toBe('PutCommand');
      expect(indexCall.input.Item.PK).toBe('USERNAME#testuser');
      expect(indexCall.input.Item.SK).toBe('MAPPING');
      expect(indexCall.input.Item.userId).toBe('user-123');
      expect(indexCall.input.ConditionExpression).toBe('attribute_not_exists(PK)');
    });

    it('should normalize username to lowercase in index', async () => {
      const user = createMockUserWithPassword({
        username: 'TestUser'
      });

      mockSend.mockResolvedValue({});

      await repository.createUser(user);

      const indexCall = mockSend.mock.calls[1][0];
      expect(indexCall.input.Item.PK).toBe('USERNAME#testuser');
    });

    it('should initialize stats to zero', async () => {
      const user = createMockUserWithPassword();

      mockSend.mockResolvedValue({});

      await repository.createUser(user);

      const userCall = mockSend.mock.calls[0][0];
      expect(userCall.input.Item.totalGames).toBe(0);
      expect(userCall.input.Item.totalWins).toBe(0);
      expect(userCall.input.Item.totalGuesses).toBe(0);
      expect(userCall.input.Item.averageGuessesToWin).toBe(0);
    });

    it('should include email if provided', async () => {
      const user = createMockUserWithPassword({
        email: 'test@example.com'
      });

      mockSend.mockResolvedValue({});

      await repository.createUser(user);

      const userCall = mockSend.mock.calls[0][0];
      expect(userCall.input.Item.email).toBe('test@example.com');
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const userId = 'user-123';
      const mockItem = createMockUserItem({
        userId,
        username: 'testuser',
        passwordHash: '$2b$10$hash'
      });

      mockSend.mockResolvedValue({ Item: mockItem });

      const user = await repository.getUserById(userId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('GetCommand');
      expect(call.input.Key.PK).toBe('USER#user-123');
      expect(call.input.Key.SK).toBe('PROFILE');

      expect(user.userId).toBe(userId);
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('$2b$10$hash');
    });

    it('should throw NotFoundError if user does not exist', async () => {
      const userId = 'nonexistent';
      mockSend.mockResolvedValue({ Item: undefined });

      await expect(repository.getUserById(userId)).rejects.toThrow(NotFoundError);
      await expect(repository.getUserById(userId)).rejects.toThrow('User nonexistent not found');
    });

    it('should return all user fields including stats', async () => {
      const mockItem = createMockUserItem({
        userId: 'user-123',
        totalGames: 10,
        totalWins: 5,
        totalGuesses: 50,
        averageGuessesToWin: 10.0
      });

      mockSend.mockResolvedValue({ Item: mockItem });

      const user = await repository.getUserById('user-123');

      expect(user.totalGames).toBe(10);
      expect(user.totalWins).toBe(5);
      expect(user.totalGuesses).toBe(50);
      expect(user.averageGuessesToWin).toBe(10.0);
    });
  });

  describe('getUserByUsername', () => {
    it('should lookup userId from username index and get user', async () => {
      const userId = 'user-123';
      const username = 'testuser';

      // Mock username index lookup
      const indexItem = {
        PK: 'USERNAME#testuser',
        SK: 'MAPPING',
        userId: userId
      };

      // Mock user item
      const userItem = createMockUserItem({
        userId,
        username
      });

      mockSend
        .mockResolvedValueOnce({ Item: indexItem }) // Username index lookup
        .mockResolvedValueOnce({ Item: userItem }); // User lookup

      const user = await repository.getUserByUsername(username);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify username index lookup
      const indexCall = mockSend.mock.calls[0][0];
      expect(indexCall.type).toBe('GetCommand');
      expect(indexCall.input.Key.PK).toBe('USERNAME#testuser');

      // Verify user lookup
      const userCall = mockSend.mock.calls[1][0];
      expect(userCall.type).toBe('GetCommand');
      expect(userCall.input.Key.PK).toBe('USER#user-123');

      expect(user.username).toBe(username);
    });

    it('should normalize username to lowercase', async () => {
      const indexItem = { PK: 'USERNAME#testuser', SK: 'MAPPING', userId: 'user-123' };
      const userItem = createMockUserItem({ userId: 'user-123' });

      mockSend
        .mockResolvedValueOnce({ Item: indexItem })
        .mockResolvedValueOnce({ Item: userItem });

      await repository.getUserByUsername('TestUser');

      const indexCall = mockSend.mock.calls[0][0];
      expect(indexCall.input.Key.PK).toBe('USERNAME#testuser');
    });

    it('should throw NotFoundError if username does not exist', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      await expect(repository.getUserByUsername('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(repository.getUserByUsername('nonexistent')).rejects.toThrow('User nonexistent not found');
    });

    it('should throw NotFoundError if user not found after username lookup', async () => {
      const indexItem = { PK: 'USERNAME#testuser', SK: 'MAPPING', userId: 'user-123' };

      mockSend
        .mockResolvedValueOnce({ Item: indexItem })
        .mockResolvedValueOnce({ Item: undefined }); // User not found

      await expect(repository.getUserByUsername('testuser')).rejects.toThrow(NotFoundError);
    });
  });

  describe('checkUsernameExists', () => {
    it('should return true if username exists', async () => {
      const indexItem = { PK: 'USERNAME#testuser', SK: 'MAPPING', userId: 'user-123' };
      mockSend.mockResolvedValue({ Item: indexItem });

      const exists = await repository.checkUsernameExists('testuser');

      expect(exists).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.input.Key.PK).toBe('USERNAME#testuser');
    });

    it('should return false if username does not exist', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const exists = await repository.checkUsernameExists('nonexistent');

      expect(exists).toBe(false);
    });

    it('should normalize username to lowercase', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      await repository.checkUsernameExists('TestUser');

      const call = mockSend.mock.calls[0][0];
      expect(call.input.Key.PK).toBe('USERNAME#testuser');
    });
  });

  describe('updateUserStats', () => {
    it('should update user stats', async () => {
      const userId = 'user-123';
      const stats = {
        totalGames: 10,
        totalWins: 5,
        totalGuesses: 50,
        averageGuessesToWin: 10.0
      };

      mockSend.mockResolvedValue({});

      await repository.updateUserStats(userId, stats);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('UpdateCommand');
      expect(call.input.Key.PK).toBe('USER#user-123');
      expect(call.input.Key.SK).toBe('PROFILE');
      expect(call.input.ExpressionAttributeValues[':games']).toBe(10);
      expect(call.input.ExpressionAttributeValues[':wins']).toBe(5);
      expect(call.input.ExpressionAttributeValues[':guesses']).toBe(50);
      expect(call.input.ExpressionAttributeValues[':avg']).toBe(10.0);
    });

    it('should update timestamp', async () => {
      const stats = {
        totalGames: 1,
        totalWins: 1,
        totalGuesses: 5,
        averageGuessesToWin: 5.0
      };

      mockSend.mockResolvedValue({});

      await repository.updateUserStats('user-123', stats);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.UpdateExpression).toContain('updatedAt = :updated');
      expect(call.input.ExpressionAttributeValues[':updated']).toBeDefined();
    });
  });

  describe('sanitizeUser', () => {
    it('should remove passwordHash from user object', () => {
      const user = createMockUserWithPassword({
        userId: 'user-123',
        username: 'testuser',
        passwordHash: '$2b$10$secret'
      });

      const sanitized = repository.sanitizeUser(user);

      expect(sanitized.userId).toBe('user-123');
      expect(sanitized.username).toBe('testuser');
      expect((sanitized as any).passwordHash).toBeUndefined();
    });

    it('should preserve all other fields', () => {
      const user = createMockUserWithPassword({
        userId: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        totalGames: 10,
        totalWins: 5
      });

      const sanitized = repository.sanitizeUser(user);

      expect(sanitized.displayName).toBe('Test User');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.totalGames).toBe(10);
      expect(sanitized.totalWins).toBe(5);
    });
  });
});
