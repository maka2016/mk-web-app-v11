'use client';
import styles from './index.module.scss';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useContext, useEffect } from 'react';
import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';
import { useParams } from 'next/navigation';
import ApplyPage from '@/app/invoice/order/apply/components/ApplyPage';

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
