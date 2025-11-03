import { Icon } from '@workspace/ui/components/Icon';
import SecondaryLayout from '../../components/PC/Layout/SecondaryLayout';
import { Suspense } from 'react';

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const isMobile = await isMobileDevice();

  return (
    <Suspense>
      <SecondaryLayout
        breadcrumbItems={[
          {
            title: (
              <>
                <Icon name='left' size={16} />
                我的订单
              </>
            ),
            path: '/invoice/order',
          },
        ]}
      >
        {children}
      </SecondaryLayout>
    </Suspense>
  );
}
