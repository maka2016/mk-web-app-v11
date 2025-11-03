import React, { useEffect, useState } from 'react';
import { EditableFormProps } from '@mk/widgets-bridge-sdk';
// import { MkPinTuProps } from "../shared"

import './form.scss';
import { getPageId, getPermissionData } from '@mk/services';
import cls from 'classnames';
import { isAndroid } from '@mk/utils';
import { MkImageGroupData } from '../shared/types';
import EditingPanel from './EditingPanel';
import ImageEditingPanel from './ImageEditingPanel';
import { Icon } from '@workspace/ui/components/Icon';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';

const MkImageGroupForm: React.FC<
  EditableFormProps<MkImageGroupData> & {
    onDeleteGridComp: () => void;
  }
> = props => {
  const { entityInfo, onFormValueChange, formControledValues, editorCtx } =
    props;

  const works_id = getPageId();

  useEffect(() => {
    if (formControledValues?.editing) {
      // setOpen(true)
      showEditingPanel();
      onFormValueChange({
        editing: false,
      });
    }
  }, [formControledValues?.editing]);

  const showEditingPanel = () => {
    ShowDrawerV2({
      children: ({ close }) => (
        <EditingPanel
          worksId={works_id}
          onClose={close}
          onFormValueChange={onFormValueChange}
          formControledValues={formControledValues}
          editorCtx={editorCtx}
        ></EditingPanel>
      ),
      showOverlay: false,
      handleOnly: true,
      className: cls([
        'mk_imagegroup_drawer mk_imagegroup_drawer_web',
        isAndroid() && 'min-h-[100vh]',
      ]),
      contentProps: {
        className: 'mk_imagegroup_drawer_web',
        style: {
          pointerEvents: 'auto',
        },
      },
    });
  };

  const showImageEditingPanel = () => {
    const compDom = document.querySelector(
      `#MkImageGroup_v2_${entityInfo.id} .embla`
    );
    ShowDrawerV2({
      children: ({ close }) => (
        <ImageEditingPanel
          worksId={works_id}
          onClose={close}
          size={{
            width: compDom?.clientWidth || 300,
            height: compDom?.clientHeight || 300,
          }}
          onFormValueChange={onFormValueChange}
          formControledValues={formControledValues}
          editorCtx={editorCtx}
        ></ImageEditingPanel>
      ),
      title: '',
      // showOverlay: false,
      handleOnly: true,
      className: cls([isAndroid() && 'min-h-[734px]']),
      contentProps: {
        className: ' mk_imagegroup_editing_drawer h-[734px] ',
        style: {
          borderRadius: '20px 20px 0 0',
          pointerEvents: 'auto',
        },
      },
    });
  };

  return (
    <div className='mk_imagegroup_wap_form'>
      {getPermissionData().materialProduct && (
        <div
          id={`mk_imagegroup_wap_form_btn_${entityInfo?.id}`}
          style={{
            padding: '6px 10px',
          }}
          className='mk_imagegroup_wap_form_btn'
          onClick={() => showEditingPanel()}
        >
          <Icon name='pic' size={16} />
          编辑轮播图
        </div>
      )}
      <div
        className='mk_imagegroup_wap_form_btn'
        style={{
          padding: '6px 10px',
        }}
        onClick={() => {
          showImageEditingPanel();
        }}
      >
        换图
      </div>
      <div
        style={{
          height: 12,
          width: 1,
          background: '#0000000F',
        }}
      ></div>
    </div>
  );
};

export default MkImageGroupForm;
