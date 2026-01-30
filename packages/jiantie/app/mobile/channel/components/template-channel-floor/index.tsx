import {
  Channel,
  getAppId,
  getCmsApiHost,
  getTopTemplates,
  getUid,
  requestCMS,
} from '@/services';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

import APPBridge from '@/store/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { useRouter } from 'next/navigation';
import qs from 'qs';
import TemplateCard, { Template } from '../template-card';

interface Props {
  channel: Channel;
  color?: string;
  showMore?: boolean;
}

const limit = 6;

const TemplateChannelFloor = (props: Props) => {
  const { channel, showMore = false, color } = props;
  const [tagId, setTagId] = useState<string>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const appid = getAppId();

  useEffect(() => {
    // 过滤掉 online 不为 true 的项，并按 sort 值从大到小排序
    // const filtered =
    //   channel?.children?.filter((item) => item.online === true) || [];

    // 按 sort 值从大到小排序
    // const sorted = filtered.sort((a, b) => -(b.sort || 0) + (a.sort || 0));

    // setFilteredChildren(sorted);

    if (channel?.children.length) {
      setTagId(channel?.children[0].documentId);
      setActiveChannel(channel?.children[0]);
    } else {
      setTagId(channel.documentId);
      setActiveChannel(channel);
    }
  }, [channel]);

  useEffect(() => {
    getFloorTemplates();
  }, [tagId]);

  const onChangeTagId = (id: string) => {
    setLoading(true);
    setTagId(id);
    setActiveChannel(channel?.children.find(item => item.documentId === id));
  };

  const getSortOrder = () => {
    const uid = getUid();
    if (!uid) {
      return ['sort_score:desc'];
    }
    const lastDigit = parseInt(uid.slice(-1));

    return lastDigit >= 0 && lastDigit <= 4
      ? ['sort_score:desc']
      : ['scrore_ab:desc'];
  };

  const getFloorTemplates = async () => {
    if (!activeChannel) return;

    let topTemplates: Template[] = [];
    if (!!activeChannel?.config?.topTids?.[0]) {
      const topRes = await getTopTemplates(activeChannel);
      topTemplates = topRes;
    }

    let QRes: any;
    if (topTemplates.length < limit) {
      const query = qs.stringify(
        {
          populate: {
            cover: {
              populate: '*',
            },
          },
          filters: {
            $and: activeChannel?.filters?.default?.$and || [],
            $or: [
              {
                offline: {
                  $ne: true,
                },
              },
              {
                offline: {
                  $null: true,
                },
              },
            ],
          },
          pagination: {
            pageSize: limit,
            page: 1,
          },
          sort: getSortOrder(),
        },
        { encodeValuesOnly: true }
      );

      QRes = await requestCMS.get(
        `${getCmsApiHost()}/api/template-items?${query}`
      );
    }

    const promptGroupRes = topTemplates
      .concat(QRes?.data?.data)
      .slice(0, limit);

    const tPromptGroupRes = Array.from(
      new Map(promptGroupRes.map((item: any) => [item.id, item])).values()
    );

    if (promptGroupRes.length > 0) {
      setTemplates(tPromptGroupRes);
      setLoading(false);
    }
  };

  const toDetail = () => {
    if (!activeChannel) {
      return;
    }
    const id = channel.documentId;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/channel/floor?channelId=${id}&tagId=${tagId}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        `/mobile/channel/floor?channelId=${id}&tagId=${tagId}&appid=${getAppId()}`
      );
    }
  };

  return (
    <div className={cls([styles.templateFloor, styles[appid]])}>
      <div
        className='flex items-center justify-between'
        style={{
          marginBottom: 6,
        }}
      >
        <div className={styles.floorTitle}>{channel?.name}</div>
        {showMore && (
          <div
            className={styles.more}
            onClick={() => toDetail()}
            style={{
              color,
            }}
          >
            查看全部
            <Icon name='right-bold' size={20} />
          </div>
        )}
      </div>
      {channel?.children.length > 1 && (
        <div className={styles.floorTags}>
          {channel?.children.map((item: Channel) => {
            const isActive = item.documentId === tagId;
            return (
              <div
                key={item.id}
                className={cls([styles.tag, isActive && styles.active])}
                style={
                  color
                    ? {
                        color: isActive ? color : 'rgba(0, 0, 0, 0.88)',
                        borderColor: isActive ? color : '#0000000F',
                        backgroundColor: isActive ? '#fff' : '#fff',
                      }
                    : {}
                }
                onClick={() => onChangeTagId(item.documentId)}
              >
                {item.name}
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.templateList}>
        <div
          className={cls([styles.scrollList, 'grid-cols-3'])}
          ref={scrollRef}
        >
          {templates.map(item => (
            <TemplateCard template={item} key={item.template_id} />
          ))}
        </div>

        {loading && (
          <div className={styles.loading}>
            <Loading />
          </div>
        )}
      </div>
      {!showMore && (
        <div className={styles.moreBottom} onClick={() => toDetail()}>
          <span>查看更多</span>
        </div>
      )}
    </div>
  );
};

export default TemplateChannelFloor;
