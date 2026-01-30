import { z } from 'zod';
import { Prisma } from '@mk/jiantie/v11-database/generated/client/client';
import { log } from '../logger';
import { publicProcedure, router } from '../trpc';

/** 接受对象或 JSON 字符串，统一为 Record */
const jsonObject = z.union([
  z.record(z.string(), z.unknown()),
  z.string().transform((s): Record<string, unknown> => {
    try {
      const v = JSON.parse(s) as unknown;
      return v != null && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};
    } catch {
      throw new Error('Invalid JSON');
    }
  }),
]);

const productPackageCreateInput = z.object({
  modulo: z.number(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string().default('active'),
  sort_order: z.number().default(0),
  appid: z.string(),
});

const productPackageUpdateInput = z.object({
  modulo: z.number(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  sort_order: z.number().optional(),
  appid: z.string().optional(),
});

const productCreateInput = z.object({
  appid: z.string(),
  name: z.string(),
  alias: z.string(),
  price: z.number(),
  currency: z.string().default('CNY'),
  is_subscription: z.boolean().default(false),
  is_trial: z.boolean().default(false),
  trial_days: z.number().optional().nullable(),
  i18nInfo: jsonObject.default({}),
  third_product_meta: z.union([jsonObject, z.null()]).optional().nullable(),
  shipping_config: jsonObject.default({}),
  status: z.string().default('active'),
  sort_order: z.number().default(0),
});

const productUpdateInput = z.object({
  id: z.string(),
  appid: z.string().optional(),
  name: z.string().optional(),
  alias: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  is_subscription: z.boolean().optional(),
  is_trial: z.boolean().optional(),
  trial_days: z.number().optional().nullable(),
  i18nInfo: jsonObject.optional(),
  third_product_meta: z.union([jsonObject, z.null()]).optional().nullable(),
  shipping_config: jsonObject.optional(),
  status: z.string().optional(),
  sort_order: z.number().optional(),
});

export const adminProductRouter = router({
  // ---------- 商品包 ----------
  productPackageList: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.prisma.productPackage.findMany({
        where: {
          ...(input.appid ? { appid: input.appid } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          products: { select: { id: true } },
        },
        orderBy: [{ sort_order: 'asc' }, { modulo: 'asc' }],
      });
      return list;
    }),

  productPackageGetByModulo: publicProcedure.input(z.object({ modulo: z.number() })).query(async ({ ctx, input }) => {
    const pkg = await ctx.prisma.productPackage.findUnique({
      where: { modulo: input.modulo },
      include: {
        products: { orderBy: { sort_order: 'asc' } },
      },
    });
    return pkg;
  }),

  productPackageCreate: publicProcedure.input(productPackageCreateInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.productPackage.findUnique({
      where: { modulo: input.modulo },
    });
    if (existing) {
      throw new Error(`商品包 modulo ${input.modulo} 已存在`);
    }
    return ctx.prisma.productPackage.create({
      data: {
        modulo: input.modulo,
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        status: input.status,
        sort_order: input.sort_order,
        appid: input.appid,
      },
    });
  }),

  productPackageUpdate: publicProcedure.input(productPackageUpdateInput).mutation(async ({ ctx, input }) => {
    const { modulo, ...data } = input;
    return ctx.prisma.productPackage.update({
      where: { modulo },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
        ...(data.appid !== undefined && { appid: data.appid }),
      },
    });
  }),

  productPackageSetProducts: publicProcedure
    .input(
      z.object({
        modulo: z.number(),
        productIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.prisma.productPackage.findUnique({
        where: { modulo: input.modulo },
      });
      if (!pkg) {
        throw new Error(`商品包 modulo ${input.modulo} 不存在`);
      }
      const connect = input.productIds.map(id => ({ id }));
      return ctx.prisma.productPackage.update({
        where: { modulo: input.modulo },
        data: { products: { set: connect } },
      });
    }),

  // ---------- 商品 ----------
  productList: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.prisma.product.findMany({
        where: {
          ...(input.appid ? { appid: input.appid } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          packages: { select: { modulo: true, name: true } },
        },
        orderBy: [{ sort_order: 'asc' }, { create_time: 'desc' }],
      });
      return list;
    }),

  productGetById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.product.findUnique({
      where: { id: input.id },
      include: {
        packages: true,
      },
    });
  }),

  productCreate: publicProcedure.input(productCreateInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.product.findUnique({
      where: { alias: input.alias },
    });
    if (existing) {
      throw new Error(`商品别名 ${input.alias} 已存在`);
    }
    return ctx.prisma.product.create({
      data: {
        appid: input.appid,
        name: input.name,
        alias: input.alias,
        price: input.price,
        currency: input.currency,
        is_subscription: input.is_subscription,
        is_trial: input.is_trial,
        trial_days: input.trial_days ?? undefined,
        i18nInfo: input.i18nInfo as object,
        third_product_meta: input.third_product_meta as object | undefined,
        shipping_config: input.shipping_config as object,
        status: input.status,
        sort_order: input.sort_order,
      },
    });
  }),

  productUpdate: publicProcedure.input(productUpdateInput).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    log.info(data);
    if (data.alias !== undefined) {
      const existing = await ctx.prisma.product.findFirst({
        where: { alias: data.alias, id: { not: id } },
      });
      if (existing) {
        throw new Error(`商品别名 ${data.alias} 已存在`);
      }
    }
    return ctx.prisma.product.update({
      where: { id },
      data: {
        ...(data.appid !== undefined && { appid: data.appid }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.alias !== undefined && { alias: data.alias }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.is_subscription !== undefined && {
          is_subscription: data.is_subscription,
        }),
        ...(data.is_trial !== undefined && { is_trial: data.is_trial }),
        ...(data.trial_days !== undefined && { trial_days: data.trial_days }),
        ...(data.i18nInfo !== undefined && { i18nInfo: data.i18nInfo as object }),
        ...(data.third_product_meta !== undefined && {
          third_product_meta:
            data.third_product_meta === null
              ? Prisma.JsonNull
              : (data.third_product_meta as object),
        }),
        ...(data.shipping_config !== undefined && {
          shipping_config: data.shipping_config as object,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
      },
    });
  }),

  productSetPackages: publicProcedure
    .input(
      z.object({
        id: z.string(),
        packageModulos: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
      });
      if (!product) {
        throw new Error(`商品 ${input.id} 不存在`);
      }
      const connect = input.packageModulos.map(modulo => ({ modulo }));
      return ctx.prisma.product.update({
        where: { id: input.id },
        data: { packages: { set: connect } },
      });
    }),
});
