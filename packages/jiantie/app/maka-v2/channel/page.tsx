'use client';

import { startTransition, useEffect, useState } from 'react';
import Channel1Home from './channelIndex1';
import Channel2Home from './channelIndex2';
import ExchangeWrapper from './ExchangeWrapper';
import SearchInput from './search/SearchInput';

const STORAGE_KEY = 'maka_channel_active_tab';

const bgConfig = {
  classic: `linear-gradient(to right,#86dcff 0%,#1a86ff 100%)`,
  '2026': `linear-gradient(229.87deg, rgba(0, 120, 255, 0.8) 1.92%, rgba(255, 255, 255, 0.6) 38.84%), linear-gradient(135.77deg, rgba(0, 80, 255, 0.8) 17.08%, rgba(255, 255, 255, 0.6) 38.06%), linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 100%)`,
};

export default function HomeChannelPage({
  activeTabDefault = '',
  useVersionSwitch = true,
}: {
  activeTabDefault?: 'classic' | '2026' | '';
  useVersionSwitch?: boolean;
}) {
  const [activeTab, _setActiveTab] = useState<'classic' | '2026' | ''>(
    activeTabDefault
  );

  const setActiveTab = (tab: 'classic' | '2026' | '') => {
    _setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, tab);
    }
  };

  useEffect(() => {
    if (!activeTabDefault) {
      const saved = localStorage.getItem(STORAGE_KEY) || 'classic';
      startTransition(() => {
        _setActiveTab(saved as 'classic' | '2026' | '');
      });
    }
  }, []);

  const handleTabChange = (tab: 'classic' | '2026') => {
    setActiveTab(tab);
  };

  if (activeTab === '') {
    return null;
  }
  const renderHomeChannel = () => {
    if (activeTab === '2026') {
      return <Channel2Home />;
    }

    return <Channel1Home />;
  };

  return (
    <div
      style={{ backgroundImage: bgConfig[activeTab] }}
      className='md:mt-4 md:mx-4 md:rounded-t-lg'
    >
      <SearchInput />
      {useVersionSwitch && (
        <ExchangeWrapper activeTab={activeTab} onTabChange={handleTabChange} />
      )}
      {renderHomeChannel()}
    </div>
  );
}
