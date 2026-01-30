import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// UserInfoEntity 查询 Router
export const userRouter = router({
  // 查询用户列表
  findMany: publicProcedure
    .input(
      z
        .object({
          uid: z.number().optional(), // 根据 uid 精确查询
          appid: z.string().optional(), // 根据 appid 筛选：maka|jiantie
          register_device: z.string().optional(), // 根据注册设备筛选
          register_source: z.string().optional(), // 根据注册渠道筛选（模糊搜索）
          deleted: z.boolean().optional().default(false), // 是否删除
          skip: z.number().optional().default(0),
          take: z.number().optional().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        deleted: input?.deleted ?? false,
      };

      if (input?.uid) {
        where.uid = input.uid;
      }

      if (input?.appid) {
        where.appid = input.appid;
      }

      if (input?.register_device) {
        where.register_device = input.register_device;
      }

      if (input?.register_source) {
        where.register_source = {
          contains: input.register_source,
        };
      }

      return ctx.prisma.userInfoEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { register_date: 'desc' },
        select: {
          uid: true,
          register_date: true,
          register_device: true,
          register_source: true,
          appid: true,
        },
      });
    }),

  // 统计用户数量
  count: publicProcedure
    .input(
      z
        .object({
          uid: z.number().optional(),
          appid: z.string().optional(),
          register_device: z.string().optional(),
          register_source: z.string().optional(),
          deleted: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        deleted: input?.deleted ?? false,
      };

      if (input?.uid) {
        where.uid = input.uid;
      }

      if (input?.appid) {
        where.appid = input.appid;
      }

      if (input?.register_device) {
        where.register_device = input.register_device;
      }

      if (input?.register_source) {
        where.register_source = {
          contains: input.register_source,
        };
      }

      return ctx.prisma.userInfoEntity.count({ where });
    }),

  // 根据 uid 查询单个用户
  findByUid: publicProcedure
    .input(
      z.object({
        uid: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.userInfoEntity.findUnique({
        where: { uid: input.uid },
        select: {
          uid: true,
          register_date: true,
          register_device: true,
          register_source: true,
          appid: true,
          ad_plan_id: true,
        },
      });
    }),

  // 获取用户 Profile（用于替换 getUserProfileV10）
  getProfile: publicProcedure
    .input(
      z.object({
        uid: z.number(),
        appid: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { uid: input.uid },
        select: {
          uid: true,
          username: true,
          avatar: true,
          appid: true,
          reg_date: true,
          status: true,
          is_team: true,
          userAuths: {
            select: {
              auth_type: true,
              auth_value: true,
              is_verified: true,
              oauth_provider: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // 转换数据格式以兼容 v10 API 返回格式
      const auths: Record<string, any> = {};
      user.userAuths.forEach(auth => {
        auths[auth.auth_type] = {
          loginid: auth.auth_value,
          is_verified: auth.is_verified,
          oauth_provider: auth.oauth_provider,
        };
      });

      return {
        uid: user.uid,
        username: user.username,
        avatar: user.avatar || '',
        appid: user.appid,
        reg_date: user.reg_date,
        status: user.status,
        is_team: user.is_team,
        auths,
      };
    }),

  // 获取用户角色（用于替换 getUserRole）
  getRole: publicProcedure
    .input(
      z.object({
        uid: z.number(),
        appid: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userRoles = await ctx.prisma.userRole.findMany({
        where: {
          uid: input.uid,
          role: {
            appid: input.appid,
          },
          // 只返回未过期或没有过期时间的角色
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } },
          ],
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              alias: true,
              description: true,
            },
          },
        },
        orderBy: {
          create_time: 'desc',
        },
      });

      // 转换数据格式以兼容 v10 API 返回格式
      return userRoles.map(userRole => ({
        id: userRole.id,
        uid: userRole.uid,
        role_id: userRole.role_id,
        roleAlias: userRole.role.alias,
        role: {
          id: userRole.role.id,
          name: userRole.role.name,
          alias: userRole.role.alias,
          description: userRole.role.description,
        },
        start_at: userRole.start_at,
        validTo: userRole.expires_at,
        expires_at: userRole.expires_at,
        create_time: userRole.create_time,
      }));
    }),
});
