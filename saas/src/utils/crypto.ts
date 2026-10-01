import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class CryptoHelper {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateApiKey(): { key: string; prefix: string; hash: string } {
    const rawKey = `prk_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = rawKey.slice(0, 10);
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    return { key: rawKey, prefix, hash };
  }

  static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
