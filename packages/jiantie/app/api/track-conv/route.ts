import { reportTencentAdAction } from '@mk/jiantie/services';
import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TrackConvBody = {
  event: string;
  uid: number;
  // 任意事件参数，JSON 对象
  data?: Record<string, any>;
  // 应用ID
  appid?: string;
};

/**
 * POST /api/track-conv
 *
 * 内部使用的归因转化埋点接口：
 * - 参数：event, uid, data(可选)
 * - 行为：仅将事件写入统计数据库，后续由离线任务/worker 负责上报各广告平台
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as TrackConvBody | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: '请求体必须为 JSON 对象' },
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

    const { event, uid, data, appid } = body;
    console.log('[track-conv] 接收转化事件', { event, uid, hasData: !!data, appid });

    if (!event || typeof event !== 'string') {
      return NextResponse.json(
        { error: 'event 为必填字符串' },
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

    if (typeof uid !== 'number' || !Number.isFinite(uid)) {
      return NextResponse.json(
        { error: 'uid 为必填数字' },
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

    // 这里仅做事件入库
    const convEvent = await prisma.adConversionEventEntity.create({
      data: {
        event,
        uid,
        data: data ?? {},
        appid: appid || null,
        // platform / report_status / report_result 使用默认值或后续补充
      },
    });
    console.log('[track-conv] 转化事件已入库', {
      eventId: convEvent.id,
      event,
      uid,
    });

    //做一些逻辑，然后打点上报，然后更新状态

    //如果是register事件，则判断data中的isReg是否为true，
    //是的话，从data获取openId、gdt_vid、AppID为：wxbcd47d4167a10e41
    //通过gdt_vid找到对应的ad_click_callback_entity(匹配click_id和impression_id命中其一即可)
    //用通过gdt_vid找到对应的ad_click_callback_entity中的callback，然后上报action
    //access_token: f54d2c22accaeabb610ee2760e35987e，然后上报数据

    if (event === 'register' && data && data.isReg === true) {
      console.log('[track-conv] 开始处理 register 事件', {
        eventId: convEvent.id,
        uid,
      });
      try {
        const openId =
          data.openId ?? data.openid ?? data.wechat_openid ?? data.wechatOpenId;
        const unionId =
          data.unionId ??
          data.unionid ??
          data.wechat_unionid ??
          data.wechatUnionId;
        const gdtVid = data.gdt_vid ?? data.gdtVid ?? data.click_id;

        if (openId && gdtVid) {
          // 通过 gdt_vid 匹配点击或曝光记录

          const adClick = await prisma.adClickCallbackEntity.findFirst({
            where: {
              platform: 'gdt',
              OR: [{ click_id: gdtVid }, { impression_id: gdtVid }],
            },
          });

          if (adClick && adClick.callback) {
            const reportResult = await reportTencentAdAction({
              callbackUrl: adClick.callback,
              accessToken: 'f54d2c22accaeabb610ee2760e35987e',
              actions: [
                {
                  action_time: Math.floor(Date.now() / 1000),
                  action_type: 'REGISTER',
                  user_id: {
                    wechat_openid: openId,
                    wechat_unionid: unionId,
                    wechat_app_id: 'wxbcd47d4167a10e41',
                  },
                },
              ],
            });

            await prisma.adConversionEventEntity.update({
              where: { id: convEvent.id },
              data: {
                platform: 'gdt',
                ad_event_id: adClick.id,
                appid: appid || adClick.appid || null,
                report_status: reportResult.ok ? 'success' : 'failed',
                report_result: JSON.stringify(reportResult.data ?? null),
              },
            });
          } else {
          }
        } else {
          console.warn('[track-conv] register 事件缺少必要参数', {
            eventId: convEvent.id,
            hasOpenId: !!openId,
            hasGdtVid: !!gdtVid,
          });
        }
      } catch (e) {
        console.error('[track-conv] register 事件处理异常', {
          eventId: convEvent.id,
          uid,
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        try {
          await prisma.adConversionEventEntity.update({
            where: { id: convEvent.id },
            data: {
              platform: 'gdt',
              appid: appid || null,
              report_status: 'failed',
              report_result:
                e instanceof Error ? e.message : 'unknown tencent ad error',
            },
          });
        } catch (updateError) {
          console.error(
            '更新 adConversionEventEntity 上报失败状态时出错:',
            updateError
          );
        }
      }
    } else if (event === 'register' && data && data.isReg === false) {
      console.log('[track-conv] 开始处理 login 事件（isReg=false）', {
        eventId: convEvent.id,
        uid,
      });
      try {
        const openId =
          data.openId ?? data.openid ?? data.wechat_openid ?? data.wechatOpenId;
        const unionId =
          data.unionId ??
          data.unionid ??
          data.wechat_unionid ??
          data.wechatUnionId;
        const gdtVid = data.gdt_vid ?? data.gdtVid ?? data.click_id;

        if (openId && gdtVid) {
          // 通过 gdt_vid 匹配点击或曝光记录
          const adClick = await prisma.adClickCallbackEntity.findFirst({
            where: {
              platform: 'gdt',
              OR: [{ click_id: gdtVid }, { impression_id: gdtVid }],
            },
          });

          if (adClick && adClick.callback) {
            const reportResult = await reportTencentAdAction({
              callbackUrl: adClick.callback,
              accessToken: 'f54d2c22accaeabb610ee2760e35987e',
              actions: [
                {
                  action_time: Math.floor(Date.now() / 1000),
                  action_type: 'LOGIN',
                  user_id: {
                    wechat_openid: openId,
                    wechat_unionid: unionId,
                    wechat_app_id: 'wxbcd47d4167a10e41',
                  },
                },
              ],
            });

            await prisma.adConversionEventEntity.update({
              where: { id: convEvent.id },
              data: {
                event: 'login',
                platform: 'gdt',
                ad_event_id: adClick.id,
                appid: appid || adClick.appid || null,
                report_status: reportResult.ok ? 'success' : 'failed',
                report_result: JSON.stringify(reportResult.data ?? null),
              },
            });
          } else {
            // 未找到关联的广告点击记录或缺少 callback，仍更新 event 为 login
            await prisma.adConversionEventEntity.update({
              where: { id: convEvent.id },
              data: {
                event: 'login',
                platform: 'gdt',
                ad_event_id: adClick?.id ?? null,
                appid: appid || adClick?.appid || null,
                report_status: 'failed',
                report_result: adClick
                  ? '缺少 callback 回调地址'
                  : '未找到关联的广告点击记录',
              },
            });
            console.warn(
              '[track-conv] login 事件未找到关联的广告点击记录或缺少 callback',
              {
                eventId: convEvent.id,
                gdtVid,
                hasAdClick: !!adClick,
                hasCallback: !!adClick?.callback,
              }
            );
          }
        } else {
          // 缺少必要参数，仍更新 event 为 login
          await prisma.adConversionEventEntity.update({
            where: { id: convEvent.id },
            data: {
              event: 'login',
              appid: appid || null,
              report_status: 'failed',
              report_result: '缺少必要参数：openId 或 gdt_vid',
            },
          });
          console.warn('[track-conv] login 事件缺少必要参数', {
            eventId: convEvent.id,
            hasOpenId: !!openId,
            hasGdtVid: !!gdtVid,
          });
        }
      } catch (e) {
        console.error('[track-conv] login 事件处理异常', {
          eventId: convEvent.id,
          uid,
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        try {
          await prisma.adConversionEventEntity.update({
            where: { id: convEvent.id },
            data: {
              event: 'login',
              platform: 'gdt',
              appid: appid || null,
              report_status: 'failed',
              report_result:
                e instanceof Error ? e.message : 'unknown login error',
            },
          });
        } catch (updateError) {
          console.error(
            '更新 adConversionEventEntity login 状态时出错:',
            updateError
          );
        }
      }
    } else if (['VIEW_CONTENT', 'PURCHASE'].includes(event) && data) {
      try {
        const registerEvent = await prisma.adConversionEventEntity.findFirst({
          where: {
            uid,
            event: {
              in: ['register', 'login'],
            },
            platform: 'gdt',
            report_status: 'success',
            ad_event_id: { not: null },
          },
          orderBy: { create_time: 'desc' }, // 取最近的归因成功事件
        });

        if (registerEvent && registerEvent.ad_event_id) {
          // 从 register event 的 data 中获取 openId 和 unionId
          const registerData = registerEvent.data as Record<string, any>;
          const openId =
            registerData.openId ??
            registerData.openid ??
            registerData.wechat_openid ??
            registerData.wechatOpenId;
          const unionId =
            registerData.unionId ??
            registerData.unionid ??
            registerData.wechat_unionid ??
            registerData.wechatUnionId;

          if (openId) {
            const adClick = await prisma.adClickCallbackEntity.findUnique({
              where: { id: registerEvent.ad_event_id },
            });

            if (adClick && adClick.callback) {
              // 根据事件类型设置 action_type
              const actionType =
                event === 'VIEW_CONTENT' ? 'VIEW_CONTENT' : 'PURCHASE';

              const reportResult = await reportTencentAdAction({
                callbackUrl: adClick.callback,
                accessToken: 'f54d2c22accaeabb610ee2760e35987e',
                actions: [
                  {
                    action_time: Math.floor(Date.now() / 1000),
                    action_type: actionType,
                    action_param: {
                      ...data.params,
                    },
                    user_id: {
                      wechat_openid: openId,
                      wechat_unionid: unionId,
                      wechat_app_id: 'wxbcd47d4167a10e41',
                    },
                  },
                ],
              });
              console.log('reportResult', reportResult);
              // 更新当前转化事件的上报状态
              await prisma.adConversionEventEntity.update({
                where: { id: convEvent.id },
                data: {
                  platform: 'gdt',
                  ad_event_id: registerEvent.ad_event_id,
                  appid: appid || adClick.appid || registerEvent.appid || null,
                  report_status: reportResult.ok ? 'success' : 'failed',
                  report_result: JSON.stringify(reportResult.data ?? null),
                },
              });
            } else {
              await prisma.adConversionEventEntity.update({
                where: { id: convEvent.id },
                data: {
                  platform: 'gdt',
                  appid: appid || registerEvent.appid || null,
                  report_status: 'failed',
                  report_result: '未找到对应的广告点击回调记录',
                },
              });
            }
          } else {
            await prisma.adConversionEventEntity.update({
              where: { id: convEvent.id },
              data: {
                platform: 'gdt',
                ad_event_id: registerEvent.ad_event_id,
                appid: appid || registerEvent.appid || null,
                report_status: 'failed',
                report_result: 'register 事件中缺少 openId',
              },
            });
          }
        } else {
          console.warn('[track-conv] 未找到归因成功的 register 事件', {
            eventId: convEvent.id,
            event,
            uid,
            foundRegisterEvent: !!registerEvent,
            hasAdEventId: !!registerEvent?.ad_event_id,
          });
          await prisma.adConversionEventEntity.update({
            where: { id: convEvent.id },
            data: {
              platform: 'gdt',
              appid: appid || null,
              report_status: 'failed',
              report_result: '未找到对应的归因成功的 register 事件',
            },
          });
        }
      } catch (e) {
        console.error('[track-conv] 转化事件处理异常', {
          eventId: convEvent.id,
          event,
          uid,
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        try {
          await prisma.adConversionEventEntity.update({
            where: { id: convEvent.id },
            data: {
              platform: 'gdt',
              appid: appid || null,
              report_status: 'failed',
              report_result:
                e instanceof Error ? e.message : `unknown ${event} error`,
            },
          });
        } catch (updateError) {
          console.error(
            '更新 adConversionEventEntity 上报失败状态时出错:',
            updateError
          );
        }
      }
    }

    console.log('[track-conv] 转化事件处理完成', {
      eventId: convEvent.id,
      event,
      uid,
    });
    return NextResponse.json(
      { success: true },
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
    console.error('[track-conv] 接口处理异常', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: '存储失败',
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
