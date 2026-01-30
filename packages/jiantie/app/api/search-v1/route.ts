import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import {
  SearchParams,
  SortType,
  searchTemplates,
} from '../../../../search/src/service/searchV1';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET 方法 - 搜索模板
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const page = searchParams.get('page');
    const page_size = searchParams.get('page_size');
    const sort = searchParams.get('sort') as SortType | null;
    const appid = searchParams.get('appid');
    const spec_id = searchParams.get('spec_id');
    const facet_mode = searchParams.get('facet_mode');
    const isFacetOnlyMode = facet_mode === '1';

    // 验证必要参数
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: '搜索词不能为空' },
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

    // 构建搜索参数
    const searchParamsObj: SearchParams = {
      query: query.trim(),
      page: page ? parseInt(page, 10) : 1,
      page_size: page_size ? parseInt(page_size, 10) : 30,
      sort: sort || 'composite',

      filter: {},
    };

    // 添加过滤器
    if (appid) {
      searchParamsObj.filter!.appid = appid;
    }
    if (spec_id) {
      searchParamsObj.filter!.spec_id = spec_id;
    }

    console.log('调用搜索服务', searchParamsObj, { isFacetOnlyMode });
    // 调用搜索服务
    const result = await searchTemplates(searchParamsObj, isFacetOnlyMode);

    // 获取规格ID列表并查询规格详情
    const specIds = result.specs?.map(spec => spec.spec_id) || [];
    const specEntities =
      specIds.length > 0
        ? await prisma.worksSpecEntity.findMany({
            where: {
              id: { in: specIds },
              deleted: false,
            },
            select: {
              id: true,
              name: true,
              alias: true,
              display_name: true,
            },
          })
        : [];

    // 构建规格数据映射
    const specMap = new Map(specEntities.map(spec => [spec.id, spec]));

    // 拼装规格信息（包含统计数量和详情）
    const specs = (result.specs || []).map(specStat => {
      const specEntity = specMap.get(specStat.spec_id);
      return {
        id: specStat.spec_id,
        name: specEntity?.name || '',
        alias: specEntity?.alias || '',
        display_name:
          specEntity?.display_name ||
          specEntity?.name ||
          specEntity?.alias ||
          '',
        count: specStat.count,
      };
    });

    // 仅标签模式：只返回规格数据，不返回模板列表
    if (isFacetOnlyMode) {
      return NextResponse.json(
        {
          result: {
            specs,
            total: result.total,
          },
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
    }

    // 获取模板ID列表
    const templateIds = result.templates.map((t: any) => t.template_id);

    // 从数据库批量获取模板的 coverV3 和 cover 数据
    const templateEntities = await prisma.templateEntity.findMany({
      where: {
        id: { in: templateIds },
        deleted: false,
      },
      select: {
        id: true,
        cover: true,
        coverV3: true,
      },
    });

    // 构建模板数据映射
    const templateMap = new Map(templateEntities.map(t => [t.id, t]));

    return NextResponse.json(
      {
        result: {
          template_list: result.templates.map((template: any) => {
            const templateEntity = templateMap.get(template.template_id);
            const coverUrl =
              (templateEntity?.coverV3 as { url: string; width: number; height: number } | null)?.url ||
              template.meta?.preview_image_url ||
              '';

            return {
              template: template.template_id,
              name: template.title || '',
              desc: template.meta?.desc || '',
              preview_image_url: coverUrl,
              cover: coverUrl ? { url: coverUrl } : null,
              coverV3: templateEntity?.coverV3 || null,
              sort_score: template.sort_score,
              sort_factors: template.sort_factors,
            };
          }),
          total: result.total,
          page: result.page,
          total_pages: result.total_pages,
          specs,
        },
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
    console.error('搜索失败:', error);
    return NextResponse.json(
      {
        error: '搜索失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      {
        status: 500,
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
