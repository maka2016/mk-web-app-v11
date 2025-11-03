import React, { ReactNode, useEffect, useState } from 'react';
import {
  OnContainerChange,
  OnContainerChangeEnd,
  EditableFormProps,
} from '@mk/widgets-bridge-sdk';
import { MkPinTuanProps } from '../shared';
import './form.scss';
import { formEntityServiceApi, getPageId, getUid } from '@mk/services';
import EditingPanel from './EditingPanel';

interface MkPinTuanFormProps extends MkPinTuanProps {}

const MkPinTuanForm: React.FC<EditableFormProps<MkPinTuanProps>> = props => {
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

export default MkPinTuanForm;
