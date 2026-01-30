// app/api/geo/route.ts
import {
  IPv4,
  loadVectorIndexFromFile,
  newWithVectorIndex,
  type Searcher,
} from 'ip2region.js';
import { headers } from 'next/headers';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 确保使用 Node.js runtime
export const runtime = 'nodejs';

// 获取当前文件的目录路径（ESM 方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建单例查询器实例（推荐使用 vectorIndex 缓存策略，性能和内存平衡）
let searcher: Searcher | null = null;
let vectorIndex: Buffer | null = null;

function getSearcher(): Searcher {
  if (!searcher) {
    // 获取 xdb 文件路径，优先使用环境变量，否则使用与当前文件同目录的 xdb 文件
    const dbPath =
      process.env.IP2REGION_DB_PATH || join(__dirname, 'ip2region_v4.xdb');

    try {
      // 加载 VectorIndex 缓存（全局共享，减少 IO 操作）
      if (!vectorIndex) {
        vectorIndex = loadVectorIndexFromFile(dbPath);
      }

      // 使用全局的 vectorIndex 创建带缓存的查询对象
      searcher = newWithVectorIndex(IPv4, dbPath, vectorIndex);
    } catch (error) {
      console.error('初始化 IP 查询器失败:', error);
      throw new Error(
        `无法初始化 IP 查询器: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }
  return searcher;
}

export async function GET() {
  const h = await headers();

  const ip =
    h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || '';

  if (!ip) {
    return Response.json({ error: '无法获取 IP 地址' }, { status: 400 });
  }

  try {
    const searcher = getSearcher();
    const region = await searcher.search(ip);

    // ip2region 返回格式：国家|省份|城市|运营商
    // 例如：中国|广东省|深圳市|移动
    // 如果查询不到则返回空字符串
    if (!region) {
      return Response.json({
        ip,
        province: '',
        city: '',
        adcode: '',
      });
    }

    const parts = region.split('|');

    // 处理可能的格式变化
    const province = parts[1] || '';
    const city = parts[2] || '';

    return Response.json({
      ip,
      province,
      city,
      adcode: '', // ip2region 不提供 adcode，返回空字符串保持接口兼容性
    });
  } catch (error) {
    console.error('IP 定位失败:', error);
    return Response.json(
      {
        error: 'IP 定位失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
