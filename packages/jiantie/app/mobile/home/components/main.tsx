'use client';

import Home from '@/app/mobile/channel/page';
import Chanel2 from '@/app/mobile/channel2/page';
import Mine from '@/app/mobile/mine/page';
import Works from '@/app/mobile/works/page';
import { getUid } from '@/services';
import { trpc } from '@/utils/trpc';
import useIsMobile from '@/utils/use-mobile';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './index.module.scss';

const beian: any = {
  xueji: {
    name: '码卡(广州)科技有限公司',
    no1: '粤ICP备14001206号',
    no2: '44030502004249',
  },
  jiantie: {
    name: '码卡(广州)科技有限公司',
    no1: '粤ICP备14001206号',
    no2: '44030502004249',
  },
  huiyao: {
    name: '码卡(广州)科技有限公司',
    no1: '粤ICP备14001206号',
    no2: '44030502004249',
  },
};

const logos: Record<string, string> = {
  huiyao: cdnApi('/cdn/webstore10/huiyao/huiyao_logo.png'),
  xueji: cdnApi('/cdn/webstore10/xueji/xueji_logo2.png'),
  jiantie: cdnApi('/cdn/webstore10/jiantie/jiantie_logo2.png?v=1'),
};

interface Props {
  defaultTab?: string;
  appid: string;
  templateChannels?: any;
  storeChannelV1?: boolean;
  isMiniProgram?: boolean;
}

const TabLayout = (props: Props) => {
  const { defaultTab, appid, templateChannels, storeChannelV1 } = props;
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 读取 tab 参数，如果没有则使用 defaultTab
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl ? +tabFromUrl : defaultTab ? +defaultTab : 0;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [payload, setPayload] = useState<any>();
  const [isMiniProgram, setIsMiniProgram] = useState(props.isMiniProgram);
  const isMobile = useIsMobile();

  const onChangeTab = (val: number, params?: any) => {
    setActiveTab(val);
    setPayload(params);

    // 更新 URL 参数
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', val.toString());
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };
  const [unread, setUnread] = useState(0);
  const [doubleClickCount, setDoubleClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);

  const getUnReadNotifications = async () => {
    try {
      const uid = getUid();
      if (!uid) {
        setUnread(0);
        return;
      }
      const res = await trpc.rsvp.getUnreadNotificationCount.query({
        user_id: uid,
      });
      setUnread(res.count || 0);
    } catch (error) {
      console.error('Failed to get RSVP notifications:', error);
      setUnread(0);
    }
  };

  useEffect(() => {
    // getUnReadNotifications();
    setIsMiniProgram(APPBridge.judgeIsInMiniP());

    // (window as any)?.["MKAPPCloseModal"] = () => {
    //   // setVipShow(false);
    // };

    // 清理定时器
    return () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
    };
  }, [clickTimer]);

  const getTabs = () => {
    if (false && appid === 'jiantie') {
      return [
        { label: '模板', key: 'home', component: Chanel2 },
        { label: '作品', key: 'works', component: Works },
        { label: '我的', key: 'mine', component: Mine },
      ];
    } else {
      return [
        { label: '模板', key: 'home', component: Home },
        { label: '作品', key: 'works', component: Works },
        { label: '我的', key: 'mine', component: Mine },
      ];
    }
  };

  const toNotificationCenter = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/notification-center?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/rsvp/notifications?appid=${appid}`);
    }
    // if (APPBridge.judgeIsInApp()) {
    //   APPBridge.navToPage({
    //     url: `${location.origin}/mobile/notification-center?is_full_screen=1`,
    //     type: 'URL',
    //   });
    // } else {
    //   router.push(`/mobile/notification-center?appid=${appid}`);
    // }
  };

  // 后门：三次双击跳转到 home2（仅 jiantie 应用）
  const handleLogoDoubleClick = () => {
    // 只在 jiantie 应用中启用
    if (appid !== 'jiantie') {
      return;
    }

    const newCount = doubleClickCount + 1;
    setDoubleClickCount(newCount);

    // 清除之前的定时器
    if (clickTimer) {
      clearTimeout(clickTimer);
    }

    // 如果达到3次双击，跳转到 home2
    if (newCount >= 3) {
      console.log('触发后门：跳转到 home2');
      router.push('/mobile/home2');
      setDoubleClickCount(0);
      return;
    }

    // 设置定时器，3秒后重置计数
    const timer = setTimeout(() => {
      setDoubleClickCount(0);
    }, 3000);
    setClickTimer(timer);
  };

  // 渲染每个 tab 对应的页面
  const renderTabContent = () =>
    getTabs().map((tab, index) => {
      const TabComponent: any = tab.component;

      return (
        <div
          key={tab.key}
          className={cls([styles.tabContent, styles[appid]])}
          style={{ display: activeTab === index ? 'block' : 'none' }}
        >
          {tab.key === 'home' && !isMiniProgram && (
            <div className={styles.head}>
              <img
                src={logos[appid]}
                alt=''
                className={styles.logo}
                onDoubleClick={handleLogoDoubleClick}
              />
              <div className='flex items-center gap-3'>
                {/* {(vipABTest !== 'work' || appid !== 'jiantie') && (
                  <div
                    className={styles.vip}
                    onClick={() => navigateToVipPage()}
                  >
                    <img src={cdnApi('/cdn/webstore10/huiyao/icon_vip.png')} />
                    <span> 企业版</span>
                  </div>
                )} */}
                <div
                  className={styles.message}
                  onClick={() => toNotificationCenter()}
                >
                  <Icon name='remind1' size={20} />
                  {unread > 0 && <div className={styles.num}>{unread}</div>}
                </div>
              </div>
            </div>
          )}

          <TabComponent
            storeChannelV1={storeChannelV1}
            active={activeTab === index}
            onChangeTab={onChangeTab}
            isMobile={true}
            appid={appid}
            templateChannels={templateChannels}
            {...payload}
          />
        </div>
      );
    });

  return (
    <div
      className={cls(styles.container, 'h-dvh flex flex-col overflow-hidden')}
    >
      {/* Tab 内容区域 */}
      <div className={cls(styles.content, 'flex-1 overflow-hidden')}>
        {renderTabContent()}
      </div>

      {/* 底部 Tab 栏 */}
      <div className={cls(styles.tabBar, '')}>
        {getTabs().map((tab, index) => {
          return (
            <button
              key={tab.key}
              className={cls([
                styles.tabItem,
                activeTab === index && styles.active,
              ])}
              onClick={() => onChangeTab(index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/*
      <MiniPShare
        title="简帖-重要时刻邀请函"
        imageUrl="https://res.maka.im/assets/jiantie/%E7%AE%80%E5%B8%96.png"
        path="/pages/home/index?from=share"
      /> */}

      {!isMobile && appid && (
        <div className='flex items-center text-xs justify-center text-neutral-500'>
          @2024-{new Date().getFullYear()} {beian[appid].name}
          <a
            className='ml-2'
            href='https://beian.miit.gov.cn/'
            rel='nofollow'
            target='_blank'
          >
            {beian[appid].no1}
          </a>
          {/* <img
            className="w-4 ml-4 mr-1"
            src={cdnApi("/cdn/webstore10/common/20241225-100326.png")}
          />
          <a
            href={`https://beian.mps.gov.cn/#/query/webSearch?code=${beian[appid].no2}`}
            rel="noreferrer"
            target="_blank"
          >
            粤公网安备{beian[appid].no2}
          </a> */}
        </div>
      )}
    </div>
  );
};

export default TabLayout;
