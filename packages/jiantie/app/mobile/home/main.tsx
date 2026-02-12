'use client';

import Chanel2 from '@/app/mobile/channel2/homev2/page';
import Chanel3 from '@/app/mobile/channel2/homev3/page';
import Mine from '@/app/mobile/mine/page';
import Works from '@/app/mobile/works2/page';
import { cdnApi, getUid } from '@/services';
import { useStore } from '@/store';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const beian: any = {
  jiantie: {
    name: '码卡(广州)科技有限公司',
    no1: '粤ICP备14001206号',
    no2: '44030502004249',
  },
  maka: {
    name: '码卡(广州)科技有限公司',
    no1: '粤ICP备14001206号',
    no2: '44030502004249',
  },
  janur: {
    name: '码卡(广州)科技有限公司',
    no1: '粤ICP备14001206号',
    no2: '44030502004249',
  },
};

const logos: Record<string, string> = {
  jiantie: cdnApi('/cdn/webstore10/jiantie/jiantie_logo2.png?v=1'),
  maka: cdnApi('/cdn/webstore10/maka/maka_logo.png'),
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
  const t = useTranslations('HomePage');

  const useC3 = appid === 'janur';
  const ChanelComponent = !useC3 ? Chanel2 : Chanel3;

  const tabs = [
    { label: t('模板'), key: 'home', component: ChanelComponent },
    { label: t('作品'), key: 'works', component: Works },
    { label: t('我的'), key: 'mine', component: Mine },
  ];

  // 从 URL 读取 tab 参数，如果没有则使用 defaultTab
  const tabFromUrl = searchParams.get('tab');
  const tabIndex = tabFromUrl ? +tabFromUrl : defaultTab ? +defaultTab : 0;
  const initialTab = tabs[tabIndex]?.key || tabs[0].key;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [payload, setPayload] = useState<any>();
  const [pendingWorksTab, setPendingWorksTab] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(
    new Set([initialTab])
  );
  const store = useStore();
  const { loginShow } = store;
  const isMobile = store.environment.isMobile;

  const onChangeTab = (val: number, params?: any) => {
    const newTab = tabs[val]?.key;
    if (newTab) {
      setActiveTab(newTab);
      setPayload(params);

      // 标记该 tab 已挂载
      setMountedTabs(prev => new Set(prev).add(newTab));

      // 更新 URL 参数
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('tab', val.toString());
      router.replace(`?${newParams.toString()}`, { scroll: false });
    }
  };

  const handleTabChange = (value: string) => {
    const index = tabs.findIndex(tab => tab.key === value);
    if (index !== -1) {
      // 点击作品 tab 时检查登录状态
      // if (value === 'works') {
      //   const uid = getUid();
      //   if (!uid) {
      //     // 未登录，显示登录弹窗，并标记等待切换
      //     setPendingWorksTab(true);
      //     setLoginShow(true);
      //     return;
      //   }
      // }
      onChangeTab(index);
    }
  };

  // 监听登录弹窗关闭，如果用户已登录且有待切换的作品tab，则自动切换
  useEffect(() => {
    if (!loginShow && pendingWorksTab) {
      const uid = getUid();
      if (uid) {
        // 用户已登录，切换到作品 tab
        const worksIndex = tabs.findIndex(tab => tab.key === 'works');
        if (worksIndex !== -1) {
          onChangeTab(worksIndex);
        }
      }
      // 重置待切换标记
      setPendingWorksTab(false);
    }
  }, [loginShow, pendingWorksTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className='h-dvh flex flex-col overflow-hidden md:max-w-[675px] mx-auto'
    >
      {/* Tab 内容区域 */}
      <div className='flex-1 overflow-hidden relative'>
        {tabs.map((tab, index) => {
          const TabComponent: any = tab.component;
          const isMounted = mountedTabs.has(tab.key);

          // 只渲染已经访问过的 tab
          if (!isMounted) {
            return null;
          }

          return (
            <TabsContent
              key={tab.key}
              value={tab.key}
              forceMount
              className='h-full mt-0 absolute inset-0 data-[state=inactive]:hidden'
            >
              <TabComponent
                storeChannelV1={storeChannelV1}
                active={activeTab === tab.key}
                onChangeTab={onChangeTab}
                isMobile={true}
                appid={appid}
                templateChannels={templateChannels}
                {...payload}
              />
            </TabsContent>
          );
        })}
      </div>

      {/* 底部 Tab 栏 */}
      <TabsList className='w-full h-auto flex items-center bg-white border-t border-black/[0.03] rounded-none p-0'>
        {tabs.map(tab => {
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className='flex-1 py-3 text-center rounded-none shadow-none data-[state=active]:text-lg data-[state=active]:font-semibold data-[state=active]:leading-6 data-[state=active]:text-black/88 data-[state=inactive]:text-base data-[state=inactive]:font-normal data-[state=inactive]:leading-6 data-[state=inactive]:text-black/60'
            >
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/*
      <MiniPShare
        title="简帖-重要时刻邀请函"
        imageUrl="https://res.maka.im/assets/jiantie/%E7%AE%80%E5%B8%96.png"
        path="/pages/home/index?from=share"
      /> */}

      {(appid === 'maka' || appid === 'jiantie') && (
        <div
          className={cn(
            'md:flex hidden items-center text-xs justify-end text-neutral-500 fixed bottom-0 left-0 right-0'
          )}
        >
          @2026-{new Date().getFullYear()} {beian[appid]?.name}
          <a
            className='ml-2'
            href='https://beian.miit.gov.cn/'
            rel='nofollow'
            target='_blank'
          >
            {beian[appid]?.no1}
          </a>
        </div>
      )}
    </Tabs>
  );
};

export default TabLayout;
