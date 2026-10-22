import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User, IUser } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { RegisterInput, LoginInput, ForgotPasswordInput } from '../schemas/auth.schema';
import { AuthUser } from '../types';

export class AuthService {
  private static generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
  }

  public static async register(data: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'MEMBER',
      avatar: data.avatar,
    });

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    };
  }

  public static async login(data: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    };
  }

  public static async getMe(userId: string): Promise<AuthUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };
  }

  public static async forgotPassword(data: ForgotPasswordInput): Promise<{ message: string; resetToken: string }> {
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new AppError('No account found with this email address.', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // Valid for 15 minutes

    await user.save({ validateBeforeSave: false });

    return {
      message: 'Password reset token generated successfully.',
      resetToken,
    };
  }

  public static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired.', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return {
      message: 'Password has been successfully reset. You can now log in with your new password.',
    };
  }
}
