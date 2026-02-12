import { z } from 'zod';
import type { ProductItem, WorkPricePackageV2Response } from '../../services/vip';
import { publicProcedure, router } from '../trpc';

/** 从 Product 的 i18nInfo 取当前语言 name/description，找不到时用 en-US 兜底 */
function getI18nDesc(i18nInfo: unknown, locale: string): { name: string; desc: string } {
  if (!i18nInfo || typeof i18nInfo !== 'object') {
    return { name: '', desc: '' };
  }
  const all = i18nInfo as Record<string, unknown>;

  // 先取当前 locale
  let localeObj = all[locale];
  // 如果当前 locale 不存在，则用 en-US 兜底
  if (!localeObj || typeof localeObj !== 'object') {
    localeObj = all['en-US'];
  }
  if (!localeObj || typeof localeObj !== 'object') {
    return { name: '', desc: '' };
  }

  const o = localeObj as Record<string, unknown>;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    desc: typeof o.description === 'string' ? o.description : '',
  };
}

/** 从 shipping_config 取 duration（如天数） */
function getDuration(shippingConfig: unknown): string {
  if (!shippingConfig || typeof shippingConfig !== 'object') return '1';
  const o = shippingConfig as Record<string, unknown>;
  if (typeof o.duration === 'string') return o.duration;
  if (typeof o.days === 'number') return String(o.days);
  return '1';
}

/** 从 shipping_config 取 privileges 字符串 */
function getPrivileges(shippingConfig: unknown): string {
  if (!shippingConfig || typeof shippingConfig !== 'object') return '[]';
  const o = shippingConfig as Record<string, unknown>;
  if (typeof o.privileges === 'string') return o.privileges;
  if (Array.isArray(o.privileges)) return JSON.stringify(o.privileges);
  return '[]';
}

/**
 * VIP 价格包 tRPC 路由
 * 从 v11 数据库读取商品包与商品，供 Avite 等场景使用（苹果/谷歌支付）
 */
export const vipRouter = router({
  getPricePackages: publicProcedure
    .input(
      z.object({
        modulo: z.number(),
        worksId: z.string().optional(),
        appid: z.string().optional(),
        locale: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<WorkPricePackageV2Response> => {
      const pkg = await ctx.prisma.productPackage.findFirst({
        where: {
          modulo: input.modulo,
          ...(input.appid ? { appid: input.appid } : {}),
        },
        include: {
          products: {
            where: { status: 'active' },
            orderBy: { sort_order: 'asc' },
          },
        },
      });

      if (!pkg || pkg.status !== 'active') {
        const pkgAppid = pkg && 'appid' in pkg ? (pkg as { appid: string }).appid : undefined;
        return {
          modulo: input.modulo,
          packCode: String(input.modulo),
          appid: input.appid ?? pkgAppid ?? '',
          products: [],
        };
      }

      const locale = input.locale || 'en-US';
      // 如果未传 worksId，则过滤掉 alias 中包含 'work' 的商品（只保留会员等非单作品商品）
      const filteredProducts = pkg.products.filter(p => {
        if (!input.worksId) {
          const alias = typeof (p as { alias?: unknown }).alias === 'string' ? (p as { alias: string }).alias : '';
          return !alias.includes('work');
        }
        return true;
      });

      const products: ProductItem[] = filteredProducts.map(p => {
        const i18n = getI18nDesc(p.i18nInfo, locale);
        const name = i18n.name;
        const desc = i18n.desc;
        const duration = getDuration(p.shipping_config);
        const privileges = getPrivileges(p.shipping_config);
        const thirdProductMeta = (p.third_product_meta as Record<string, unknown> | null) || undefined;
        const style = (thirdProductMeta?.style as Record<string, unknown>) ?? {};
        const iapProductId =
          thirdProductMeta && typeof thirdProductMeta.appleid === 'string' ? (thirdProductMeta.appleid as string) : '';
        //googleIapProductId
        const googleIapProductId =
          thirdProductMeta && typeof thirdProductMeta.googleid === 'string'
            ? (thirdProductMeta.googleid as string)
            : '';

        return {
          appid: p.appid,
          type: 'vip',
          spuCode: p.alias,
          name,
          desc,
          locale,
          attribute: {},
          privileges,
          productSkus: [
            {
              skuCode: p.alias,
              appid: p.appid,
              price: p.price,
              originalPrice: p.price,
              currency: p.currency,
              iapProductId,
              googleIapProductId,
              thirdProductMeta,
              duration,
              isSubscription: p.is_subscription,
              trialPeriod: p.trial_days != null ? String(p.trial_days) : null,
              name,
              desc,
              info: p.i18nInfo,
              locale,
              style: typeof style === 'object' && style !== null ? style : {},
              attribute: {},
            },
          ],
        };
      });

      const pkgAppid = 'appid' in pkg ? (pkg as { appid: string }).appid : '';
      return {
        modulo: pkg.modulo,
        packCode: String(pkg.modulo),
        appid: pkgAppid,
        products,
      };
    }),
});
