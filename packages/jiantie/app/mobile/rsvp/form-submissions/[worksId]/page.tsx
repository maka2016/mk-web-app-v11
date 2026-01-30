'use client';

import { FormSubmissionsList } from '@/components/RSVP/FormSubmissionsList';
import { Suspense, useEffect, useState } from 'react';
import { useRSVPLayout } from '../../RSVPLayoutContext';

export default function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ worksId: string }>;
}) {
  const { setTitle } = useRSVPLayout();
  const [worksId, setWorksId] = useState<string | null>(null);

  // 设置页面标题
  useEffect(() => {
    setTitle('表单收集数');
    return () => {
      setTitle('RSVP');
    };
  }, [setTitle]);

  // 获取动态路由参数
  useEffect(() => {
    params.then(p => {
      setWorksId(p.worksId);
    });
  }, [params]);

  if (!worksId) {
    return <div></div>;
  }

  return (
    <Suspense>
      <FormSubmissionsList worksId={worksId || ''} />
    </Suspense>
  );
}
