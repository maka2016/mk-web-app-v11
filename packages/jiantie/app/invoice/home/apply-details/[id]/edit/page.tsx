'use client';
import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';
import ApplyPage from '@/app/invoice/order/apply/components/ApplyPage';
import { useParams } from 'next/navigation';
import { useContext, useEffect } from 'react';

export default function Edit() {
  const { pushBreadcrumbItem, popBreadcrumbItem } = useContext(
    SecondaryLayoutContext
  );

  useEffect(() => {
    pushBreadcrumbItem({ title: '修改发票' });
    return () => popBreadcrumbItem();
  }, []);

  const params = useParams();
  return <ApplyPage mode='edit' editId={+(params.id ?? 0)} />;
}
