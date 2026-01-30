'use client';

import { useStore } from '@/store';
import { queryToObj } from '@/utils';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import Vip from '../../vip-popup/components/vip';
import styles from './index.module.scss';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';

const VipPage = (props: any) => {
  const { appid } = props;
  const { setVipShow } = useStore();

  useEffect(() => {
    const query = queryToObj();
    const works_id = query.works_id;
    setVipShow(false, {
      works_id: works_id,
      ref_object_id: works_id,
      parent_page_type: 'mini_h5_buy',
      vipType: 'vip',
    });
  }, []);

  return (
    <>
      <MobileHeader title='会员套餐' />
      {/* {renderContent()} */}
      <Vip
        appid={appid}
        hideHeader={true}
        className={styles.vipPage}
        onClose={() => setVipShow(false)}
      />
    </>
  );
};

export default observer(VipPage);
