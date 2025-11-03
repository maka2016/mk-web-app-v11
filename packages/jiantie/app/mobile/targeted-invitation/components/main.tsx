'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { request, worksServerV2 } from '@/services';
import { getWorkDetail2 } from '@/services/works2';
import { useStore } from '@/store';
import { toOssMiniPCoverUrl } from '@/utils';
import { toVipPage } from '@/utils/jiantie';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';

const tabs = [
  {
    icon: 'add-one',
    name: '创建邀请',
  },
  {
    icon: 'list-checkbox',
    name: '邀请管理',
  },
];

const pageSize = 10;

interface Person {
  id: number;
  name: string;
  lastVisitedAt: string;
  visitedCount: number;
  uniqueTitle: string;
}

interface InviteBatch {
  personCount: number;
  id: number;
  createdAt: string;
  persons: Array<Person>;
  stat: {
    visitorCount: number;
    sentCount: number;
    sentPersonCount: number;
    visitedCount: number;
  };
}

const Main = () => {
  const searchParams = useSearchParams();
  const worksId = searchParams.get('works_id');
  const [worksInfo, setWorksInfo] = useState<Record<string, any>>();
  const [activeTab, setActiveTab] = useState(0);
  const [title, setTitle] = useState('诚邀{姓名}莅临');
  const [persons, setPersons] = useState('');
  const [creating, setCreating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [list, setList] = useState<InviteBatch[]>([]);
  const [update, setUpdate] = useState(0);
  const [total, setTotal] = useState(0);
  const { permissions, setVipShow } = useStore();
  const [isMiniProgram, setIsMiniProgram] = useState(false);
  const [showMiniPTip, setShowMiniPTip] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMiniProgram(APPBridge.judgeIsInMiniP());
    }
  }, []);

  const getWorkDetailInfo = async () => {
    if (!worksId) return;
    const detail = (await getWorkDetail2(worksId)) as any;
    if (!detail) {
      toast.error('获取作品详情失败');
      return;
    }
    toast.dismiss();
    setWorksInfo(detail);
  };

  const getInviteBatch = async () => {
    const res: any = await request.get(`${worksServerV2()}/invite-batch`, {
      params: {
        workId: worksId,
        page,
        pageSize,
        incPersons: true,
        incStat: true,
      },
    });

    if (res.data) {
      setList(page === 1 ? res.data : list.concat(res.data));
      setLoading(false);
      setFinished(res.data.length < pageSize);
      setTotal(res.meta.pagination.total);
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      getInviteBatch();
    }
  }, [activeTab, page, update]);

  useEffect(() => {
    if (worksId) {
      getWorkDetailInfo();
    }
  }, [worksId]);

  function smartSplit(text: string) {
    return text
      .replace(/\r\n/g, '\n') // 统一换行符
      .split(/[\n，,;；\s]+/) // 分割
      .map(item => item.trim()) // 清理空格
      .filter(item => item); // 移除空项
  }

  const createInvite = async () => {
    if (!permissions.gen_invite_link) {
      toVipPage();
      return;
    }
    if (creating) return;
    setCreating(true);
    const res = await request.post(`${worksServerV2()}/invite-batch`, {
      workId: worksId,
      titleTemplate: title.replace('{姓名}', '{name}'),
      persons: smartSplit(persons),
    });

    setTitle('');
    setPersons('');
    setCreating(false);
    setWaiting(true);
    setTimeout(() => {
      setWaiting(false);
      setActiveTab(1);
      setUpdate(update + 1);
    }, 3000);
  };

  const loadMore = () => {
    if (loading) return;
    setLoading(true);
    setPage(page + 1);
  };

  const onShare = (item: Person) => {
    if (APPBridge.judgeIsInMiniP()) {
      const shareLink = `${location.origin}/viewer2/${worksId}?inviteId=${item.id}`;
      APPBridge.setShareInfo2MiniP({
        title: `${item.uniqueTitle}|${worksInfo?.title}`,
        imageUrl: toOssMiniPCoverUrl(worksInfo?.cover),
        path: `/pages/viewer/index?url=${encodeURIComponent(shareLink)}&works_id=${worksId}`,
      });
      setShowMiniPTip(true);
      return;
    }
    APPBridge.appCall({
      type: 'MKShare',
      params: {
        title: `${item.uniqueTitle}|${worksInfo?.title}`,
        content: worksInfo?.description,
        thumb: `${cdnApi(worksInfo?.cover, {
          resizeWidth: 120,
          format: 'webp',
        })}`,
        type: 'link',
        shareType: 'wechat', //微信好友：wechat， 微信朋友圈：wechatTimeline，复制链接：copyLink，二维码分享：qrCode，更多(系统分享)：system
        url: `${location.origin}/viewer2/${worksId}?inviteId=${item.id}`, // 只传一个链接
      },
    });
  };

  return (
    <div className='h-full flex flex-col '>
      <MobileHeader className='flex-shrink-0' title='定向邀请' />
      <div className='flex-1  flex flex-col overflow-hidden'>
        <div className={styles.worksInfo}>
          <div className={styles.cover}>
            <img src={worksInfo?.cover} />
          </div>
          <div>
            <div className={styles.title}>{worksInfo?.title}</div>
            <div className={styles.desc}>定向邀请管理</div>
          </div>
        </div>
        <div className='px-3 py-2 flex-shrink-0'>
          <div className={styles.tabs}>
            {tabs.map((item, index) => (
              <div
                key={index}
                className={cls([
                  styles.tabItem,
                  index === activeTab && styles.active,
                ])}
                onClick={() => setActiveTab(index)}
              >
                <Icon name={item.icon} size={14} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
        {activeTab === 0 && (
          <div className={styles.main}>
            <div className='flex flex-col gap-2 p-2'>
              <div className={styles.setting}>
                <div className={styles.title}>
                  <Icon size={16} name='team' />
                  <span>受邀人员</span>
                </div>
                <div className={styles.desc}>
                  输入受邀人姓名，支持换行、逗号分隔，单次最多50人
                </div>
                <div className={styles.label}>受邀人姓名</div>
                <div className={styles.textarea}>
                  <textarea
                    placeholder='请输入受邀人姓名'
                    className={styles.input}
                    value={persons}
                    onChange={e => {
                      setPersons(e.target.value);
                    }}
                  />
                  <div className={styles.wordLimit}>{persons.length}/100</div>
                </div>
                <div className={styles.tip}>
                  当前输入{smartSplit(persons).length}人
                </div>
              </div>
              <div className={styles.setting}>
                <div className={styles.title}>
                  <Icon size={16} name='team' />
                  <span>自定义标题</span>
                </div>
                <div className={styles.desc}>
                  为每个邀请人定制专属标题，让分享更具个人化魅力
                </div>
                <div className={styles.label}>邀请标题</div>

                <div className={styles.textarea}>
                  <textarea
                    placeholder='请输入邀请标题'
                    className={styles.input}
                    value={title}
                    onChange={e => {
                      const value = e.target.value;
                      setTitle(value);
                    }}
                  />

                  <div className={styles.wordLimit}>1/100</div>
                </div>

                <div className={styles.previewTitle}>
                  <Icon name='iphone' size={16} color='#71717A' />
                  <span>微信分享预览</span>
                </div>
                <div className={styles.preview}>
                  <div className={styles.previewContent}>
                    <div className={styles.triangle}></div>
                    <div className={styles.tit}>
                      {title.replace(
                        '{姓名}',
                        smartSplit(persons)?.[0] || '张三'
                      )}
                      ｜{worksInfo?.title}
                    </div>
                    <div className={styles.img}>
                      <img src={worksInfo?.cover} />
                    </div>
                    <div className={styles.logo}>
                      <img src={cdnApi('/cdn/webstore10/huiyao/logo.png')} />
                      <span>会邀</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <Button className='w-full' onClick={() => createInvite()}>
                生成邀请链接
              </Button>
            </div>

            {waiting && (
              <div className={styles.loading}>
                <Icon name='check-g8c551ho' size={48} color='#008A2E' />
                <div className={styles.tit}>邀请链接生成成功</div>
                <div className={styles.desc}>邀请链接生成成功</div>

                <div className={styles.count}>
                  <span className={styles.countLabel}>总邀请数</span>
                  <span className={styles.num}>3</span>
                </div>

                <div className={styles.tip}>3秒后自动跳转到邀请管理...</div>
              </div>
            )}
          </div>
        )}
        {activeTab === 1 && (
          <div className={styles.main}>
            {list.length === 0 && finished && (
              <div className={styles.empty}>
                <img src={cdnApi('/cdn/webstore10/common/empty.png')} alt='' />
                <span>暂无定向邀请</span>
                <Button
                  size='sm'
                  onClick={() => {
                    setActiveTab(0);
                  }}
                >
                  创建邀请
                </Button>
              </div>
            )}
            <InfiniteScroll
              initialLoad={false}
              pageStart={0}
              loadMore={loadMore}
              hasMore={!finished}
              useWindow={false}
              className='flex flex-col gap-2 p-2'
            >
              {list.map((item, index) => (
                <div className={styles.setting} key={index}>
                  <div className={styles.title}>
                    第{total - index}批-
                    {dayjs(item.createdAt).format('YYYY.MM.DD')}
                  </div>
                  <div className={styles.desc}>
                    <Icon name='send-one' size={14} />
                    <span className='mr-3'>
                      {dayjs(item.createdAt).format('MM月DD日')}
                    </span>
                    <Icon name='preview' size={14} />
                    <div>
                      <span className={styles.num}>
                        {item.stat.visitedCount}
                      </span>
                      /{item.personCount} 已查看
                    </div>
                  </div>
                  <div className='flex flex-col gap-2 mt-2'>
                    {item.persons.map(person => (
                      <div className={styles.linkItem} key={person.id}>
                        <div>
                          <div className={styles.name}>
                            {person.name}{' '}
                            <div
                              className={cls([
                                styles.status,
                                person.visitedCount > 0 && styles.success,
                              ])}
                            >
                              {person.visitedCount > 0 ? '已查看' : '未查看'}
                            </div>
                          </div>
                          {person.visitedCount > 0 && (
                            <>
                              <div className={styles.desc}>
                                点击 {person.visitedCount} 次
                              </div>
                              <div className={styles.desc}>
                                最后访问于
                                {dayjs(person.lastVisitedAt).format(
                                  'MM月DD日 HH:mm'
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <div className='flex items-center gap-4'>
                          {/* <div className={styles.btnSend} >
                            <Icon
                              name="mail"
                              size={24}
                              color="var(--theme-color)"
                            />
                            <span>发送短信</span>
                          </div> */}
                          <div
                            className={styles.btnSend}
                            onClick={() => onShare(person)}
                          >
                            <Icon
                              name='WeChat-fill'
                              size={24}
                              color='#24DB5A'
                            />
                            <span>微信分享</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </InfiniteScroll>
          </div>
        )}
      </div>
      <ResponsiveDialog
        isDialog
        isOpen={showMiniPTip}
        onOpenChange={setShowMiniPTip}
        contentProps={{
          className: 'w-full bg-transparent  top-[5%] translate-y-[0%]',
        }}
      >
        <div
          className={styles.shareOverlay}
          onClick={() => setShowMiniPTip(false)}
        >
          <img
            src={cdnApi('/cdn/webstore10/jiantie/share_arrow.png')}
            alt=''
            className={styles.arrow}
          />
          <div className={styles.tip}>
            点击右上角&quot;
            <div className={styles.icon}>
              <Icon name='more-ga3j8jod' />
            </div>
            &quot;进行分享哦
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};
export default Main;
