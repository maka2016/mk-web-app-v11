import { getDesignerInfoInServer } from '@mk/services';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 检查用户是否为设计师
 * @param request - The incoming request
 * @returns 用户角色信息，如果不是设计师则返回空数组
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

    const userConfig = await getDesignerInfoInServer({ uid, appid });

    const roles = userConfig.roles;

    // 检查是否有设计师角色
    const isDesigner = roles.some(role => role.roleAlias === 'maka_operator');

    return NextResponse.json(
      isDesigner
        ? {
            // ...userConfig,
            uid: userConfig.uid,
            fullName: userConfig.fullName,
            roles,
            isDesigner,
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
