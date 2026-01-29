import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 检查用户是否为设计师
 * @param request - The incoming request
 * @returns 用户是否为设计师，如果是设计师则返回设计师信息
 */
export async function GET(request: NextRequest) {
  try {
    // 从URL查询参数中获取appid和uid
    const { searchParams } = new URL(request.url);
    const appid = searchParams.get('appid');
    const uid = searchParams.get('uid');

    // 验证必要参数
    if (!appid || !uid) {
      return NextResponse.json(
        { error: 'Missing required parameters: appid or uid' },
        {
          status: 400,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 将 uid 转换为数字
    const uidNumber = parseInt(uid, 10);
    if (isNaN(uidNumber)) {
      return NextResponse.json(
        { error: 'Invalid uid parameter: must be a number' },
        {
          status: 400,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 通过 Prisma 查询设计师实体
    const designer = await prisma.designerEntity.findUnique({
      where: {
        uid: uidNumber,
      },
    });

    // 检查是否存在且未被删除
    const isDesigner = designer !== null && !designer.deleted;

    return NextResponse.json(
      isDesigner
        ? {
            uid: designer.uid,
            fullName: designer.name,
            isDesigner: true,
            designerId: designer.id,
            avatar: designer.avatar,
            email: designer.email,
          }
        : {
            isDesigner: false,
          },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error checking designer status:', error);
    return NextResponse.json(
      {
        isDesigner: false,
      },
      {
        status: 400,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
