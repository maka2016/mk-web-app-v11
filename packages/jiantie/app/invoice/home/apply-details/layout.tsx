import { Icon } from '@workspace/ui/components/Icon';
import SecondaryLayout from '../../components/PC/Layout/SecondaryLayout';

export default function DetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SecondaryLayout
      breadcrumbItems={[
        {
          title: (
            <>
              <Icon name='left' size={16} />
              开票记录
            </>
          ),
          path: '/invoice/home?tabIdx=0',
        },
      ]}
    >
      {children}
    </SecondaryLayout>
  );
}
