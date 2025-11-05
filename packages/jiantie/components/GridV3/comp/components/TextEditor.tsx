import styled from '@emotion/styled';
import { getUid } from '@mk/services';
import { DebounceClass, isIOS } from '@mk/utils';
import { EditorSDK } from '@mk/works-store/types';
import React, {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GridProps, GridState } from '../../shared';
import { defaultFontFamily } from '../../shared/const';
import { getListIconSvgString } from '../../shared/TextStyleList';
import { isSafari } from '../Bg/browserUtils';
import { batchGetFontCropUrlManager, loadFontAction } from '../utils/load-font';

interface TextAttrs {
  color: string;
  text: string;
  textDecoration: string;
  /**
   * @deprecated
   * 废弃的脏数据属性
   */
  attrs: any;
  fontFamily: string;
  fontUrl: string;
  isList?: boolean;
  listStyle?: string;
  fontSize?: number;
  lineHeight?: number;
  writingMode?: string;
}

export interface TextEditorProps {
  elemId: string;
  layerLink: any;
  layerAttrs: TextAttrs;
  editorSDK?: EditorSDK<GridProps, GridState>;
  didLoaded?: () => void;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  viewerSDK?: any;
  readonly?: boolean;
  autoFocus?: boolean;
  style?: CSSProperties;
  isActive?: boolean;
}

const TextEditorContainer = styled.div`
  position: relative;
  font-family: ${defaultFontFamily};
  white-space: pre-wrap;
  user-select: auto !important;
  min-width: 24px;
  width: fit-content;

  outline: none;

  > span[data-word] {
    letter-spacing: 0;
    line-height: normal;
    text-indent: 0;
  }

  &[contenteditable='true']:empty:before {
    content: attr(placeholder);
    pointer-events: none;
    display: block; /* For Firefox */
    /* color #999 */
    color: #bfbfbf;
  }

  /* 文字渐变样式 */
  &.text-gradient {
    color: transparent !important;
    background-clip: text !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    display: inline-block !important;
    box-decoration-break: clone !important;
    -webkit-box-decoration-break: clone !important;
  }

  /* 列表样式 */
  ul {
    margin: 0;
    padding-left: 24px; /* 为列表标记提供足够空间 */
    list-style-position: outside; /* 标记位于内容外部 */
  }

  li {
    display: list-item;
    margin: 0;
    padding: 0;
    line-height: inherit; /* 继承行高 */
  }

  /* SVG图标列表样式 */
  ul.svg-icon-list {
    padding-left: 0; /* SVG图标列表不需要默认缩进 */
    list-style: none; /* 移除默认列表样式 */
  }

  ul.svg-icon-list li {
    display: flex;
    align-items: center; /* 垂直居中对齐 */
    margin-bottom: 0.2em; /* 使用em单位，相对于文字大小 */
    list-style: none;
    line-height: inherit; /* 设置合适的行高 */
    gap: 4px; /* 图标与文字的固定间距 */
  }

  ul.svg-icon-list li svg,
  ul.svg-icon-list li img {
    flex-shrink: 0; /* 图标不缩放 */
    display: inline-block;
    vertical-align: middle; /* 垂直居中 */
  }

  ul.svg-icon-list li span {
    flex: 1;
    line-height: inherit;
    vertical-align: middle; /* 垂直居中 */
  }

  /* 针对不同列表类型的特殊处理 */
  ul[style*='decimal'] {
    padding-left: 30px; /* 数字列表需要更多空间 */
  }

  ul[style*='lower-alpha'],
  ul[style*='upper-alpha'],
  ul[style*='lower-roman'],
  ul[style*='upper-roman'] {
    padding-left: 28px; /* 字母和罗马数字需要适中空间 */
  }
`;

const useFont = ({
  fontFamily,
  fontUrl,
  text,
  viewerSDK,
  editorSDK,
  id = '',
  onLoadFont,
  onErrorFont,
}: {
  fontFamily: string;
  fontUrl: string;
  text: string;
  viewerSDK: any;
  editorSDK: any;
  id: string;
  onLoadFont: () => void;
  onErrorFont: () => void;
}) => {
  const [loadingFont, setLoadingFont] = useState(false);
  const [currFontFamily, setCurrFontFamily] = useState(fontFamily);

  useEffect(() => {
    const loadFont = async ({
      fontFamily,
      fontUrl,
      rollbackFontFamily = '',
      rollbackFontUrl = '',
    }: {
      fontFamily: string;
      fontUrl: string;
      rollbackFontFamily: string;
      rollbackFontUrl: string;
    }) => {
      if (fontFamily && fontUrl) {
        // this.setLoading(true)
        setLoadingFont(true);
        try {
          await loadFontAction({
            fontFamily,
            fontUrl,
          });
          setCurrFontFamily(fontFamily);
          setLoadingFont(false);
          onLoadFont?.();
        } catch (err) {
          console.log('text', id, text);
          console.error(`加载字体失败：${fontFamily} ${fontUrl}`, err);
          console.log('加载字体失败，尝试回滚');
          loadFont({
            fontFamily: rollbackFontFamily,
            fontUrl: rollbackFontUrl,
            rollbackFontFamily,
            rollbackFontUrl,
          }).then(() => {
            setLoadingFont(false);
            setCurrFontFamily(rollbackFontFamily);
            onErrorFont?.();
          });
        }
      } else {
        setLoadingFont(false);
        setCurrFontFamily(rollbackFontFamily);
        onErrorFont?.();
      }
    };

    const fontResourceFilterV2 = ({
      fontFamily,
      fontUrl,
    }: {
      fontFamily: string;
      fontUrl: string;
    }): Promise<{ fontFamily: string; fontUrl: string }> => {
      return new Promise(resolve => {
        const debounce = new DebounceClass();
        const result = {
          fontFamily,
          fontUrl,
        };
        if (!text) {
          resolve({ fontFamily: '', fontUrl: '' });
          return;
        }
        // eslint-disable-next-line no-irregular-whitespace
        const planText = `${text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/g, ' ')}　`;
        if (!batchGetFontCropUrlManager.options?.uid) {
          batchGetFontCropUrlManager.setOptions({
            uid: getUid() || viewerSDK?.workInfo?.getUID?.() || 'none',
            pageId: viewerSDK?.workInfo?.getWorksID?.() || '__temp__',
          });
        }

        debounce.exec(() => {
          console.log(id, 'load font timeout');
          resolve(result);
        }, 5000);

        const handleSuccess = (resData: any) => {
          // console.log('itemId', itemId)
          const currData = resData[id];
          // console.log('currData', id, currData)
          // console.count('success')
          debounce.cancel();
          result.fontFamily = currData?.fontFamily || fontFamily;
          result.fontUrl = currData?.url || fontUrl;
          resolve(result);
          // console.count(id)
          // batchGetFontCropUrlManager.rm('success', handleSuccess)
        };

        batchGetFontCropUrlManager.once('success', handleSuccess);
        batchGetFontCropUrlManager.addItem({
          fontFamily,
          content: planText,
          id,
        });
      });
    };

    const loadCropFont = async () => {
      if (editorSDK) {
        // 编辑器加载全量字体
        await loadFont({
          fontFamily,
          fontUrl,
          rollbackFontFamily: '',
          rollbackFontUrl: '',
        });
      } else {
        /** 判断组件是否在主画布上，而不是在左侧的页面 */
        const fontRes = await fontResourceFilterV2({
          fontFamily,
          fontUrl,
        });

        await loadFont({
          fontFamily: fontRes.fontFamily,
          fontUrl: fontRes.fontUrl,
          rollbackFontFamily: fontFamily,
          rollbackFontUrl: fontUrl,
        });
      }
    };

    loadCropFont();
  }, [fontFamily, fontUrl, text]);

  return {
    loadingFont,
    currFontFamily,
  };
};

const getFontFamily = (options: {
  fontFamily: string;
  fontUrl: string;
}): {
  fontFamily: string;
  fontUrl: string;
} => {
  const fontFamilyMap = {
    F_si_yuan_song_ti__Regular: {
      fontFamily: 'SourceHanSerifCN-Regular',
      fontUrl: 'https://font.maka.im/20200402/SourceHanSerifCN-Regular.ttf?v=1',
    },
    F_si_yuan_song_ti__Medium: {
      fontFamily: 'SourceHanSerifCN-Medium',
      fontUrl: 'https://font.maka.im/20190724/SourceHanSerifCN-Medium.ttf',
    },
    F_si_yuan_song_ti__Heavy: {
      fontFamily: 'SourceHanSerifCN-Heavy',
      fontUrl: 'https://font.maka.im/20190724/SourceHanSerifCN-Heavy.ttf',
    },
    F_si_yuan_song_ti__Bold: {
      fontFamily: 'SourceHanSerifCN-Bold',
      fontUrl: 'https://font.maka.im/20200402/SourceHanSerifCN-Bold.ttf?v=1',
    },
  };
  const result =
    fontFamilyMap[options.fontFamily as keyof typeof fontFamilyMap];
  if (result) {
    return result;
  }
  return options;
};

export default function TextEditor({
  layerAttrs,
  layerLink,
  editorSDK,
  readonly = false,
  elemId,
  viewerSDK,
  autoFocus = false,
  didLoaded,
  onChange,
}: TextEditorProps) {
  // 确保数据源始终为纯文本的处理函数
  const getPlainTextValue = (rawValue: string): string => {
    if (!rawValue) return '';

    // 如果包含HTML标签，提取纯文本内容
    if (rawValue.includes('<ul') || rawValue.includes('<li')) {
      return rawValue
        .replace(/<ul[^>]*>/g, '') // 移除ul标签
        .replace(/<\/ul>/g, '') // 移除ul结束标签
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/g, '') // 移除svg标签及其内容（支持换行）
        .replace(/<img[^>]*>/g, '') // 移除img标签（自定义图标）
        .replace(/<iconpark-icon[^>]*><\/iconpark-icon>/g, '') // 移除iconpark-icon标签
        .replace(/<li[^>]*>/g, '') // 移除li开始标签
        .replace(/<\/li>\s*/g, '\n') // li结束标签替换为换行，同时移除后面的空白
        .replace(/<span[^>]*>/g, '') // 移除span开始标签
        .replace(/<\/span>/g, '') // 移除span结束标签
        .replace(/\s*\n\s*/g, '\n') // 规范化换行符：移除换行前后的空白字符
        .replace(/\n{2,}/g, '\n') // 多个连续换行合并为单个
        .trim(); // 去除首尾空白
    }

    return rawValue;
  };

  const [value, _setValue] = useState(
    getPlainTextValue(layerAttrs.text?.trim() || '')
  );
  // const isActive = widgetState?.editingElemId === elemId;
  const inputRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);

  // 同步valueRef
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const actionLink = layerLink?.action?.actionAttrs?.link;
  const inputId = `input_${elemId}`;
  const fontAttrs = getFontFamily(layerAttrs);

  const { currFontFamily } = useFont({
    fontFamily: fontAttrs.fontFamily,
    fontUrl: fontAttrs.fontUrl,
    text: layerAttrs.text,
    viewerSDK,
    editorSDK,
    id: elemId,
    onLoadFont: () => {
      didLoaded?.();
    },
    onErrorFont: () => {
      console.warn('font error', fontAttrs.fontFamily, fontAttrs.fontUrl);
      didLoaded?.();
    },
  });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const newPlainTextValue = getPlainTextValue(layerAttrs.text?.trim() || '');
    if (newPlainTextValue !== valueRef.current) {
      _setValue(newPlainTextValue);
    }
  }, [layerAttrs.text]); // 使用valueRef避免依赖问题

  useEffect(() => {
    const cleanAttr = () => {
      if (editorSDK && layerAttrs.attrs) {
        const cleanAttrs = {
          ...layerAttrs,
          attrs: undefined,
          textCrop: undefined,
          rawData: undefined,
          originBoxInfo: undefined,
          hasChangedWidth: undefined,
          textScale: undefined,
          colorRaw: undefined,
          margin: undefined,
        };
        editorSDK?.changeCompAttr(elemId, cleanAttrs);
      }
    };
    cleanAttr();

    return () => {};
  }, []);

  useEffect(() => {
    if (!viewerSDK) {
      return;
    }
    // const { words, chars } = text.split(inputRef.current as HTMLElement, {
    //   words: { wrap: "clip" },
    //   chars: true,
    // });

    // console.log(chars);

    // animate(chars, {
    //   y: ["0%", "100%"],

    //   easing: "outQuad",
    //   delay: stagger(100),
    //   // duration: 2000,
    //   // loop: true,
    // });

    // animate(chars, {
    //   // Property keyframes
    //   x: [
    //     { to: "-100%", duration: 100 },
    //     { to: 0, duration: 800, delay: 100 },
    //   ],
    //   opacity: [
    //     // { to: 0, duration: 100 },
    //     { to: 1, duration: 100, delay: 100 },
    //   ],
    //   // Property specific parameters
    //   // rotate: {
    //   //   from: "-1turn",
    //   //   delay: 0,
    //   // },
    //   delay: stagger(50),
    //   ease: "inOut",
    //   loopDelay: 1000,
    //   loop: true,
    // });

    // 印刷、上升、移位、爆裂、弹跳、翻转、滑动
    // 上升、平移、淡入淡出、弹出、擦除、模糊
    // createTimeline({
    //   loop: true,
    // })
    //   .add(
    //     chars,
    //     {
    //       opacity: [0, 1],
    //       duration: 1,
    //     },
    //     stagger(50)
    //   )
    //   .init();
  }, [layerAttrs.text]);

  const setValue = (nextVal: string) => {
    // 移除脚本标签
    let processedVal = nextVal.replace(/<script.*?>.*?<\/script>/g, '');

    // 确保保存的始终是纯文本内容
    processedVal = getPlainTextValue(processedVal);

    // 调试日志：监控换行符数量变化
    if (process.env.NODE_ENV === 'development') {
      const currentNewlines = (valueRef.current.match(/\n/g) || []).length;
      const newNewlines = (processedVal.match(/\n/g) || []).length;
      if (newNewlines > currentNewlines + 5) {
        // 如果换行符异常增加
        console.warn('TextEditor: 检测到换行符异常增加', {
          elemId,
          current: currentNewlines,
          new: newNewlines,
          currentValue: valueRef.current,
          processedValue: processedVal,
          originalInput: nextVal,
        });
      }
    }

    if (processedVal === valueRef.current) {
      return;
    }

    _setValue(processedVal);

    if (onChange) {
      return onChange(processedVal);
    }

    editorSDK?.changeCompAttr(elemId, {
      text: processedVal,
    });
  };

  // 单一数据源：始终基于纯文本内容进行渲染
  const plainTextContent = getPlainTextValue(value);

  // 渲染内容：根据isList属性决定输出格式
  const renderContent = useMemo(() => {
    if (!plainTextContent) {
      return { __html: '' };
    }

    if (layerAttrs.isList) {
      // 列表模式：将纯文本转换为HTML列表
      const lines = plainTextContent
        .split(/\r?\n/)
        .filter(line => line.trim() !== '');
      if (lines.length === 0) {
        return { __html: plainTextContent };
      }

      // 检测是否使用SVG图标或自定义图标
      const isSvgIcon = layerAttrs.listStyle?.startsWith('svg-icon:');
      const isCustomIcon = layerAttrs.listStyle?.startsWith('custom-icon:');

      if (isSvgIcon || isCustomIcon) {
        // 使用通用的图标处理函数
        const iconHtml = getListIconSvgString(
          layerAttrs.listStyle || '',
          undefined,
          layerAttrs.fontSize
        );

        const listItems = lines
          .map(
            (line, index) =>
              `<li data-line="${index}">
                ${iconHtml}
                <span>${line.trim()}</span>
              </li>`
          )
          .join('');

        return {
          __html: `<ul class="svg-icon-list" data-style="${layerAttrs.listStyle}">${listItems}</ul>`,
        };
      } else {
        // 传统CSS列表样式
        const listItems = lines.map(line => `<li>${line.trim()}</li>`).join('');
        return {
          __html: `<ul style="${layerAttrs.listStyle || ''}">${listItems}</ul>`,
        };
      }
    } else {
      // 普通文本模式：直接显示纯文本
      return { __html: plainTextContent };
    }
  }, [
    plainTextContent,
    layerAttrs.isList,
    layerAttrs.listStyle,
    layerAttrs.fontSize,
  ]);
  // 检测是否为渐变颜色 - 支持 linear-gradient, radial-gradient, conic-gradient
  const isGradient = /gradient\s*\(/gi.test(layerAttrs.color || '');

  const getMinWidth = () => {
    if (!isSafari() && !isIOS()) return 24;
    // 兼容iOS竖排文字的宽度计算
    const { fontSize, lineHeight, text, writingMode = '' } = layerAttrs;
    if (!/vertical/gi.test(writingMode)) return 24;
    const textPhas = text.split('\n');
    const fontSizeNumber = Number(String(fontSize).replace('px', ''));
    const lineHeightNumber =
      Number(String(lineHeight).replace('px', '')) || 1.5;
    const minWidth = fontSizeNumber
      ? fontSizeNumber * lineHeightNumber * textPhas.length
      : 24;
    return minWidth;
  };

  // 构建基础样式，排除可能冲突的颜色属性
  const baseStyle = {
    ...layerAttrs,
    margin: 0,
    fontFamily: `"${currFontFamily}"`,
    minWidth: getMinWidth(),
    // writingMode: "unset",
    // 如果有actionLink，显示为超链接样式，下划线
    textDecoration: actionLink ? 'underline' : layerAttrs.textDecoration,
    cursor: actionLink ? 'pointer' : 'text',
    position: 'relative',
    width: '100%',
    whiteSpace: 'break-spaces',
    zIndex: 11,
    // opacity: 0,
  } as React.CSSProperties;

  // 渐变文字样式处理
  let currStyle: React.CSSProperties;
  if (isGradient) {
    // 对于渐变文字，移除可能冲突的属性并应用渐变样式
    const {
      color: _color,
      background: _background,
      backgroundColor: _backgroundColor,
      backgroundImage: _backgroundImage,
      ...restStyle
    } = baseStyle;
    currStyle = {
      ...restStyle,
      // 只设置背景相关样式，其他渐变样式由CSS类处理
      background: layerAttrs.color,
      backgroundImage: layerAttrs.color,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
    } as React.CSSProperties;
  } else {
    // 普通文字使用原有样式
    currStyle = baseStyle;
  }

  // if (inputId === "input_hjyWwSMJij") {
  //   console.log(
  //     "currStyle",
  //     currStyle,
  //     "isGradient",
  //     isGradient,
  //     "color",
  //     layerAttrs.color
  //   );
  // }

  return (
    <TextEditorContainer
      key={`${layerAttrs.listStyle || 'default'}`}
      className={`editinput ${isGradient ? 'text-gradient' : ''}`}
      id={inputId}
      onClick={() => {
        const actionPhone = layerLink?.action?.type === 'phone';
        if (!editorSDK && actionPhone) {
          // 检查是否为手机号，支持国际手机
          window.location.href = `tel:${inputRef.current?.innerText}`;
        }
      }}
      style={currStyle}
      // 自动聚焦
      ref={inputRef}
      contentEditable={
        editorSDK && !readonly ? 'plaintext-only' : (false as any)
      }
      onBlur={e => {
        const nextVal = (e.target as HTMLDivElement).innerHTML;
        console.log('nextVal', nextVal);
        setValue(nextVal);
      }}
      onKeyDown={() => {}}
      // placeholder="请输入内容"
      dangerouslySetInnerHTML={renderContent}
    />
  );
}
