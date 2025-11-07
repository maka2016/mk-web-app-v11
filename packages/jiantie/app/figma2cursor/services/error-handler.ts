/**
 * 错误处理工具
 * 提供友好的错误信息和解决方案
 */

export interface ErrorInfo {
  title: string;
  message: string;
  solution?: string;
  code?: string;
}

export class FigmaErrorHandler {
  /**
   * 解析并返回友好的错误信息
   */
  static handleError(error: any): ErrorInfo {
    // 网络错误
    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Network')
    ) {
      return {
        title: '网络连接失败',
        message: '无法连接到 Figma API，请检查网络连接',
        solution: '请确保网络连接正常，或稍后重试',
        code: 'NETWORK_ERROR',
      };
    }

    // 认证错误
    if (error.status === 403 || error.message?.includes('403')) {
      return {
        title: 'Access Token 无效',
        message: '提供的 Figma Access Token 无效或已过期',
        solution:
          '请前往 Figma Settings → Account → Personal access tokens 重新生成 token',
        code: 'AUTH_ERROR',
      };
    }

    // 找不到文件或节点
    if (
      error.status === 404 ||
      error.message?.includes('404') ||
      error.message?.includes('not found')
    ) {
      return {
        title: '找不到设计文件或节点',
        message: '指定的 Figma 文件或节点不存在',
        solution:
          '请确保：\n1. 复制的链接是正确的（包含 node-id 参数）\n2. 你有权限访问该文件\n3. 节点未被删除\n4. node-id 格式正确（会自动从 7426-25858 转换为 7426:25858）',
        code: 'NOT_FOUND',
      };
    }

    // 权限不足
    if (error.status === 401) {
      return {
        title: '权限不足',
        message: '无权访问该 Figma 文件',
        solution:
          '请确保：\n1. Access Token 有效\n2. 该文件已与你共享\n3. 文件未被设为私有',
        code: 'PERMISSION_DENIED',
      };
    }

    // 请求频率限制
    if (error.status === 429) {
      return {
        title: '请求过于频繁',
        message: 'Figma API 请求频率超过限制',
        solution: '请稍后再试（建议等待 1-2 分钟）',
        code: 'RATE_LIMIT',
      };
    }

    // URL 解析错误
    if (error.message?.includes('Invalid') && error.message?.includes('URL')) {
      return {
        title: '链接格式错误',
        message: '提供的 Figma 链接格式不正确',
        solution:
          '正确的链接格式应为：\nhttps://www.figma.com/design/[fileKey]/...?node-id=...',
        code: 'INVALID_URL',
      };
    }

    // 数据转换错误
    if (
      error.message?.includes('convert') ||
      error.message?.includes('parse')
    ) {
      return {
        title: '数据转换失败',
        message: '无法将 Figma 设计转换为代码',
        solution:
          '该节点可能包含不支持的元素类型，请尝试：\n1. 选择更简单的节点\n2. 确保节点包含有效的设计元素\n3. 检查节点是否为空',
        code: 'CONVERSION_ERROR',
      };
    }

    // 超时错误
    if (error.message?.includes('timeout')) {
      return {
        title: '请求超时',
        message: 'Figma API 请求超时',
        solution:
          '节点可能过于复杂，请尝试：\n1. 选择更小的节点\n2. 检查网络连接\n3. 稍后重试',
        code: 'TIMEOUT',
      };
    }

    // CORS 错误
    if (error.message?.includes('CORS')) {
      return {
        title: '跨域请求被阻止',
        message: '浏览器阻止了对 Figma API 的请求',
        solution:
          '这通常是浏览器安全策略导致的，请尝试：\n1. 使用服务器端 API 代理\n2. 配置正确的 CORS 设置',
        code: 'CORS_ERROR',
      };
    }

    // 未知错误
    return {
      title: '发生未知错误',
      message: error.message || '转换过程中发生了未知错误',
      solution:
        '请尝试：\n1. 刷新页面重试\n2. 选择不同的节点\n3. 检查所有输入是否正确\n\n如果问题持续存在，请联系技术支持',
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * 验证 Figma URL
   */
  static validateFigmaUrl(url: string): { valid: boolean; error?: string } {
    try {
      // 移除可能的 @ 前缀
      const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
      const parsedUrl = new URL(cleanUrl);

      if (!parsedUrl.hostname.includes('figma.com')) {
        return {
          valid: false,
          error: 'URL 必须来自 figma.com',
        };
      }

      if (
        !parsedUrl.pathname.includes('/design/') &&
        !parsedUrl.pathname.includes('/file/')
      ) {
        return {
          valid: false,
          error: '链接必须包含 /design/ 或 /file/ 路径',
        };
      }

      const nodeId = parsedUrl.searchParams.get('node-id');
      if (!nodeId) {
        return {
          valid: false,
          error: '链接必须包含 node-id 参数（右键元素选择 "Copy link" 获取）',
        };
      }

      // 验证 node-id 格式（应该是数字-数字格式，如 7426-25858）
      if (!nodeId.match(/^\d+-\d+$/)) {
        return {
          valid: false,
          error: 'node-id 格式不正确（应为 数字-数字 格式）',
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: '无效的 URL 格式',
      };
    }
  }

  /**
   * 验证 Access Token 格式
   */
  static validateAccessToken(token: string): {
    valid: boolean;
    error?: string;
  } {
    if (!token) {
      return {
        valid: false,
        error: 'Access Token 不能为空',
      };
    }

    if (token.length < 20) {
      return {
        valid: false,
        error: 'Access Token 长度不正确',
      };
    }

    // Figma token 通常以 figd_ 开头
    if (!token.startsWith('figd_')) {
      return {
        valid: false,
        error: 'Access Token 格式可能不正确（应以 figd_ 开头）',
      };
    }

    return { valid: true };
  }
}
