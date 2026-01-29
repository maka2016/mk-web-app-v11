import { isPc } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { useState } from 'react';
import { MkImageGroupData } from '../../shared/types';
import ImageGroup from './ImageGroup';
import PictureList from './PictureList';
import './index.scss';

interface Props {
  worksId: string;
  formControledValues: MkImageGroupData;
  onFormValueChange: any;
  onClose: () => void;
}

const EditingPanel = (props: Props) => {
  const { worksId, formControledValues, onFormValueChange, onClose } = props;

  const [editMode, setEditMode] = useState(true);
  const [pictures, setPictures] = useState(
    formControledValues.imageDataList || []
  );

  const close = () => {
    // if (editMode) {
    //   setEditMode(false);
    //   return;
    // }

    onClose();
  };

  const renderHead = () => {
    if (isPc()) {
      if (!editMode) {
        return (
          <div
            className='head'
            style={{
              justifyContent: 'space-between',
              boxShadow: '0px -1px 0px 0px #ECEEF0 inset',
            }}
          >
            <span className='text'>选择图片</span>
            <Icon name='close' onClick={() => close()} />
          </div>
        );
      }

      return (
        <div
          className='head'
          style={{
            justifyContent: 'space-between',
            boxShadow: '0px -1px 0px 0px #ECEEF0 inset',
          }}
        >
          <div className='flex' onClick={() => close()}>
            <Icon name='left' />
            <span className='text'>选择图片</span>
          </div>
          <Icon name='close' onClick={() => close()} />
        </div>
      );
    }

    return (
      <div className='head'>
        <div className='btn_back' onClick={() => close()}>
          <Icon name='left' size={20} />
          {editMode && <span>选择图片</span>}
        </div>
        <span className='text'>轮播图</span>
        {editMode && (
          <Button className='btn_finish' size='sm' onClick={() => close()}>
            完成
          </Button>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (editMode) {
      return (
        <ImageGroup
          worksId={worksId}
          pictures={pictures}
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
          back={() => setEditMode(false)}
          onClose={onClose}
          onChangePictures={data => {
            setPictures(data);
          }}
        />
      );
    }

    return (
      <>
        {isPc() ? (
          <div
            className='head'
            style={{
              justifyContent: 'space-between',
              boxShadow: '0px -1px 0px 0px #ECEEF0 inset',
            }}
          >
            <span className='text'>选择图片</span>
            <Icon name='close' onClick={() => close()} />
          </div>
        ) : (
          <div className='head'>
            <div className='btn_back' onClick={() => close()}>
              <Icon name='left' size={20} />
              {editMode && <span>选择图片</span>}
            </div>
            <span className='text'>轮播图</span>
            {editMode && (
              <Button className='btn_finish' size='sm' onClick={() => close()}>
                完成
              </Button>
            )}
          </div>
        )}
        <PictureList
          pictures={pictures}
          worksId={worksId}
          onComplete={(data: any) => {
            setPictures(data);
            setEditMode(true);
          }}
        />
      </>
    );
  };
  return <div className='image_group_editing_container'>{renderContent()}</div>;
};

export default EditingPanel;
