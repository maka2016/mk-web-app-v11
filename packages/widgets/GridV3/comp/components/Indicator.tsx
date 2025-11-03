import { getPermissionData } from '@mk/services';
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { SettingCell } from '../../UserForm/Setting/SettingCell';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import clas from 'classnames';
import { SettingElemV1 } from '../../UserForm/Setting/SettingElem';
import { useGridContext } from '../provider';
import { SettingCellForGroup } from '../../UserForm/Setting/SettingCellForGroup';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';

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
  border: 2px solid ${({ color }) => color};
  border-radius: 2px;
  display: inline-block;
  opacity: ${({ opacity }) => opacity};
  &.use_bg {
    /* border-color: #1a87ff; */
    /* border-width: 1px; */
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${({ color }) => color};
      opacity: 0.1;
      z-index: 111;
      pointer-events: none;
    }
  }

  .grid_indicator {
    font-size: $grid_indicator_font_size;
    position: absolute;
    left: 0;
    top: 0;
    // min-width: 120px;
    transform: translateY(-100%);
    pointer-events: none;
    color: #fff;
    // background-color: var(--theme-color);
    padding: 0 4px;
    border-radius: 2px;
  }
`;

interface Props {
  useBg?: boolean;
  color?: string;
  opacity?: number;
}

const RowAndCellEditor = () => {
  const { widgetState, cellsMap } = useGridContext();
  const { activeRowId, activeCellId, editingElemId } = widgetState;
  const selectedCell = typeof activeCellId !== 'undefined';

  if (!activeRowId) {
    return null;
  }

  const isRepeatList = cellsMap.find(
    row => row.id === activeRowId
  )?.isRepeatList;
  if (isRepeatList) {
    return <SettingCellForGroup />;
  } else if (editingElemId) {
    return <SettingElemV1 />;
  } else if (selectedCell) {
    return <SettingCell focusRender={true} />;
  }
  return null;
};

const Indicator = React.forwardRef<IndicatorHandler, Props>(
  function IndicatorBase(props, ref) {
    const [state, setState] = useState({
      domID: '',
      title: '',
    });
    const {
      useBg = false,
      // color = "var(--theme-color, #1a87ff)",
      color = '#1a87ff',
      opacity = 1,
    } = props;
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

    return parentDOM ? (
      ReactDOM.createPortal(
        <>
          <Popover open={true}>
            <PopoverTrigger asChild>
              <IndicatorContainer
                className={clas('IndicatorContainer', useBg ? 'use_bg' : '')}
                color={color}
                opacity={opacity}
              >
                <div className='grid_indicator' ref={domRef}></div>
              </IndicatorContainer>
            </PopoverTrigger>
            <PopoverContent
              avoidCollisions={true}
              className='__tip__'
              side='top'
              sideOffset={8}
              style={{
                zIndex: 11,
                maxWidth: 800,
              }}
            >
              <RowAndCellEditor />
            </PopoverContent>
          </Popover>
          {/* 
          <ResponsiveTooltip
            defaultOpen={true}
            content={<RowAndCellEditor />}
            contentProps={{
              className: "__tip__",
              side: "top",
              sideOffset: 8,
              style: {
                zIndex: 11,
                maxWidth: 800
              }
            }}
          >
            <IndicatorContainer
              className={clas(
                "IndicatorContainer",
                useBg ? "use_bg" : ""
              )}
              color={color}
              opacity={opacity}
            >
              <div className="grid_indicator" ref={domRef}>
              </div>
            </IndicatorContainer>
          </ResponsiveTooltip> */}
        </>,
        parentDOM
      )
    ) : (
      <></>
    );
  }
);
Indicator.displayName = 'Indicator';

export default Indicator;
