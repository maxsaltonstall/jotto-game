/**
 * Authentication service - handles user registration and login
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/UserRepository.js';
import type { User, UserWithPassword, LoginResponse, RegisterResponse } from '../models/user-types.js';
import { ValidationError } from '../utils/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days
const SALT_ROUNDS = 10;

export class AuthService {
  private userRepository: UserRepository;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
  }

  /**
   * Register a new user
   */
  async registerUser(
    username: string,
    password: string,
    displayName: string,
    email?: string
  ): Promise<RegisterResponse> {
    // Validate inputs
    if (!username || username.length < 3) {
      throw new ValidationError('Username must be at least 3 characters');
    }

    if (!password || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    if (!displayName) {
      throw new ValidationError('Display name is required');
    }

    // Check if username already exists
    const exists = await this.userRepository.checkUsernameExists(username);
    if (exists) {
      throw new ValidationError('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const user: UserWithPassword = {
      userId,
      username: username.toLowerCase(),
      displayName,
      passwordHash,
      email,
      createdAt: timestamp,
      updatedAt: timestamp,
      totalGames: 0,
      totalWins: 0,
      totalGuesses: 0,
      averageGuessesToWin: 0
    };

    await this.userRepository.createUser(user);

    // Generate JWT token
    const token = this.generateToken(userId, username);

    return {
      userId,
      username: user.username,
      displayName,
      token
    };
  }

  /**
   * Login user
   */
  async loginUser(username: string, password: string): Promise<LoginResponse> {
    // Validate inputs
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Get user by username
    let user: UserWithPassword;
    try {
      user = await this.userRepository.getUserByUsername(username);
    } catch (error) {
      throw new ValidationError('Invalid username or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new ValidationError('Invalid username or password');
    }

    // Generate JWT token
    const token = this.generateToken(user.userId, user.username);

    return {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      token,
      stats: {
        totalGames: user.totalGames,
        totalWins: user.totalWins,
        totalGuesses: user.totalGuesses,
        averageGuessesToWin: user.averageGuessesToWin
      }
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; username: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      return decoded;
    } catch (error) {
      throw new ValidationError('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, username: string): string {
    return jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  /**
   * Extract user ID from Authorization header
   */
  extractUserIdFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
      const decoded = this.verifyToken(token);
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }
}
