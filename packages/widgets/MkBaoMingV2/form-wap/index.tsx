import React, { ReactNode, useEffect, useState } from 'react';
import {
  OnContainerChange,
  OnContainerChangeEnd,
  EditableFormProps,
} from '@mk/widgets-bridge-sdk';
import { MkBaoMingV2Props } from '../shared';

import './form.scss';
import { formEntityServiceApi, getPageId, getUid } from '@mk/services';

interface MkBaoMingV2FormProps extends MkBaoMingV2Props {}

const MkBaoMingV2Form: React.FC<
  EditableFormProps<MkBaoMingV2FormProps>
> = props => {
  const {
    onFormValueChange,
    editorCtx,
    formControledValues,
    entityInfo,
    editorSDK,
  } = props;
  const [showSetting, setShowSetting] = useState(false);

  useEffect(() => {
    initFormData();
  }, []);

  const initFormData = async () => {
    const worksId = getPageId();
    if (!editorSDK) {
      return;
    }
    const { formRefId } = formControledValues;

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
        onFormValueChange({
          formRefId: res.data.formId,
          collectFields: ['name', 'phone', 'age', 'remarks'],
        });
      }
    }
  };

  return <div className='mk-pin-tuan-form'></div>;
};

export default MkBaoMingV2Form;
