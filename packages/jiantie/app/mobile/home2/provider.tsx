import { getCmsApiHost, requestCMS } from '@/services/prompt';
import qs from 'qs';

// 为每个appid创建独立的缓存
const storeCacheMap = new Map<string, { data: any; timestamp: number }>();
const promptGroupCacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

export const getChannelData = async ({
  appid = 'jiantie',
}: {
  appid: string;
}) => {
  const query = qs.stringify(
    {
      populate: {
        template_channels: {
          fields: ['name', 'id', 'documentId', 'is_waterfall'],
          populate: {
            icon: {
              populate: '*',
            },
          },
        },
        home_background: {
          fields: ['url'],
        },
      },
      filters: {
        appid: {
          $eq: appid,
        },
      },
    },
    { encodeValuesOnly: true }
  );
  const promptGroupRes = (
    await requestCMS.get(`${getCmsApiHost()}/api/template-apps?${query}`)
  ).data.data;

  return promptGroupRes;
};

export const getStoreChannelV1 = async ({
  appid = 'jiantie',
}: {
  appid: string;
}) => {
  // 检查当前appid的缓存
  const cache = storeCacheMap.get(appid);
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }
  const query = qs.stringify(
    {
      populate: {
        children: {
          filters: {
            online: {
              $eq: true,
            },
          },
          populate: {
            children: {
              populate: '*',
              fields: [
                'name',
                'id',
                'documentId',
                'type',
                'online',
                'filters',
                'sort',
                'config',
              ],
              sort: ['sort:asc'],
              filters: {
                online: {
                  $eq: true,
                },
              },
            },
            icon: {
              fields: ['url'],
            },
          },
          fields: [
            'name',
            'id',
            'documentId',
            'type',
            'online',
            'filters',
            'sort',
            'config',
          ],
          sort: ['sort:asc'],
        },
        icon: {
          fields: ['url'],
        },
      },
      fields: ['name', 'id', 'documentId', 'type', 'sort'],

      filters: {
        appId: {
          appid: {
            $eq: appid,
          },
        },
        type: {
          $eq: '一级频道',
        },
        online: {
          $eq: true,
        },
      },

      pagination: {
        pageSize: 1000,
        page: 1,
      },
      sort: ['sort:asc'],
    },
    { encodeValuesOnly: true }
  );

  const promptGroupRes = (
    await requestCMS.get(`${getCmsApiHost()}/api/store-channel-v1s?${query}`)
  ).data.data;

  // 为当前appid设置缓存
  storeCacheMap.set(appid, {
    data: promptGroupRes,
    timestamp: Date.now(),
  });

  return promptGroupRes;
};
