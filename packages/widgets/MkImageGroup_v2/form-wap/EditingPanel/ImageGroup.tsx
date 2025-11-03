import React, { useEffect, useState } from 'react';
import Comp from '../../comp';
import cls from 'classnames';
import { MkImageGroupData } from '../../shared/types';
import { cdnApi } from '@mk/services';
import { isPc, LoadScript } from '@mk/utils';
import { nanoid } from 'nanoid';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { IWorksData } from '@mk/works-store/types';
import { Switch } from '@workspace/ui/components/switch';

const tabs = [
  {
    key: '1',
    label: '轮播效果',
  },
  {
    key: '2',
    label: '图片调整',
  },
];

const CarouselStyles = [
  {
    name: '常规',
    key: 'default',
    preview: cdnApi('/cdn/mk-widgets/assets/MkImageGroup/style_2.png'),
  },
  {
    name: '缩放',
    key: 'scale',
    preview: cdnApi('/cdn/mk-widgets/assets/MkImageGroup/style_2.png'),
  },
  {
    name: '明暗',
    key: 'opacity',
    preview: cdnApi('/cdn/mk-widgets/assets/MkImageGroup/style_3.png'),
  },
  {
    name: '缩略',
    key: 'thumbnails',
    preview: cdnApi('/cdn/mk-widgets/assets/MkImageGroup/style_4.png'),
  },
  {
    name: '渐隐',
    key: 'fade',
    preview: cdnApi('/cdn/mk-widgets/assets/MkImageGroup/style_2.png'),
  },
];

const types: Array<{
  key: 'tiled' | 'fullfill';
  label: string;
}> = [
  {
    key: 'tiled',
    label: '填充',
  },
  {
    key: 'fullfill',
    label: '铺满',
  },
];

interface Props {
  worksId: string;
  pictures: any[];
  formControledValues: MkImageGroupData;
  onClose: () => void;
  onFormValueChange?: any;
  editorCtx: any;
  back: () => void;
  onChangePictures: (data: any[]) => void;
}

const ImageGroup = (props: Props) => {
  const {
    worksId,
    formControledValues,
    onClose,
    onFormValueChange,
    editorCtx,
    back,
    onChangePictures,
  } = props;
  const [activeTab, setActiveTab] = useState('1');
  const [pictures, setPictures] = useState(props.pictures || []);
  const [carouselType, setCarouselType] = useState(
    formControledValues.carouselType || 'default'
  );
  const [autoFlip, setAutoFlip] = useState<boolean>(
    formControledValues.autoFlip
  );
  const [type, setType] = useState(formControledValues.type || 'tiled');
  const [hideDots, setHideDots] = useState(
    formControledValues.hideDots || false
  );

  const initSortable = () => {
    const { Sortable } = window as any;
    if (!Sortable) return;
    const sortableListContainer = document.querySelector('.sortable_content');
    if (!sortableListContainer) {
      return;
    }

    Sortable.create(sortableListContainer, {
      animation: 150,
      ghostClass: 'blue-background-class',
      onSort: (evt: any) => {
        const { oldIndex = -1, newIndex = -1 } = evt;
        const swag = (prev: any[]) => {
          const updated = [...prev];

          [updated[oldIndex], updated[newIndex]] = [
            updated[newIndex],
            updated[oldIndex],
          ];

          return updated;
        };
        const nextValue = swag(pictures);
        console.log('nextValue', nextValue);
        setPictures(nextValue);
        onChangePictures(nextValue);
      },
    });
  };

  useEffect(() => {
    LoadScript({
      src: 'https://makapicture.oss-cn-beijing.aliyuncs.com/cdn/mk-widgets/mk-widget-vendor/Sortable.min.js',
      id: 'sortablejs',
    });
  }, []);

  useEffect(() => {
    if (activeTab === '2') {
      initSortable();
    }
  }, [activeTab]);

  const addPicture = () => {
    editorCtx?.utils.showSelector({
      onSelected: async (params: any) => {
        const nextValue = [
          ...pictures,
          {
            id: nanoid(6),
            ossPath: params.ossPath,
          },
        ];
        setPictures(nextValue);
        onChangePictures(nextValue);
      },
      worksId,
      type: 'picture',
    });
  };

  const handleSave = async () => {
    onFormValueChange({
      imageDataList: pictures,
      carouselType,
      autoFlip,
      hideDots,
      type,
    });
    onClose();
  };

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
          <div className='flex' onClick={() => onClose()}>
            <Icon name='left' />
            {/* <span className="text">选择图片</span> */}
          </div>
          <Icon name='close' onClick={() => onClose()} />
        </div>
      ) : (
        <div className='head'>
          <div className='btn_back' onClick={() => back()}>
            <Icon name='left' size={20} />
            {/* <span>选择图片</span> */}
          </div>
          <span className='text'>拼图</span>
          <Button className='btn_finish' size='sm' onClick={() => handleSave()}>
            完成
          </Button>
        </div>
      )}
      <div className='image_group_setting'>
        <div className='editing_comp'>
          <div
            style={{
              width: '100%',
              height: 258,
            }}
          >
            <Comp
              controledValues={{
                imageDataList: pictures,
                type,
                autoFlip,
                flipFeq: 5000,
                carouselType,
                hideDots,
              }}
              id='editing_comp'
              canvaInfo={{
                canvaW: 375,
                canvaH: 665,
                scaleZommRate: 1,
                scaleRate: 1,
              }}
              containerInfo={{
                width: 375,
                height: 258,
                rotate: 0,
                x: 0,
                y: 0,
              }}
              lifecycle={{
                didMount: () => {},
                didLoaded: () => {},
              }}
              widgetState={{}}
              pageInfo={{} as any}
              getWorksData={(() => {}) as any}
            />
          </div>
        </div>
        <div className='editing_setting'>
          <div className='styleTab'>
            {tabs.map(item => (
              <div
                key={item.key}
                className={cls(['tabItem', activeTab === item.key && 'active'])}
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </div>
            ))}
          </div>
          {activeTab === '1' && (
            <div>
              <div className='carouselStyles'>
                {CarouselStyles.map(item => (
                  <div
                    key={item.key}
                    className={cls([
                      'carouselStylesItem',
                      carouselType === item.key && 'active',
                    ])}
                    onClick={() => {
                      setCarouselType(item.key);
                    }}
                  >
                    <div className='preview'>
                      <img src={item.preview} alt='' />
                    </div>
                    <p className='name'>{item.name}</p>
                  </div>
                ))}
              </div>
              <div className='autoLoop'>
                <span>自动轮播</span>
                <Switch
                  id='loop'
                  defaultChecked={autoFlip}
                  onCheckedChange={nextVal => {
                    setAutoFlip(nextVal);
                  }}
                ></Switch>
              </div>
              <div className='autoLoop'>
                <span>隐藏指示器</span>
                <Switch
                  id='loop'
                  defaultChecked={hideDots}
                  onCheckedChange={nextVal => {
                    setHideDots(nextVal);
                  }}
                ></Switch>
              </div>
            </div>
          )}
          {activeTab === '2' && (
            <div>
              <div className='label'>图片效果</div>
              <div className='type'>
                {types.map(item => (
                  <div
                    className={cls(['typeItem', type === item.key && 'active'])}
                    key={item.key}
                    onClick={() => setType(item.key)}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              <div className='pictureList_title'>
                <div className='label'>长按可调整顺序</div>
                <div className='btn_add' onClick={() => addPicture()}>
                  <Icon name='plus' size={20} />
                  <span>添加图片</span>
                </div>
              </div>

              <div
                className='pictureList sortable_content'
                style={{
                  flexWrap: 'wrap',
                }}
              >
                {pictures.map((item, index) => (
                  <div
                    className='item'
                    key={item.id}
                    onClick={() => {
                      const nextValue = pictures.filter(i => i.id !== item.id);
                      setPictures(nextValue);
                      onChangePictures(nextValue);
                    }}
                  >
                    <img src={cdnApi(item.ossPath)} />
                    <div className='delete'>
                      <Icon name='close' size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {isPc() && (
        <div className='footer'>
          <Button variant='outline' onClick={() => onClose()}>
            取消
          </Button>
          <Button onClick={() => handleSave()}> 确定</Button>
        </div>
      )}
    </>
  );
};

export default ImageGroup;
