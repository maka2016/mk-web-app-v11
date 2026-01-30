import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { DebounceClass, isIOS, SerializedWorksEntity } from '@/utils';
import styled from '@emotion/styled';
import { cn } from '@workspace/ui/lib/utils';
import React, {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getSystemVariableValue,
  replaceSystemVariables,
  SystemVariableKey,
} from '../../provider/system-provider';
import { blockStyleFilter } from '../../utils';
import {
  batchGetFontCropUrlManager,
  loadFontAction,
} from '../../utils/load-font';
import { useWorksStore } from '../../works-store/store/hook';
import { getListIconSvgString } from './TextStyleList';
import {
  containsHtmlTags,
  extractPlainTextFromElement,
  getPlainTextValue,
} from './textUtils';

const defaultFontFamily = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans SC", "Source Han Sans CN", "华文细黑", sans-serif,"Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif,"Noto Sans", sans-serif, "Droid Sans", "Arial Unicode MS", sans-serif`;

// 检测是否为Safari浏览器
const isSafari = () => {
  return (
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  );
};

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
  paragraphSpacing?: number;
  systemVariable?: {
    enabled: boolean;
    removed?: boolean;
    key?: SystemVariableKey;
  };
}

export interface TextCompProps {
  elemId: string;
  layer: LayerElemItem;
  layerAttrs: TextAttrs;
  didLoaded?: () => void;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  readonly?: boolean;
  worksDetail?: SerializedWorksEntity;
  autoFocus?: boolean;
  style?: CSSProperties;
  isActive?: boolean;
}

const TextEditorContainer = styled.div`
  position: relative;
  font-family: ${defaultFontFamily};
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  user-select: auto !important;
  min-width: 24px;
  width: fit-content;

  outline: none;

  &.system-variable {
    min-height: 12px;
  }

  &.system-variable-removed {
    opacity: 0.5;
  }

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
    list-style-position: outside; /* 标记位于内容外部 */
  }

  li {
    display: list-item;
    margin: 0;
    padding: 0;
    line-height: inherit; /* 继承行高 */
  }

  /* 段间距样式 - 列表项之间的间距 */
  li:not(:last-child) {
    margin-bottom: var(--paragraph-spacing, 0);
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

  /* 段落样式 - 普通文本段落间距 */
  .text-paragraph:not(:last-child) {
    margin-bottom: var(--paragraph-spacing, 0);
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
  uid,
  worksId,
  loadFullFont,
  id = '',
  onLoadFont,
  onErrorFont,
}: {
  fontFamily: string;
  fontUrl: string;
  text: string;
  uid: string;
  worksId: string;
  loadFullFont: boolean;
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

        const planText = `${text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/g, ' ')}　`;
        if (!batchGetFontCropUrlManager.options?.uid) {
          batchGetFontCropUrlManager.setOptions({
            uid,
            pageId: worksId,
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
      if (loadFullFont) {
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

export default function TextComp({
  worksDetail,
  layerAttrs,
  layer,
  readonly = false,
  elemId,
  autoFocus = false,
  didLoaded,
  onChange,
}: TextCompProps) {
  const worksStore = useWorksStore();
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

  const actionLink = layer?.action?.actionAttrs?.link;
  const inputId = `input_${elemId}`;
  const fontAttrs = getFontFamily(layerAttrs);

  // 单一数据源：始终基于纯文本内容进行渲染
  const plainTextContent = getPlainTextValue(value);

  // 检查是否使用系统变量容器模式
  const systemVariableConfig = layerAttrs?.systemVariable;
  const isUsingSystemVariable =
    systemVariableConfig?.enabled && systemVariableConfig?.key;

  // 计算实际要显示的文本（用于字体裁剪和渲染）
  // 如果使用系统变量容器模式，获取变量值；否则使用原始文本并替换变量引用
  const actualDisplayText = useMemo(() => {
    if (isUsingSystemVariable) {
      // 变量容器模式：整个文本被替换为变量值
      // 使用 layerAttrs.text 作为默认值
      const variableValue = getSystemVariableValue(
        systemVariableConfig.key as SystemVariableKey,
        plainTextContent || ''
      );
      return variableValue;
    } else {
      // 普通模式：替换文本中的变量引用
      return replaceSystemVariables(plainTextContent);
    }
  }, [plainTextContent, isUsingSystemVariable, systemVariableConfig]);

  // 非HTML导出模式，需要加载全量字体
  const loadFullFont =
    worksStore.inEditor ||
    !/html/i.test(worksDetail?.specInfo.export_format || '');

  const { currFontFamily } = useFont({
    fontFamily: fontAttrs.fontFamily,
    fontUrl: fontAttrs.fontUrl,
    // 使用实际显示的文本进行字体裁剪
    text: actualDisplayText,
    uid: worksDetail?.uid?.toString() || 'none',
    worksId: worksDetail?.id?.toString() || 'none2',
    // loadFullFont: true,
    loadFullFont: loadFullFont,
    id: elemId,
    onLoadFont: () => {
      didLoaded?.();
    },
    onErrorFont: () => {
      if (fontAttrs.fontFamily) {
        console.warn('font error', fontAttrs.fontFamily, fontAttrs.fontUrl);
      }
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
      if (worksStore.inEditor && layerAttrs.attrs) {
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
        worksStore.changeCompAttr(elemId, cleanAttrs);
      }
    };
    cleanAttr();

    return () => { };
  }, []);

  const setValue = (nextVal: string) => {
    // 移除脚本标签
    let processedVal = nextVal.replace(/<script.*?>.*?<\/script>/gi, '');

    // 确保保存的始终是纯文本内容
    processedVal = getPlainTextValue(processedVal);

    // 最终验证：确保不包含任何HTML标签（双重保险）
    // 如果仍然包含HTML标签，说明清理逻辑有问题，需要再次清理
    if (containsHtmlTags(processedVal)) {
      console.warn('TextEditor: 检测到保存数据中仍包含HTML标签，进行二次清理', {
        elemId,
        originalValue: nextVal,
        processedValue: processedVal,
      });
      // 使用更激进的方式清理：移除所有HTML标签
      processedVal = processedVal
        .replace(/<[^>]+>/g, '')
        .replace(/<\/[^>]+>/g, '')
        .trim();
    }

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

    worksStore.changeCompAttr(elemId, {
      text: processedVal,
    });
  };

  // 提取用于渲染的属性，避免 useMemo 依赖对象属性导致编译警告
  const isSystemVariableRemoved = systemVariableConfig?.removed;
  const isList = layerAttrs.isList;
  const listStyle = layerAttrs.listStyle;
  const fontSize = layerAttrs.fontSize;
  const paragraphSpacing = layerAttrs.paragraphSpacing;

  // 渲染内容：根据isList属性决定输出格式
  const renderContent = useMemo(() => {
    if (isSystemVariableRemoved) {
      return { __html: worksStore.inEditor ? '+ 点击添加嘉宾名称' : '' };
    }
    if (!actualDisplayText) {
      return { __html: '' };
    }

    if (isList) {
      // 列表模式：将纯文本转换为HTML列表
      const lines = actualDisplayText
        .split(/\r?\n/)
        .filter(line => line.trim() !== '');
      if (lines.length === 0) {
        return { __html: actualDisplayText };
      }

      // 检测是否使用SVG图标或自定义图标
      const isSvgIcon = listStyle?.startsWith('svg-icon:');
      const isCustomIcon = listStyle?.startsWith('custom-icon:');

      if (isSvgIcon || isCustomIcon) {
        // 使用通用的图标处理函数
        const iconHtml = getListIconSvgString(
          listStyle || '',
          undefined,
          fontSize
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
          __html: `<ul class="svg-icon-list" data-style="${listStyle}">${listItems}</ul>`,
        };
      } else {
        // 传统CSS列表样式
        const listItems = lines.map(line => `<li>${line.trim()}</li>`).join('');
        const { padding } = blockStyleFilter({ padding: 24 })
        return {
          __html: `<ul style="${listStyle || ''}; padding-left: ${padding}">${listItems}</ul>`,
        };
      }
    } else {
      // 普通文本模式：如果有段间距，将文本分段并包裹
      if (paragraphSpacing && paragraphSpacing > 0) {
        const paragraphs = actualDisplayText.split(/\r?\n/);
        const paragraphsHtml = paragraphs
          .map(
            (paragraph, index) =>
              `<div class="text-paragraph" data-para="${index}">${paragraph}</div>`
          )
          .join('');
        return { __html: paragraphsHtml };
      } else {
        // 没有段间距时，直接显示纯文本
        return { __html: actualDisplayText };
      }
    }
  }, [
    actualDisplayText,
    isSystemVariableRemoved,
    worksStore.inEditor,
    isList,
    listStyle,
    fontSize,
    paragraphSpacing,
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
    // 设置段间距CSS变量
    ['--paragraph-spacing' as any]: layerAttrs.paragraphSpacing
      ? `${layerAttrs.paragraphSpacing}px`
      : '0',
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

  return (
    <TextEditorContainer
      key={`${layerAttrs.listStyle || 'default'}`}
      className={cn(
        `editinput`,
        isGradient && 'text-gradient',
        isUsingSystemVariable && 'system-variable',
        systemVariableConfig?.removed && 'system-variable-removed'
      )}
      id={inputId}
      onClick={() => {
        const actionPhone = layer?.action?.type === 'phone';
        if (!worksStore.inEditor && actionPhone) {
          // 检查是否为手机号，支持国际手机
          window.location.href = `tel:${inputRef.current?.innerText}`;
        }
      }}
      style={currStyle}
      // 自动聚焦
      ref={inputRef}
      contentEditable={
        worksStore.inEditor && !readonly ? 'plaintext-only' : (false as any)
      }
      onBlur={e => {
        const target = e.target as HTMLDivElement;
        // 使用工具函数安全提取纯文本内容
        const nextVal = extractPlainTextFromElement(target);
        console.log('onBlur nextVal', nextVal);
        setValue(nextVal);
      }}
      onKeyDown={() => { }}
      // placeholder="请输入内容"
      dangerouslySetInnerHTML={renderContent}
    />
  );
}
