'use client';

import dynamic from 'next/dynamic';

const Main = dynamic(() => import('./components/main'), {
  ssr: false, // 禁用 SSR
});

export default function Page(props: any) {
  return <Main {...props} />;
}
