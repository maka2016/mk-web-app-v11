'use client';
import React, { useState } from 'react';
import styles from './index.module.scss';
import Home from '@/app/maka/mobile/channel/page';
import Mine from '@/app/maka/mobile/mine/page';
import Works from '@/app/maka/mobile/works/page';
import Vip from '@/app/maka/mobile/vip/page';
import cls from 'classnames';

// Tabs 配置
const Tabs = [
  { label: '商城', key: 'store', component: Home },
  { label: '会员', key: 'vip', component: Vip },
  { label: '作品', key: 'works', component: Works },
  { label: '我的', key: 'mine', component: Mine },
];

interface Props {
  defaultTab?: string;
  appid: string;
  templateChannels?: any;
  storeChannelV1?: boolean;
  isMiniProgram?: boolean;
}

const TabLayout = (props: Props) => {
  const { defaultTab, appid, templateChannels, storeChannelV1 } = props;
  const [activeTab, setActiveTab] = useState(defaultTab ? +defaultTab : 0);
  const [payload, setPayload] = useState<any>();

  const onChangeTab = (val: number, params?: any) => {
    setActiveTab(val);
    setPayload(params);
  };

  // 渲染每个 tab 对应的页面
  const renderTabContent = () =>
    Tabs.map((tab, index) => {
      const TabComponent: any = tab.component;

      return (
        <div
          key={tab.key}
          className={cls([styles.tabContent, styles[appid]])}
          style={{ display: activeTab === index ? 'block' : 'none' }}
        >
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
        {Tabs.map((tab, index) => {
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
    </div>
  );
};

export default TabLayout;
