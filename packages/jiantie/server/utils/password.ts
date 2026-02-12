import crypto from 'crypto';

/**
 * 密码加密工具函数
 * 使用 Node.js 内置的 crypto 模块进行密码哈希
 */

/**
 * 生成随机盐值
 */
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 使用 SHA-256 和盐值加密密码
 * @param password 原始密码
 * @param salt 盐值（可选，如果不提供则自动生成）
 * @returns 格式为 "salt:hash" 的加密字符串
 */
export function hashPassword(password: string, salt?: string): string {
  const saltValue = salt || generateSalt();
  const hash = crypto
    .createHash('sha256')
    .update(password + saltValue)
    .digest('hex');
  return `${saltValue}:${hash}`;
}

/**
 * 验证密码
 * @param password 原始密码
 * @param hashedPassword 加密后的密码（格式为 "salt:hash"）
 * @returns 是否匹配
 */
export function verifyPassword(
  password: string,
  hashedPassword: string
): boolean {
  try {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) {
      return false;
    }
    const computedHash = crypto
      .createHash('sha256')
      .update(password + salt)
      .digest('hex');
    return computedHash === hash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
