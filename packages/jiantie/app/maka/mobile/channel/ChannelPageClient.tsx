'use client';

import { useEffect, useState } from 'react';
import Channel2Home from './channelIndex2';
import Channel1Home from './index';

const STORAGE_KEY = 'maka_channel_active_tab';

export default function ChannelPageClient() {
  const [activeTab, setActiveTab] = useState<'classic' | '2026' | ''>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'classic' || saved === '2026') {
        return saved;
      }
    }
    return '';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

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
