import { cdnApi } from '@/services';
import { isAndroid } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import cls from 'classnames';
import produce from 'immer';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { showSelector } from '../../../../components/showSelector';
import { MkImageGroupData } from '../../shared/types';
import ImageCropper from './ImageCropper';
import './index.scss';

interface Props {
  worksId: string;
  onClose: () => void;
  onFormValueChange: (values: any) => void;
  formControledValues: MkImageGroupData;
  size: {
    width: number;
    height: number;
  };
}

const ImageEditingPanel = (props: Props) => {
  const { worksId, formControledValues, size, onClose, onFormValueChange } =
    props;
  const [imageDataList, setImageDataList] = useState(
    formControledValues.imageDataList || []
  );

  const onChangeItem = (index: number, item: any) => {
    const nextValue = produce(imageDataList, (draft: any) => {
      draft[index] = Object.assign({}, draft[index], item);
      return draft;
    });
    setImageDataList(nextValue);
    onFormValueChange({
      imageDataList: nextValue,
    });
  };

  const onDeleteItem = (index: number) => {
    const nextValue = produce(imageDataList, (draft: any) => {
      draft.splice(index, 1);
      return draft;
    });
    setImageDataList(nextValue);
    onFormValueChange({
      imageDataList: nextValue,
    });
  };

  const onAddItem = (ossPath: string) => {
    const nextValue = produce(imageDataList, (draft: any) => {
      draft.push({
        id: nanoid(6),
        ossPath,
        desc: '',
      });
      return draft;
    });
    setImageDataList(nextValue);
    onFormValueChange({
      imageDataList: nextValue,
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) {
      return;
    }
    const nextValue = produce(imageDataList, (draft: any) => {
      const temp = draft[index];
      draft[index] = draft[index - 1];
      draft[index - 1] = temp;
      return draft;
    });
    setImageDataList(nextValue);
    onFormValueChange({
      imageDataList: nextValue,
    });
  };

  const moveDown = (index: number) => {
    if (index === imageDataList.length - 1) {
      return;
    }
    const nextValue = produce(imageDataList, (draft: any) => {
      const temp = draft[index];
      draft[index] = draft[index + 1];
      draft[index + 1] = temp;
      return draft;
    });
    setImageDataList(nextValue);
    onFormValueChange({
      imageDataList: nextValue,
    });
  };

  const showImageCropper = (url: string, index: number) => {
    ShowDrawerV2({
      children: ({ close }) => (
        <ImageCropper
          size={size}
          onClose={close}
          worksId={worksId}
          imageUrl={url}
          onChange={url => {
            if (index === -1) {
              onAddItem(url);
            } else {
              onChangeItem(index, {
                ossPath: url,
              });
            }
          }}
        />
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

  const onChangePicture = (index: number) => {
    showSelector({
      onSelected: (params: any) => {
        const { url, type, ossPath } = params;
        console.log('params', params);
        showImageCropper(ossPath, index);
      },
      preUpload: false,
      type: 'picture',
    });
  };

  return (
    <div className='MkImageGroup_imageEditingPanel'>
      <div className='imageEditingPanel_header'>
        <div>编辑内容</div>
        <Icon name='check' size={18} onClick={() => onClose()} />
      </div>
      <div className='imageList' id='image_sortable_list'>
        {imageDataList.map((item, index) => {
          return (
            <div className='imageItem' key={item.id}>
              {/* <div
                className="drag_handler cursor-grab active:cursor-grabbing select-none"
              >
                <Icon name="drag" size={16} />
              </div> */}
              <div className='flex flex-col gap-2'>
                <Icon
                  name='up-bold'
                  size={16}
                  onClick={() => moveUp(index)}
                  className={cls([index === 0 && 'icon_disabled'])}
                />
                <Icon
                  name='down-bold'
                  size={16}
                  onClick={() => moveDown(index)}
                  className={cls([
                    index === imageDataList.length - 1 && 'icon_disabled',
                  ])}
                />
              </div>
              <div className='image' onClick={() => onChangePicture(index)}>
                <img src={cdnApi(item.ossPath)} alt='' />
                <div className='btnUpload'>更换</div>
              </div>
              <textarea
                className='textarea'
                placeholder='选填，可输入图片描述'
                value={item.desc}
                onChange={e => {
                  const { value } = e.target;
                  const nextValue = produce(imageDataList, (draft: any) => {
                    draft[index].desc = value;
                    return draft;
                  });
                  setImageDataList(nextValue);
                }}
                onBlur={e => {
                  onChangeItem(index, {
                    desc: e.target.value,
                  });
                }}
              />
              <div className='flex flex-col gap-2'>
                <Icon
                  name='delete-g8c551hn'
                  size={16}
                  onClick={() => onDeleteItem(index)}
                  className={cls([
                    imageDataList.length === 1 && 'icon_disabled',
                  ])}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className='imageEditingPanel_footer'>
        <div className='btnAdd' onClick={() => onChangePicture(-1)}>
          <Icon name='add-one' size={20} />
          <span>添加图片</span>
        </div>
      </div>
    </div>
  );
};

export default ImageEditingPanel;
