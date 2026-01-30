import { Icon } from '@workspace/ui/components/Icon';
import SecondaryLayout from '../../components/PC/Layout/SecondaryLayout';
import { Suspense } from 'react';

export default function DetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <SecondaryLayout
        breadcrumbItems={[
          {
            title: (
              <>
                <Icon name='left' size={16} />
                发票信息管理
              </>
            ),
            path: '/invoice/home?tabIdx=1',
          },
        ]}
      >
        {children}
      </SecondaryLayout>
    </Suspense>
  );
}
