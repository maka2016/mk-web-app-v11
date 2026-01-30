import { cdnApi } from '@/services';
import { getImgInfo } from '@/utils';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import cls from 'classnames';
import { toast } from 'react-hot-toast';
import { showSelector } from '../../../showSelector';

const getMaskImagePreset = [
  {
    label: '底部',
    value: { maskImage: 'linear-gradient(black 70%, transparent 100%)' },
  },
  {
    label: '顶部',
    value: {
      maskImage: 'linear-gradient(to top, black 70%, transparent 100%)',
    },
  },
  {
    label: '左边',
    value: {
      maskImage: 'linear-gradient(to left, black 70%, transparent 100%)',
    },
  },
  {
    label: '右边',
    value: {
      maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
    },
  },
  {
    label: '中间',
    value: { maskImage: 'radial-gradient(transparent 40%, black 60%)' },
  },
  {
    label: '四周',
    value: { maskImage: 'radial-gradient(black 60%, transparent 100%)' },
  },
];

const MaskContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  .mask_section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    padding: 8px 0;

    .title {
      font-family: PingFang SC;
      font-weight: 600;
      font-size: 12px;
      line-height: 20px;
      letter-spacing: 0px;
      color: #000;
      padding: 0 12px;
    }

    .preview_mask_container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 0 12px;
    }

    .preview_mask_item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      .preview_mask {
        width: 52px;
        height: 36px;
        background: linear-gradient(270deg, #979797 5.08%, #ffffff 100%);
        border: 1px solid #f5f5f5;
        border-radius: 4px;
      }
      .preview_mask_label {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 12px;
        line-height: 20px;
        text-align: center;
        color: rgba(0, 0, 0, 0.6);
      }
      &.active {
        .preview_mask {
          border: 1px solid #1a87ff;
        }
        .preview_mask_label {
          color: #1a87ff;
          font-weight: 600;
        }
      }
    }

    .mask_preview {
      width: 100%;
      height: 76px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 0.92px solid #0000000f;
      border-radius: 6px;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      cursor: pointer;
      margin: 0 12px;
      span {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 13px;
        line-height: 20px;
      }
    }
  }
`;

interface MaskSettingProps {
  itemStyle: any;
  onChangeStyle: (nextStyle: any) => void;
}

const MaskSetting = ({ itemStyle, onChangeStyle }: MaskSettingProps) => {
  const isCustomMaskActive = itemStyle.maskImage && itemStyle.maskSize;
  const isGradientMaskActive = itemStyle.maskImage && !itemStyle.maskSize;

  return (
    <MaskContainer>
      {/* 自定义蒙版 */}
      <div className='mask_section'>
        <div className='title'>蒙版</div>
        <div className='px-3 flex items-center justify-between'>
          <Label className='text-xs'>自定义</Label>
          {isCustomMaskActive ? (
            <Icon
              name='minus'
              className='cursor-pointer'
              size={14}
              onClick={() => {
                onChangeStyle({
                  maskImage: '',
                  maskSize: '',
                });
              }}
            />
          ) : (
            <Icon
              name='plus'
              size={14}
              className='cursor-pointer'
              onClick={() => {
                onChangeStyle({
                  maskImage: 'none',
                  maskSize: 'cover',
                });
              }}
            />
          )}
        </div>

        {isCustomMaskActive && (
          <div
            className='mask_preview'
            style={{
              backgroundImage: itemStyle.maskImage,
            }}
            onClick={() => {
              showSelector({
                onSelected: (params: any) => {
                  console.log('params', params);
                  const { url, type, ossPath } = params;
                  getImgInfo(url).then(res => {
                    if (!res) {
                      toast.error('图片加载失败');
                      return;
                    }
                    const imgAspectRatio = `${res.baseWidth} / ${res.baseHeight}`;
                    onChangeStyle({
                      maskImage: `url(${cdnApi(ossPath)})`,
                      maskSize: 'cover',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'top center',
                      aspectRatio: imgAspectRatio,
                    });
                  });
                },
                type: 'picture',
              });
            }}
          >
            {itemStyle.maskImage === 'none' && (
              <>
                <Icon name='plus' size={32} color='#00000040' />
                <span>上传图片</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 渐变蒙版 */}
      <div className='mask_section'>
        <div className='px-3 flex items-center justify-between'>
          <Label className='text-xs'>渐变蒙版</Label>
          {isGradientMaskActive ? (
            <Icon
              name='minus'
              className='cursor-pointer'
              size={14}
              onClick={() => {
                onChangeStyle({
                  maskImage: '',
                  maskSize: '',
                });
              }}
            />
          ) : (
            <Icon
              name='plus'
              size={14}
              className='cursor-pointer'
              onClick={() => {
                onChangeStyle({
                  maskImage: 'none',
                  maskSize: '',
                });
              }}
            />
          )}
        </div>
        {isGradientMaskActive && (
          <div className='preview_mask_container'>
            {getMaskImagePreset.map((item, index) => {
              const isActive =
                itemStyle?.maskImage === (item.value as any).maskImage;
              return (
                <div
                  key={index}
                  className={cls(['preview_mask_item', isActive && 'active'])}
                  onClick={() => {
                    onChangeStyle(item.value);
                  }}
                >
                  <div className='preview_mask'>
                    <div style={item.value} className='w-full h-full'>
                      {' '}
                    </div>
                  </div>
                  <span className='preview_mask_label'>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MaskContainer>
  );
};

export default MaskSetting;
