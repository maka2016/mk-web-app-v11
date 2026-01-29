'use client';
import { Suspense } from 'react';
import MobileHeader from '../../../components/DeviceWrapper/mobile/Header';
import Tabs, { TabItemProp } from '../components/UI/Tabs';
import InvoiceInfoManageTabPanel from './components/InvoiceInfoManageTabPanel';
import InvoiceRecordTabPanel from './components/InvoiceRecordTabPanel';
import styles from './index.module.scss';

export default function Page() {
  const items: TabItemProp[] = [
    {
      key: '0',
      label: '开票记录',
      children: <InvoiceRecordTabPanel />,
    },
    {
      key: '1',
      label: '发票信息管理',
      children: <InvoiceInfoManageTabPanel />,
    },
  ];
  return (
    <Suspense>
      <div className={styles.main}>
        <MobileHeader title='发票管理' />
        <Tabs
          items={items}
          defaultActiveKey='0'
          enableSyncQueryParams
          queryParamName='tabIdx'
        />
      </div>
    </Suspense>
  );
}
