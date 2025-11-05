'use client';

import Chanel2 from '@/app/mobile/channel2/page';
import Home from '@/app/mobile/channel/page';
import Mine from '@/app/mobile/mine/page';
import Works from '@/app/mobile/works/page';
import { getUid, request } from '@/services';
import useIsMobile from '@/utils/use-mobile';
import APPBridge from '@mk/app-bridge';
import { API, cdnApi } from '@mk/services';
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

  const getUnReadNotifications = async () => {
    const uid = getUid();
    const subscriberId = `${appid}_${uid}`;
    const res: any = await request.get(
      `${API('apiv10')}/notify-proxy/v1/subscribers/${subscriberId}/notifications/feed`,
      {
        params: {
          page: 0,
          limit: 1,
          read: false,
        },
      }
    );

    setUnread(res.totalCount);
  };

  useEffect(() => {
    getUnReadNotifications();
    setIsMiniProgram(APPBridge.judgeIsInMiniP());

    // (window as any)?.["MKAPPCloseModal"] = () => {
    //   // setVipShow(false);
    // };
  }, []);

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
              <img src={logos[appid]} alt='' className={styles.logo} />
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
