import { showSelector } from '@/components/showSelector';
import styled from '@emotion/styled';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import clas from 'classnames';
import { useGridContext } from '../provider';

type IndicatorHandler = {
  setDomID: (domID: string, title: string) => void;
};

const offset = 0;

const IndicatorContainer = styled.div<{ color: string; opacity: number }>`
  position: absolute;
  top: ${offset}px;
  left: ${offset}px;
  right: ${offset}px;
  bottom: ${offset}px;
  z-index: 20;
  pointer-events: none;
  border-radius: 2px;
  display: inline-block;
  opacity: ${({ opacity }) => opacity};
`;

const Container = styled.div`
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0px 2px 8px 0px #55555526;
  font-family: PingFang SC;
  font-weight: 400;
  font-style: Regular;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  color: #09090b;
`;

const AddContentDialog = styled.div`
  position: relative;
  padding: 12px 16px;
  .head {
    font-family: PingFang SC;
    font-weight: 600;
    font-style: Semibold;
    font-size: 16px;
    line-height: 24px;
    vertical-align: middle;
    color: #09090b;
    text-align: center;
    margin-bottom: 24px;
  }
  .close {
    position: absolute;
    right: 19px;
    top: 15px;
  }
  .title {
    font-family: PingFang SC;
    font-weight: 600;
    font-style: Semibold;
    font-size: 14px;
    line-height: 22px;
    color: #09090b;
    margin-bottom: 8px;
  }
  .list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
    .listItem {
      border-radius: 6px;
      background: #f4f4f5;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .imageItem {
      height: 70px;
      border-radius: 6px;
      background: #f4f4f5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      span {
        font-family: PingFang SC;
        font-weight: 400;
        font-style: Regular;
        font-size: 14px;
        line-height: 20px;
        color: #09090b;
      }
    }
  }
`;

interface TextAttr {
  text: string;
  style: React.CSSProperties;
  link?: any;
}

const textAttrs: TextAttr[] = [
  {
    text: '标题1',
    style: {
      fontSize: 30,
      fontWeight: 600,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_heading1',
    },
  },
  {
    text: '标题2',
    style: {
      fontSize: 24,
      fontWeight: 600,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_heading2',
    },
  },
  {
    text: '标题3',
    style: {
      fontSize: 20,
      fontWeight: 600,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_body',
    },
  },
  {
    text: '标题4',
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_body',
    },
  },
  {
    text: '标题5',
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_body',
    },
  },
  {
    text: '标题6',
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_body',
    },
  },
  {
    text: '文字段落',
    style: {
      fontSize: 14,
      fontWeight: 400,
      color: '#09090B',
      lineHeight: 1.5,
    },
    link: {
      tag: 'text_body',
    },
  },
];

interface Props {
  editorCtx: any;
  editorSDK: any;
}

const AddContent = React.forwardRef<IndicatorHandler, Props>(
  function IndicatorBase(props, ref) {
    const { editorCtx, editorSDK } = props;
    const [state, setState] = useState({
      domID: '',
      title: '',
    });
    const [open, setOpen] = useState(false);
    const targetDOMRef = useRef<any>(null);
    const domRef = useRef<any>(null);
    const parentDOM = document.querySelector(`#id-canvas ${state.domID}`);
    React.useImperativeHandle(ref, () => ({
      setDomID: (domID: string, title: string) => {
        if (domID && domRef.current) {
          (targetDOMRef.current as any) = parentDOM as HTMLDivElement;
          const offset = targetDOMRef.current;
          domRef.current.style.top = `${(offset as any).offsetTop}px`;
          domRef.current.style.left = `${(offset as any).offsetLeft}px`;
          domRef.current.style.width = `${(offset as any).offsetWidth}px`;
          domRef.current.style.height = `${(offset as any).offsetHeight}px`;
        } else {
          // targetDOMRef.current?.classList.remove('hover')
          // domRef.current?.style.display = 'none'
        }
        setState({
          domID,
          title,
        });
      },
    }));

    const { widgetState, addComponent, cellsMap } = useGridContext();
    const { activeRowId, activeCellId, editingElemId } = widgetState;

    const addComponentAction = (elementRef: string, attrs: any, link: any) => {
      let activeRowIdx = cellsMap.findIndex(row => row.id === activeRowId);
      let activeCellIdx = activeCellId
        ? cellsMap[activeRowIdx].cells.findIndex(
            cell => cell.id === activeCellId
          )
        : -1;
      const index = cellsMap?.[activeRowIdx]?.cells?.[
        activeCellIdx
      ]?.childrenIds?.findIndex(elem => elem === editingElemId);

      const compId = addComponent({
        layer: {
          elementRef,
          attrs,
        },
        link,
        toIndex: index,
      });

      editorSDK?.changeWidgetState({
        activeRowId: activeRowId,
        activeCellId: activeCellId,
        editingElemId: compId,
        isActiveGrid: false,
      });
      setOpen(false);
    };

    const onAddText = (item: TextAttr) => {
      addComponentAction(
        'Text',
        {
          text: item.text,
          ...item.style,
        },
        item.link || {}
      );
    };

    const onAddPicture = () => {
      setOpen(false);
      showSelector({
        onSelected: (params: any) => {
          const { url, type, ossPath } = params;

          addComponentAction(
            'Picture',
            {
              ossPath,
            },
            {}
          );
        },
        type: 'picture',
        // preUpload: false
      } as any);
    };

    return parentDOM ? (
      ReactDOM.createPortal(
        <>
          <Popover open={true}>
            <PopoverTrigger asChild>
              <IndicatorContainer
                className={clas('IndicatorContainer')}
                color={''}
                opacity={1}
              >
                <div className='grid_indicator' ref={domRef}></div>
              </IndicatorContainer>
            </PopoverTrigger>
            <PopoverContent
              avoidCollisions={false}
              className='__tip__'
              side='bottom'
              sideOffset={8}
              style={{
                zIndex: 11,
                maxWidth: 800,
              }}
            >
              {activeRowId ? (
                <Container onClick={() => setOpen(true)}>
                  <Icon name='plus' size={16} />
                  <span>加内容</span>
                </Container>
              ) : null}
            </PopoverContent>
          </Popover>
          <ResponsiveDialog
            showOverlay={false}
            isOpen={open}
            onOpenChange={setOpen}
            contentProps={{
              className: 'rounded-[20px] pt-1',
            }}
          >
            <AddContentDialog>
              <div className='head'>添加</div>
              <Icon
                name='close'
                size={18}
                className='close'
                onClick={() => setOpen(false)}
              />
              <div className='title'>文字</div>
              <div className='list'>
                {textAttrs.map((item, index) => (
                  <div
                    className='listItem'
                    key={index}
                    style={item.style}
                    onClick={() => onAddText(item)}
                  >
                    {item.text}
                  </div>
                ))}
              </div>

              <div className='title'>基础</div>
              <div className='list'>
                <div className='imageItem' onClick={() => onAddPicture()}>
                  <Icon name='image-fill' size={24} />
                  <span>图片</span>
                </div>
              </div>
            </AddContentDialog>
          </ResponsiveDialog>
        </>,
        parentDOM
      )
    ) : (
      <></>
    );
  }
);
AddContent.displayName = 'AddContent';

export default AddContent;
