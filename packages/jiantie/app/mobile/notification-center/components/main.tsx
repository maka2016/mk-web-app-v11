'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import styles from './index.module.scss';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import InfiniteScroll from 'react-infinite-scroller';
import { useEffect, useState } from 'react';
import { API, cdnApi } from '@mk/services';
import { getAppId, getUid, request } from '@/services';
import dayjs from 'dayjs';
import APPBridge from '@mk/app-bridge';
import { useRouter } from 'next/navigation';
import cls from 'classnames';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import toast from 'react-hot-toast';
import { Loading } from '@workspace/ui/components/loading';

interface NotificationItem {
  subject: string;
  payload: {
    details_url: string;
  };
  read: boolean;
  tags: string[];
  createdAt: string;
  _id: string;
}

const limit = 10;
const NotificationCenter = () => {
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(0);
  const [list, setList] = useState<NotificationItem[]>([]);
  const [update, setUpdate] = useState(0);
  const appid = getAppId();
  const router = useRouter();

  const getNotifications = async () => {
    try {
      const uid = getUid();
      const subscriberId = `${appid}_${uid}`;
      const res = await request.get(
        `${API('apiv10')}/notify-proxy/v1/subscribers/${subscriberId}/notifications/feed`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (res.data) {
        setList(page === 0 ? res.data : [...list, ...res.data]);
        setLoading(false);
        setFinished(res.data.length < limit);
      }
    } catch (error) {
      setFinished(true);
    }
  };

  // 全部已读
  const updateAllState = async () => {
    const uid = getUid();
    const subscriberId = `${appid}_${uid}`;

    await request.post(
      `${API('apiv10')}/notify-proxy/v1/subscribers/${subscriberId}/messages/mark-all`,
      {
        markAs: 'read',
      }
    );
  };

  // 删除通知
  const onDeleteMessgae = async (messageId: string) => {
    const res = await request.delete(
      `${API('apiv10')}/notify-proxy/v1/messages/${messageId}`
    );
    toast.success('删除成功！');
    setUpdate(update + 1);
    setPage(0);
    setFinished(false);
  };

  useEffect(() => {
    updateAllState();
  }, []);

  useEffect(() => {
    getNotifications();
  }, [update, page]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }

    setPage(page + 1);
  };

  return (
    <div className={styles.container}>
      <MobileHeader title='通知中心' className='w-full flex-shrink-0' />
      <div className={styles.tabs}></div>
      <div className={styles.content}>
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={loadMore}
          hasMore={!finished}
          useWindow={false}
          className={styles.list}
        >
          {list.map((item, index) => (
            <div
              className={cls([styles.listItem, !item.read && styles.unread])}
              key={index}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {item.tags.map(tag => (
                    <div key={tag} className={styles.tag}>
                      {tag}
                    </div>
                  ))}
                  <span className={styles.title}>{item.subject}</span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Icon name='more' size={18} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className='w-18'
                    side='bottom'
                    align='end'
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => onDeleteMessgae(item._id)}
                      >
                        <Icon
                          name='delete-g8c551hn'
                          size={18}
                          color='#EF4444'
                        />
                        <span className='text-[#EF4444]'>删除</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className={styles.time}>
                {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
              </div>
              {/* <div className={styles.desc}>1111111</div> */}
              <Button
                className='w-full'
                variant='outline'
                onClick={() => {
                  if (APPBridge.judgeIsInApp()) {
                    APPBridge.navToPage({
                      url: item.payload.details_url,
                      type: 'URL',
                    });
                  } else {
                    router.push(item.payload.details_url);
                  }
                }}
              >
                查看详情
              </Button>
            </div>
          ))}
          {loading && (
            <div className='flex items-center justify-center'>
              <Loading />
            </div>
          )}
        </InfiniteScroll>
        {list.length === 0 && finished && (
          <div className={styles.empty}>
            <img src={cdnApi('/cdn/webstore10/common/empty.png')} alt='' />

            <span>暂无通知</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
