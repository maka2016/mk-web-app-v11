import styled from '@emotion/styled';
import { cdnApi } from '@mk/services';
import { Icon } from '@workspace/ui/components/Icon';
import { Separator } from '@workspace/ui/components/separator';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import cls from 'classnames';
import ImgLiteEditingPanel from '../../comp/components/ImgLiteEditingPanel';
import { useGridContext } from '../../comp/provider';
import { getImgInfo2 } from '../../shared';
import MaskSetting from './MaskSetting';

interface Props {
  attrs: Record<string, any>;
  onChange: (nextVal: any) => void;
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
    background-image: url('https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png');
    background-repeat: repeat;
    overflow: hidden;
    background-color: #fff;

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
  const { editorCtx } = useGridContext();
  const { attrs } = props;
  const itemStyle = attrs.layoutStyle || attrs || {};

  // const ossPathPrev = useRef(attrs.ossPath);

  // useEffect(() => {
  //   /** 换图 */
  //   if (ossPathPrev.current !== attrs.ossPath) {
  //     const img = new Image();
  //     img.src = cdnApi(attrs.ossPath, {
  //       format: 'webp',
  //     });
  //     img.onload = () => {
  //       ossPathPrev.current = attrs.ossPath;
  //       const nextData = {
  //         originBaseW: img.width,
  //         originBaseH: img.height,
  //       };
  //       props.onChange?.(nextData);
  //     };
  //     img.onerror = () => {};
  //   }
  // }, [attrs.ossPath]);

  const _onChange = (nextVal: any) => {
    props.onChange?.(nextVal);
  };

  const onChangeStyle = (nextStyle: any) => {
    props.onChange?.({
      layoutStyle: {
        ...attrs.layoutStyle,
        ...nextStyle,
      },
    });
  };

  const showEditDrawer = async () => {
    ShowDrawerV2({
      children: ({ close }) => (
        <ImgLiteEditingPanel
          attrs={attrs}
          onClose={close}
          onChange={nextVal => {
            props.onChange?.(nextVal);
          }}
        />
      ),
      title: '',
      showOverlay: false,
      handleOnly: true,
      contentProps: {
        style: {
          pointerEvents: 'auto',
        },
      },
    });
  };
  return (
    <BackgroundDiv>
      <div className='preview'>
        {attrs?.ossPath && <img src={cdnApi(attrs?.ossPath)} alt='' />}
        <div
          className={cls(['upload_btn', attrs?.ossPath && 'active'])}
          onClick={() => {
            editorCtx?.utils.showSelector({
              onSelected: async (params: any) => {
                console.log('params', params);
                /** 设计师上传的需要做尺寸判断 */
                if (params.ossPath) {
                  const imgInfo = await getImgInfo2(cdnApi(params.ossPath));
                  _onChange({
                    ossPath: params.ossPath,
                    originBaseW: imgInfo.baseWidth,
                    originBaseH: imgInfo.baseHeight,
                    aspectRatio: imgInfo.baseWidth / imgInfo.baseHeight,
                  });
                }
              },
              payload: {
                defaultAtUpload: true,
              },
              type: 'picture',
            });
          }}
        >
          替换图片
        </div>
        <div className='preview_btns'>
          <div
            className='btn'
            onClick={() => {
              showEditDrawer();
            }}
          >
            <Icon name='crop' color='#151515' size={14} />
            <span>调整图片</span>
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

      <MaskSetting itemStyle={itemStyle} onChangeStyle={onChangeStyle} />

      <Separator />
    </BackgroundDiv>
  );
};

export default PictureSetting;
