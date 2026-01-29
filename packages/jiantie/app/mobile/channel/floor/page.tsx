import React from 'react';
import Main from './components/main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    channelId: string;
    tagId?: string;
  }>;
}) {
  const { channelId, tagId } = await searchParams;
  return <Main channelId={channelId} tagId={tagId} />;
}
