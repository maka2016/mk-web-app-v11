import React, { useEffect, useState } from 'react';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import { MkPinTuanProps } from '../shared';

import './index.scss';
import { formEntityServiceApi, getPageId, getUid } from '@mk/services';
import { queryToObj } from '@mk/utils';
import BoostActivity from './BoostActivity';
import BaoMing from './BaoMing';
import GroupBuy from './GroupBuy';

const MkPinTuan: React.FC<PlatformCompProps<MkPinTuanProps>> = props => {
  const {
    lifecycle: { didMount, didLoaded },
    controledValues,
    editorSDK,
    viewerSDK,
  } = props;
  const { formRefId, show = true, type = 'baoming' } = controledValues;

  const isScreenshot = !!queryToObj().screenshot;

  const initFormData = async () => {
    const worksId = getPageId();
    if (!editorSDK) {
      return;
    }

    if (!formRefId) {
      const res = await formEntityServiceApi.create({
        type: 'MkPinTuan',
        content: {
          fields: [
            {
              label: '姓名',
              id: 'name',
            },
            {
              label: '联系电话',
              id: 'phone',
            },
            {
              label: '孩子年龄',
              id: 'age',
            },
            {
              label: '备注',
              id: 'remarks',
            },
          ],
        },
        uid: +getUid(),
        works_id: worksId,
      });

      if (res.data.formId) {
        editorSDK?.changeCompAttr(props.id, {
          formRefId: res.data.formId,
          collectFields: ['name', 'phone', 'age', 'remarks'],
        });
      }
    }
  };

  useEffect(() => {
    initFormData();
    /** 用于在编辑器内挂载完成的回调 */
    didMount({
      boxInfo: {
        width: 100,
        height: 100,
      },
      data: {
        ...controledValues,
      },
    });

    /** 用于在 viewer 广播的组件加载完成事件 */
    didLoaded();

    return () => {};
  }, []);

  if (isScreenshot) {
    return <></>;
  }

  if (!show) {
    return <></>;
  }

  if (type === 'boost') {
    return (
      <BoostActivity controledValues={controledValues} viewerSDK={viewerSDK} />
    );
  }

  if (type === 'groupbuy') {
    return <GroupBuy viewerSDK={viewerSDK} />;
  }

  return <BaoMing controledValues={controledValues} viewerSDK={viewerSDK} />;
};

export default MkPinTuan;
