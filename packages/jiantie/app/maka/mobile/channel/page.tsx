'use client';

import { startTransition, useEffect, useState } from 'react';
import Channel2Home from './channelIndex2';
import Channel1Home from './index';

const STORAGE_KEY = 'maka_channel_active_tab';

export default function Page() {
  const [activeTab, _setActiveTab] = useState<'classic' | '2026' | ''>('');

  const setActiveTab = (tab: 'classic' | '2026' | '') => {
    _setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, tab);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || '2026';
    startTransition(() => {
      _setActiveTab(saved as 'classic' | '2026' | '');
    });
  }, []);

  const handleTabChange = (tab: 'classic' | '2026') => {
    setActiveTab(tab);
  };

  if (activeTab === '') {
    return null;
  }

  if (activeTab === '2026') {
    return <Channel2Home activeTab={activeTab} onTabChange={handleTabChange} />;
  }

  return <Channel1Home activeTab={activeTab} onTabChange={handleTabChange} />;
}
