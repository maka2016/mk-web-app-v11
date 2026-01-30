import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';
import { Separator } from '@workspace/ui/components/separator';
import cls from 'classnames';
import MaskSetting from '../../componentsForEditor/ElementAttrsEditorV2/MaskSetting';
import { loadImg } from '../../utils';
import EditorForVideoBg from '../VideoBg/EditorForVideoBg';
import { VideoBgConfig } from '../VideoBg/types';
import { PictureData } from './types';

interface Props {
  attrs: PictureData;
  elemId: string;
  onChange: (nextVal: Partial<PictureData>) => void;
  canChangeImage?: boolean; // 是否可以换图
}

const BackgroundDiv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  .title {
    font-family: PingFang SC;
    font-weight: 600;
    font-size: 12px;
    line-height: 20px;
    letter-spacing: 0px;
    color: #000;
  }
  .label {
    font-weight: 600;
    font-size: 12px;
    line-height: 20px;
    color: #000;
    margin-bottom: 8px;
  }
  .preview {
    position: relative;
    width: 100%;
    height: 120px;
    border: 1px solid #0000000f;
    border-radius: 4px;
    background-color: #fff;
    background-image:
      linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
      linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
      linear-gradient(-45deg, transparent 75%, #e5e5e5 75%);
    background-size: 10px 10px;
    background-position:
      0 0,
      0 5px,
      5px -5px,
      -5px 0px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .upload_btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: PingFang SC;
      border: 1px solid #00000026;
      font-family: PingFang SC;
      font-weight: 400;
      font-size: 12px;
      line-height: 16px;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      &:hover {
        opacity: 0.8;
      }
      &.active {
        border-color: #fff;
        color: #fff;
      }
    }
    .preview_btns {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      gap: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.25);
      height: 40px;
      .btn {
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 12px;
        line-height: 16px;
        color: #151515;
        border-radius: 4px;
        background: #f5f5f5;
        padding: 0 12px;
        height: 32px;
        gap: 4px;
        cursor: pointer;
        &:hover {
          opacity: 0.8;
        }

        .split {
          width: 1px;
          height: 16px;
          background: #e6e6e6;
        }
      }
    }
  }

  .btn_group {
    margin-top: 8px;
    width: 100%;
    display: flex;
    padding: 4px;
    gap: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    height: 32px;
    .btn_group_item {
      flex: 1;
      font-family: PingFang SC;
      font-weight: 400;
      font-size: 12px;
      line-height: 24px;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
      &:hover,
      &.active {
        background: #ffffff;
      }
    }
  }
`;

const PictureSetting = (props: Props) => {
  const { attrs, elemId, canChangeImage = true } = props;
  const itemStyle = attrs.layoutStyle || attrs || {};

  // 判断当前模式：优先使用 bgMode，如果没有则根据数据推断
  const videoBgConfig = attrs.videoBgConfig as VideoBgConfig | undefined;
  const ossPath = attrs.ossPath;
  const bgMode = attrs.bgMode as 'image' | 'video' | undefined;
  const isVideoMode =
    bgMode === 'video' ||
    (bgMode === undefined &&
      (!!videoBgConfig || /mp4|mov|webm/gi.test(ossPath)));

  const _onChange = (nextVal: Partial<PictureData>) => {
    props.onChange?.(nextVal);
  };

  const onChangeStyle = (nextStyle: Partial<React.CSSProperties>) => {
    props.onChange?.({
      layoutStyle: {
        ...attrs.layoutStyle,
        ...nextStyle,
      },
    });
  };

  const handleModeChange = (mode: 'image' | 'video') => {
    // 只切换模式状态，不清除任何数据
    props.onChange?.({
      bgMode: mode,
    });
  };

  return (
    <BackgroundDiv>
      {/* 模式切换按钮组 */}
      {canChangeImage && (
        <div className='btn_group'>
          <div
            className={cls(['btn_group_item', !isVideoMode && 'active'])}
            onClick={() => handleModeChange('image')}
          >
            图片
          </div>
          <div
            className={cls(['btn_group_item', isVideoMode && 'active'])}
            onClick={() => handleModeChange('video')}
          >
            视频
          </div>
        </div>
      )}
      {isVideoMode ? (
        // 视频模式：显示视频编辑器
        <>
          <EditorForVideoBg
            label='透明通道视频'
            videoBgConfig={videoBgConfig}
            useMov={true}
            useMp4={false}
            useWebm={true}
            onChange={value => {
              _onChange(value as Partial<PictureData>);
            }}
          />
          <EditorForVideoBg
            label='非透明通道视频'
            videoBgConfig={videoBgConfig}
            useMov={false}
            useMp4={true}
            useWebm={false}
            onChange={value => {
              _onChange(value as Partial<PictureData>);
            }}
          />
        </>
      ) : (
        // 图片模式：显示图片编辑器
        <>
          {canChangeImage && (
            <div className='preview'>
              {attrs?.ossPath && <img src={cdnApi(attrs?.ossPath)} alt='' />}
              <div
                className={cls(['upload_btn', attrs?.ossPath && 'active'])}
                onClick={() => {
                  document.getElementById(`changeImgBtn_${elemId}`)?.click();
                }}
              >
                替换图片
              </div>
              <div className='preview_btns'>
                <div
                  className='btn'
                  onClick={() => {
                    // showEditDrawer();
                    document.getElementById('hidden_edit_img_panel_trigger_btn')?.click();
                  }}
                >
                  <Icon name='crop' color='#151515' size={14} />
                  <span>调整图片</span>
                </div>
                <div
                  className='btn'
                  onClick={() => {
                    // showEditDrawer();
                    loadImg(attrs.ossPath).then(img => {
                      _onChange({
                        originBaseW: img.width,
                        originBaseH: img.height,
                      });
                    });
                  }}
                >
                  <span>重算</span>
                </div>
                <div className='btn'>
                  <Icon
                    name='flip-horizontal'
                    size={16}
                    onClick={() =>
                      _onChange({
                        flipHorizontal: attrs.flipHorizontal ? false : true,
                      })
                    }
                  />
                  {/* <div className="split"></div>
                <Icon name="flip-vertical" size={16} /> */}
                </div>
              </div>
            </div>
          )}

          <MaskSetting itemStyle={itemStyle} onChangeStyle={onChangeStyle} />
        </>
      )}

      <Separator />
    </BackgroundDiv>
  );
};

export default PictureSetting;
