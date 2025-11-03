import React, { useEffect, useState } from 'react';
import { MkPinTuanProps } from '../shared';
import './index.scss';
import { API, cdnApi, request } from '@mk/services';
import { createPortal } from 'react-dom';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { EventEmitter, isWechat, queryToObj } from '@mk/utils';
import { Icon } from '@workspace/ui/components/Icon';
import toast from 'react-hot-toast';
import Countdown from './Countdown';
import InfiniteScroll from 'react-infinite-scroller';
import { worksServerV2 } from '../shared/api';
import dayjs from 'dayjs';
var relativeTime = require('dayjs/plugin/relativeTime');
import { useRouter, useSearchParams } from 'next/navigation';
import APPBridge from '@mk/app-bridge';

dayjs.extend(relativeTime);
require('dayjs/locale/zh-cn');
dayjs.locale('zh-cn'); // 全局使用简体中文

const defaultAvatar =
  'https://makapicture.oss-cn-beijing.aliyuncs.com/cdn/viewer/default_wx_avatar.png';
const defaultName = '微信昵称';

const pageSize = 30;

const typeMap: any = {
  friend: '助力',
  share: '分享微信好友',
  shareTimeline: '分享朋友圈',
};

const scoreMap: any = {
  friend: 1,
  share: 2,
  shareTimeline: 3,
};

interface Record {
  avatar?: string;
  nickname?: string;
  phone?: string;
  createdAt: string;
  score: number;
  type: string;
}

const templateRecords = [
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '刚刚',
    score: 1,
    type: 'friend',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '1分钟前',
    score: 3,
    type: 'shareTimeline',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '3分钟前',
    score: 1,
    type: 'friend',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '3分钟前',
    score: 1,
    type: 'friend',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '3分钟前',
    score: 1,
    type: 'friend',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '3分钟前',
    score: 1,
    type: 'friend',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '3分钟前',
    score: 1,
    type: 'friend',
  },
  {
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
    nickname: '仅供预览的用户名',
    createdAt: '3分钟前',
    score: 1,
    type: 'friend',
  },
];

const BoostActivity: React.FC<{
  controledValues: MkPinTuanProps;
  viewerSDK: any;
}> = props => {
  const { controledValues, viewerSDK } = props;

  const { boostActivityId } = controledValues;
  const [subBoostActivityDetail, setSubBoostActivityDetail] = useState<any>();
  const [submitting, setSubmitting] = useState(false);
  const [expand, setExpand] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasAuth, setHasAuth] = useState(false);
  const [wechatInfo, setWechatInfo] = useState({
    wx_avatar: '',
    wx_nickname: '',
    openId: '',
  });
  const [subBoostActivityId, setSubBoostActivityId] = useState<number>();
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [canBoost, setCanBoost] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [showShareTips, setShowShareTips] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [templateExpand, setTemplateExpand] = useState(false);

  const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';
  const isTemplate = /^T_/.test(worksId);

  const checkBoosted = async () => {
    const res: any = await request.get(
      `${worksServerV2()}/boost-activity/sub-activity/${subBoostActivityId}/boosted`,
      {
        params: {
          openId: wechatInfo.openId,
        },
      }
    );

    if (res) {
      setCanBoost(!res.status);
    }
  };

  useEffect(() => {
    setHasAuth(viewerSDK.wechatInfo.getHasAuth?.());
    setWechatInfo({
      wx_avatar: viewerSDK?.wechatInfo?.getWxAvatarThumb?.(),
      wx_nickname: viewerSDK?.wechatInfo?.getNickname?.(),
      openId: viewerSDK?.wechatInfo?.getOpenID?.() || '',
    });
    const query = queryToObj();
    if (query.subBoostActivityId) {
      setSubBoostActivityId(query.subBoostActivityId);
    }
    return () => {};
  }, []);

  const getSubActivityDetail = async () => {
    const res: any = await request.get(
      `${worksServerV2()}/boost-activity/sub-activity/${subBoostActivityId}`
    );

    if (res.boostActivity.id !== controledValues.boostActivityId) {
      return;
    }
    setSubBoostActivityDetail(res);
    if (res.openId !== wechatInfo.openId) {
      checkBoosted();
    }
  };

  const getBoostRecods = async () => {
    const res: any = await request.get(
      `${worksServerV2()}/boost-activity/sub-activity/${subBoostActivityId}/records`,
      {
        params: {
          page,
          pageSize,
        },
      }
    );
    if (res.list) {
      setRecords(res.list);
      setLoading(false);
      setFinished(res.list.length < pageSize);
      setTotalScore(res.totalScore);
    } else {
      setLoading(false);
      setFinished(true);
    }
  };

  useEffect(() => {
    if (subBoostActivityId) {
      getSubActivityDetail();
      getBoostRecods();
    }
  }, [subBoostActivityId]);

  const loadMore = () => {
    if (loading || finished) return;
    setLoading(true);
    setPage(page + 1);
  };

  const replaceUrlArg = (argVal: any) => {
    const params = new URLSearchParams(searchParams);
    params.set('subBoostActivityId', argVal);

    // 使用 router.replace + shallow 模式
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });

    viewerSDK?.viewerController?.reconfigWechatShare?.({
      url: `${location.origin}${location.pathname}?${params.toString()}`,
    });
  };

  const sendEvent = () => {
    const uid = viewerSDK?.workInfo?.getUID?.();
    const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';

    const appid = queryToObj().appid || 'jiantie';
    const url = `${API('apiv10')}/notify-proxy/v1/events/trigger`;
    const res = request.post(url, {
      name: 'event-lead-received',
      payload: {
        details_url: `${location.origin}/mobile/data-visible/boost?works_id=${worksId}&is_full_screen=1`,
      },
      to: [
        {
          subscriberId: `${appid}_${uid}`,
        },
      ],
    });
  };

  const createSubActivity = async () => {
    if (!isWechat()) {
      toast.error('请在微信环境打开');
      return;
    }
    if (!boostActivityId) {
      toast.error('活动错误');
      return;
    }
    if (!hasAuth) {
      EventEmitter.emit('wxAuth', '');
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    try {
      const res: any = await request.post(
        `${worksServerV2()}/boost-activity/${boostActivityId}/sub-activity`,
        {
          openId: wechatInfo.openId,
          nickname: wechatInfo.wx_nickname,
          avatar: wechatInfo.wx_avatar,
        }
      );
      console.log('res', res);
      if (res?.id) {
        sendEvent();
        replaceUrlArg(res.id);
        setSubBoostActivityId(res.id);
        setShowCreateSuccess(true);
      }
      setSubmitting(false);
    } catch (error) {
      setSubmitting(false);
      console.log('er创建失败ror', error);
      toast.error('创建失败');
    }
  };

  const onBoost = async (type = 'friend') => {
    if (!isWechat()) {
      toast.error('请在微信环境打开');
      return;
    }

    if (APPBridge.judgeIsInMiniP()) {
      toast.error('请分享后使用此功能');
      return;
    }

    if (!subBoostActivityDetail) {
      return;
    }

    if (!hasAuth) {
      EventEmitter.emit('wxAuth', '');
      return;
    }

    try {
      const res: any = await request.post(
        `${worksServerV2()}/boost-activity/sub-activity/${subBoostActivityId}/boost`,
        {
          openId: wechatInfo.openId,
          nickname: wechatInfo.wx_nickname,
          avatar: wechatInfo.wx_avatar,
          type,
        }
      );
      const nextValue = [
        {
          avatar: res.avatar,
          phone: res.phone,
          nickname: res.nickname,
          createdAt: res.createdAt,
          score: res.score,
          type: res.type,
        },
        ...records,
      ];
      setRecords(nextValue);
      setTotalScore(totalScore + scoreMap[type]);
      if (type === 'friend') {
        setCanBoost(false);
      }
    } catch (error: any) {
      console.log('error', error);
      if (type === 'friend') {
        toast.error(error.response?.data?.msg || '助力失败');
      }
    }
  };

  const onClickItem = () => {
    if (!isWechat()) {
      toast.error('请在微信环境打开');
      return;
    }
    if (APPBridge.judgeIsInMiniP()) {
      toast.error('请分享后使用此功能');
      return;
    }
    if (!subBoostActivityDetail) {
      createSubActivity();
    } else if (subBoostActivityDetail.openId === wechatInfo.openId) {
      // 分享
      setShowShareTips(true);
    } else {
      // 助力
      if (!canBoost) {
        return;
      }
      onBoost('friend');
    }
  };

  const maskPhoneNumber = (phone: string) => {
    // 参数校验：非空检查 + 类型转换
    if (phone == null || phone === '') return '';
    const phoneStr = String(phone).trim();

    // 核心打码逻辑：正则分组替换
    return phoneStr.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  return (
    <div className=''>
      {createPortal(
        <div
          id='mk-pintuan-screen-portal'
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            bottom: 0,
            right: 0,
            zIndex: '31',
            overflow: 'hidden',
            pointerEvents: 'none', // Allow clicking through the container
          }}
        >
          {showShareTips && (
            <div
              className='boostShareOverlay'
              onClick={() => setShowShareTips(false)}
            >
              <img
                src={cdnApi('/cdn/webstore10/jiantie/share_arrow.png')}
                alt=''
                className='arrow'
              />
              <div className='tip'>
                点击右上角&rdquo;
                <div className='icon'>
                  <Icon name='more-ga3j8jod' />
                </div>
                &quot;进行分享哦
              </div>
              <div className='shareTypes'>
                <div className='shareTypeItem'>
                  <Icon name='friends-circle' size={24} />
                  <p className='tit'>发送朋友圈</p>
                  <p className='desc'>
                    获得助力<span>+3</span>
                  </p>
                </div>

                <div className='shareTypeItem'>
                  <Icon name='team' size={24} />
                  <p className='tit'>发送微信群</p>
                  <p className='desc'>
                    获得助力<span>+2</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          {!isTemplate && !showCreateSuccess && (
            <div className='boost_activity_footer'>
              <div className='mk_pintuan_btn'>
                {subBoostActivityDetail && (
                  <div className='expand'>
                    <Icon
                      name={expand ? 'down-bold' : 'up-bold'}
                      size={16}
                      onClick={() => {
                        setExpand(!expand);
                      }}
                    />
                  </div>
                )}
                {subBoostActivityDetail?.avatar && (
                  <div className='avatar'>
                    <img
                      src={subBoostActivityDetail?.avatar || defaultAvatar}
                    />
                  </div>
                )}
                <div className='btn_content'>
                  <span className='tit'>
                    {maskPhoneNumber(subBoostActivityDetail?.phone) ||
                      subBoostActivityDetail?.nickname ||
                      defaultName}
                  </span>
                  <span className='desc'>
                    {subBoostActivityDetail
                      ? `已有${totalScore}人助力`
                      : '助力赢奖励'}
                  </span>
                </div>
              </div>
              <div
                className='mk_pintuan_btn_right'
                style={{
                  background: canBoost
                    ? 'linear-gradient(97.36deg,#ff9e06 9.15%, #ff0019 67.27%,#ff00a9 105.25%)'
                    : '#71717A',
                }}
                onClick={() => onClickItem()}
              >
                <img
                  src={
                    canBoost
                      ? 'https://img2.maka.im/cdn/webstore10/xueji/mk_pintuan_btn_right.png'
                      : 'https://img2.maka.im/cdn/webstore10/xueji/mk_pintuan_btn_right_disabled.png'
                  }
                  className='mk_pintuan_btn_c'
                />
                {subBoostActivityDetail ? (
                  <>
                    <span>
                      {subBoostActivityDetail?.openId === wechatInfo?.openId
                        ? '分享助力'
                        : canBoost
                          ? '为TA助力'
                          : '已助力'}
                    </span>
                    <Countdown endDate={subBoostActivityDetail?.endTime} />
                  </>
                ) : (
                  <span>发起我的助力</span>
                )}
              </div>
            </div>
          )}
          {/* 模板预览 */}
          {isTemplate && (
            <div className='boost_activity_footer'>
              <div className='mk_pintuan_btn'>
                <div className='expand'>
                  <Icon
                    name={expand ? 'down-bold' : 'up-bold'}
                    size={16}
                    onClick={() => {
                      setTemplateExpand(!templateExpand);
                    }}
                  />
                </div>
                <div className='avatar'>
                  <img src='https://img2.maka.im/cdn/webstore10/xueji/avatars/image-7.png' />
                </div>
                <div className='btn_content'>
                  <span className='tit'>微信昵称</span>
                  <span className='desc'>已有32人助力</span>
                </div>
              </div>
              <div
                className='mk_pintuan_btn_right'
                style={{
                  background: canBoost
                    ? 'linear-gradient(97.36deg,#ff9e06 9.15%, #ff0019 67.27%,#ff00a9 105.25%)'
                    : '#71717A',
                }}
                onClick={() => setTemplateExpand(true)}
              >
                <img
                  src={
                    'https://img2.maka.im/cdn/webstore10/xueji/mk_pintuan_btn_right.png'
                  }
                  alt=''
                  className='mk_pintuan_btn_c'
                />
                <span>分享助力</span>
                <Countdown
                  endDate={new Date(Date.now() + 86400000).toISOString()}
                />
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
      <ResponsiveDialog
        isOpen={expand}
        onOpenChange={setExpand}
        showOverlay={false}
        contentProps={{
          style: {
            borderRadius: '30px 30px 0 0',
          },
        }}
      >
        <div className='boost_activity_detail'>
          <div className='title'>助力进度</div>
          <Icon
            name='close'
            size={18}
            className='icon_close'
            onClick={() => setExpand(false)}
          />
          <div className='progress_content'>
            <div className='progress_title'>
              <img src='https://img2.maka.im/cdn/webstore10/xueji/icon_hot.png' />
              还需
              <span>
                {Math.max(
                  subBoostActivityDetail?.boostActivity?.requiredPeople -
                    totalScore,
                  0
                )}
              </span>
              人，即可完成目标
            </div>
            <div className='progress'>
              <div className='progress_bar'>
                <div
                  className='progress_bar_inner'
                  style={{
                    width: `${(totalScore / subBoostActivityDetail?.boostActivity?.requiredPeople) * 100}%`,
                  }}
                >
                  <div className='progress_bar_thumb'>
                    {(totalScore /
                      subBoostActivityDetail?.boostActivity?.requiredPeople) *
                      100}
                    %
                  </div>
                </div>
              </div>
              <div className='progress_text'>
                <span>{totalScore}</span>/
                {subBoostActivityDetail?.boostActivity?.requiredPeople}人
              </div>
            </div>
          </div>
          <div className='boost_list'>
            <div className='boost_list_title'>
              <div className='boost_list_title_left'></div>
              <span>最新助力</span>
              <div className='boost_list_title_right'></div>
            </div>
            <div className='scroll_list'>
              {finished && records.length === 0 && (
                <div className='empty_tip'>
                  暂无助力，快点击下方👇分享链接获得助力吧～
                </div>
              )}
              <InfiniteScroll
                initialLoad={false}
                pageStart={0}
                loadMore={loadMore}
                hasMore={!finished}
                useWindow={false}
                className='flex flex-col gap-3'
              >
                {records.map((item, index) => (
                  <div className='boost_list_item' key={index}>
                    <div className='flex items-center gap-2'>
                      {item.avatar && (
                        <img
                          src={item.avatar || defaultAvatar}
                          alt=''
                          className='avatar'
                        />
                      )}
                      <span className='name'>
                        {item.phone || item.nickname || defaultName}
                      </span>
                    </div>
                    <div className='score'>
                      {typeMap[item.type]} +{item.score}
                    </div>
                    <div className='time'>
                      {(dayjs(item.createdAt) as any).fromNow()}
                    </div>
                  </div>
                ))}
              </InfiniteScroll>
            </div>
          </div>
          <div className='flex items-center w-full gap-2'>
            <div
              className='btn_share '
              onClick={() => {
                setShowShareTips(true);
                setTimeout(() => {
                  onBoost('share');
                }, 3000);
              }}
            >
              <Icon name='team' size={20} />
              <span>分享微信好友</span>
              <div className='score'>微信群+2</div>
            </div>
            <div
              className='btn_share_w flex-1'
              onClick={() => {
                setShowShareTips(true);
                setTimeout(() => {
                  onBoost('shareTimeline');
                }, 3000);
              }}
            >
              <Icon name='friends-circle' size={20} />
              <span>分享朋友圈</span>
              <div className='score'>朋友圈+3</div>
            </div>
          </div>

          {subBoostActivityDetail?.openId !== wechatInfo.openId && (
            <div className='create_sub'>
              <img src='https://img2.maka.im/cdn/webstore10/xueji/icon_boost.png' />
              <div
                className='flex items-center  flex-1'
                style={{
                  gap: 2,
                }}
              >
                <span className='font-semibold'>发起我的助力</span>
                <span>创建专属页面</span>
              </div>
              <div className='btn' onClick={() => createSubActivity()}>
                立即发起
              </div>
            </div>
          )}
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={templateExpand}
        onOpenChange={setTemplateExpand}
        showOverlay={false}
        contentProps={{
          style: {
            borderRadius: '30px 30px 0 0',
          },
        }}
      >
        <div className='boost_activity_detail'>
          <div className='title'>助力进度</div>
          <Icon
            name='close'
            size={18}
            className='icon_close'
            onClick={() => setTemplateExpand(false)}
          />
          <div className='progress_content'>
            <div className='progress_title'>
              <img
                src='https://img2.maka.im/cdn/webstore10/xueji/icon_hot.png'
                alt=''
              />
              还需
              <span>18</span>
              人，即可完成目标
            </div>
            <div className='progress'>
              <div className='progress_bar'>
                <div
                  className='progress_bar_inner'
                  style={{
                    width: `65%`,
                  }}
                >
                  <div className='progress_bar_thumb'>32%</div>
                </div>
              </div>
              <div className='progress_text'>
                <span>32</span>/ 50人
              </div>
            </div>
          </div>
          <div className='boost_list'>
            <div className='boost_list_title'>
              <div className='boost_list_title_left'></div>
              <span>最新助力</span>
              <div className='boost_list_title_right'></div>
            </div>
            <div className='scroll_list'>
              <div className='flex flex-col gap-3'>
                {templateRecords.map((item, index) => (
                  <div className='boost_list_item' key={index}>
                    <div className='flex items-center gap-2'>
                      {item.avatar && (
                        <img
                          src={item.avatar || defaultAvatar}
                          alt=''
                          className='avatar'
                        />
                      )}
                      <span className='name'>
                        {item.nickname || defaultName}
                      </span>
                    </div>
                    <div className='score'>
                      {typeMap[item.type]} +{item.score}
                    </div>
                    <div className='time'>{item.createdAt} </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='flex items-center w-full gap-2'>
            <div className='btn_share '>
              <Icon name='team' size={20} />
              <span>分享微信好友</span>
              <div className='score'>微信群+2</div>
            </div>
            <div className='btn_share_w flex-1'>
              <Icon name='friends-circle' size={20} />
              <span>分享朋友圈</span>
              <div className='score'>朋友圈+3</div>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={showCreateSuccess}
        onOpenChange={setShowCreateSuccess}
      >
        <div className='create_sub_success'>
          <div className='title'>发起助力</div>
          <Icon
            name='close'
            size={18}
            className='icon_close'
            onClick={() => setShowCreateSuccess(false)}
          />
          <div className='content'>
            <Icon name='check-one' size={64} color='#008A2E' />
            <p className='success_tip'>助力页面创建成功！</p>
            <div className='success_desc'>快分享给好友助力吧</div>
            <div className='detail'>
              <div className='user'>
                <div className='avatar'>
                  <img src={wechatInfo?.wx_avatar || defaultAvatar} />
                </div>
                <div>
                  <div className='name'>
                    {wechatInfo?.wx_nickname || defaultName}
                  </div>
                  <div className='desc'>助力发起成功</div>
                </div>
              </div>
              <div className='activity'>
                <div className='activity_item'>
                  <div className='item_label'>目标助力</div>
                  <div className='item_value'>
                    {subBoostActivityDetail?.boostActivity?.requiredPeople}人
                  </div>
                </div>
                <div className='activity_item'>
                  <div className='item_label'>目前进度</div>
                  <div className='item_value'>
                    {totalScore}/
                    {subBoostActivityDetail?.boostActivity?.requiredPeople}人
                  </div>
                </div>
                <div className='activity_item'>
                  <div className='item_label'>剩余时间</div>
                  <div className='item_value'>
                    {subBoostActivityDetail?.boostActivity?.timeLimit}小时
                  </div>
                </div>
              </div>
            </div>
            <div className='flex items-center w-full gap-2 mt-4'>
              <div
                className='btn_share flex-1'
                onClick={() => {
                  setShowShareTips(true);
                  setTimeout(() => {
                    onBoost('share');
                  }, 3000);
                }}
              >
                <Icon name='team' size={20} />
                <span>分享微信好友</span>
                <div className='score'>微信群+2</div>
              </div>
              <div
                className='btn_share_w flex-1'
                onClick={() => {
                  setShowShareTips(true);
                  setTimeout(() => {
                    onBoost('shareTimeline');
                  }, 3000);
                }}
              >
                <Icon name='friends-circle' size={20} />
                <span>分享朋友圈</span>
                <div className='score'>朋友圈+2</div>
              </div>
            </div>
            <div
              className='btn_view'
              onClick={() => {
                setShowCreateSuccess(false);
                setExpand(true);
              }}
            >
              查看助力进度
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default BoostActivity;
