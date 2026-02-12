/**
 * 可复用的动画播放工具函数（GSAP 版本）
 * - 预览：playAnimation / playTextAnimation / playEmphasisAnimation（设置面板单段预览）
 * - 时间轴：buildTimelineFromAnimateQueue（页面/画布整条时间轴播放）
 */
import type { AnimateQueue2, AnimationState } from '@/components/GridEditorV3/works-store/types/animate2';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { SplitText } from 'gsap/SplitText';
import { convertAnimeParamsToGsap, convertStagger, ANIMATION_CLEAR_PROPS } from './gsapHelpers';

// 注册 GSAP 插件
gsap.registerPlugin(SplitText, DrawSVGPlugin);

/** 根据 elemId 得到对应 DOM 的 id（与 resolveTarget 配套使用） */
export function getElementId(elemId: string): string {
  return `elem_wrapper_${elemId}`;
}

/** 强调动画目标元素 id：与 WidgetItemRendererV2 中 layer_root_ 一致 */
export function getEmphasisWrapperId(elemId: string): string {
  return `layer_root_${elemId}`;
}

/** 目标元素：传 targetId 时取 document.getElementById(`elem_wrapper_${targetId}`)，传 HTMLElement 时直接使用 */
export type AnimationTarget = string | HTMLElement;

export function resolveTarget(target: AnimationTarget): HTMLElement | null {
  if (typeof target === 'string') {
    const id = getElementId(target);
    const byId = document.getElementById(id);
    if (byId) return byId;
    // 画布在 designer_scroll_container 内，部分场景下用容器内查找更可靠
    const inDesigner = document.querySelector<HTMLElement>(`#designer_scroll_container #${CSS.escape(id)}`);
    return inDesigner ?? null;
  }
  return target;
}

/** 强调动画目标：使用 layer_root_ 元素 */
export function resolveEmphasisTarget(target: AnimationTarget): HTMLElement | null {
  if (typeof target === 'string') {
    const id = getEmphasisWrapperId(target);
    const byId = document.getElementById(id);
    if (byId) return byId;
    const inDesigner = document.querySelector<HTMLElement>(`#designer_scroll_container #${CSS.escape(id)}`);
    return inDesigner ?? null;
  }
  return target;
}

/** 行容器 id：与 LongPageRowEditorV2 中 EditorRowWrapper 的 id 一致 */
export function getRowElementId(rowId: string): string {
  return `editor_row_${rowId}`;
}

/** 行动画目标：根据 rowId 取 editor_row_ 容器 DOM */
export function resolveRowTarget(rowId: string): HTMLElement | null {
  const id = getRowElementId(rowId);
  const byId = document.getElementById(id);
  if (byId) return byId;
  const inDesigner = document.querySelector<HTMLElement>(`#designer_scroll_container #${CSS.escape(id)}`);
  return inDesigner ?? null;
}

/**
 * 清理并取消之前的动画实例（GSAP 版本）
 */
function cleanupAnimation(instance: gsap.core.Tween | gsap.core.Timeline | null): void {
  if (!instance) return;
  instance.kill(); // GSAP 使用 kill() 停止并清理动画
  gsap.set(instance.targets(), { clearProps: ANIMATION_CLEAR_PROPS }); // 只清理动画属性，保留原有样式
}

/**
 * 播放常规进场/退场动画（非文字）- GSAP 版本
 * @param target 目标 targetId 或 HTMLElement
 * @param animation 动画状态
 * @param previousInstance 上一次的动画实例，用于先清理再播新动画
 * @returns 新的动画实例，调用方需保存并在下次播放时传入 previousInstance
 */
export function playAnimation(
  target: AnimationTarget,
  animation: AnimationState,
  previousInstance?: gsap.core.Tween | gsap.core.Timeline | null
): gsap.core.Tween | null {
  const targetDOM = resolveTarget(target);
  if (!targetDOM) return null;

  if (previousInstance) {
    cleanupAnimation(previousInstance);
  }

  // 转换 anime.js 参数为 GSAP 格式
  const { from, to } = convertAnimeParamsToGsap(animation.parameters);

  // 使用 GSAP fromTo 创建动画
  const anim = gsap.fromTo(targetDOM, from, {
    ...to,
    onComplete: () => {
      // 动画完成后只清理动画属性，保留原有样式
      gsap.set(targetDOM, { clearProps: ANIMATION_CLEAR_PROPS });
    },
  });

  return anim;
}

/** 文字动画的上一轮实例，用于清理 - GSAP 版本 */
export interface TextAnimationPrevious {
  animation: gsap.core.Tween | null;
  split: SplitText | null;
}

/**
 * 播放文字进场/退场动画（按字 stagger）- GSAP 版本
 * @param target 目标 targetId 或 HTMLElement
 * @param animation 动画状态
 * @param previous 上一轮的文字动画实例，用于先清理再播新动画
 * @returns 新的动画实例与 split 信息，调用方需保存并在下次播放时传入 previous
 */
export function playTextAnimation(
  target: AnimationTarget,
  animation: AnimationState,
  previous?: TextAnimationPrevious | null
): { animation: gsap.core.Tween; split: SplitText } | null {
  const targetDOM = resolveTarget(target);
  if (!targetDOM) return null;

  // 清理之前的动画和分割
  if (previous?.animation) {
    cleanupAnimation(previous.animation);
  }
  if (previous?.split) {
    previous.split.revert();
  }

  // 使用 GSAP SplitText 分割文字
  const split = new SplitText(targetDOM, { type: 'chars' });
  const chars = split.chars;

  // 转换 anime.js 参数为 GSAP 格式
  const { from, to } = convertAnimeParamsToGsap(animation.parameters);

  // 计算 stagger 延迟（anime.js 的 delay 字段用于 stagger）
  const staggerDelay = convertStagger(animation.delay);

  // 使用 GSAP fromTo 创建文字动画
  const anim = gsap.fromTo(
    chars,
    from,
    {
      ...to,
      stagger: staggerDelay, // GSAP stagger（秒）
      onComplete: () => {
        split.revert();
        gsap.set(chars, { clearProps: ANIMATION_CLEAR_PROPS });
      },
    }
  );

  return { animation: anim, split };
}

/**
 * 播放强调动画（合并所有 emphasis 的 parameters）- GSAP 版本
 * 使用 layer_root_ 元素作为动画目标。
 * @param target 目标 targetId 或 HTMLElement
 * @param animateQueue 动画队列（取 emphasis 列表）
 * @param previousInstance 上一次的动画实例
 * @returns 新的动画实例
 */
export function playEmphasisAnimation(
  target: AnimationTarget,
  animateQueue: AnimateQueue2,
  previousInstance?: gsap.core.Tween | gsap.core.Timeline | null
): gsap.core.Tween | null {
  const targetDOM = resolveEmphasisTarget(target);
  if (!targetDOM) return null;

  if (previousInstance) {
    cleanupAnimation(previousInstance);
  }

  if (!animateQueue.emphasis?.length) {
    return null;
  }

  // 合并所有 emphasis 的 parameters
  let params: Record<string, unknown> = {};
  animateQueue.emphasis.forEach(item => {
    params = { ...params, ...item.parameters };
  });

  // 转换 anime.js 参数为 GSAP 格式
  const { from, to } = convertAnimeParamsToGsap(params);

  // 处理循环（loop 转 repeat）
  // 注意：anime.js loop:true 无限循环，GSAP repeat:-1 无限循环
  // anime.js loop:3 播放3次，GSAP repeat:2 播放3次（repeat 表示额外次数）

  // 使用 GSAP fromTo 创建强调动画
  const anim = gsap.fromTo(targetDOM, from, {
    ...to,
    onComplete: () => {
      gsap.set(targetDOM, { clearProps: ANIMATION_CLEAR_PROPS });
    },
  });

  return anim;
}

/**
 * 根据 AnimateQueue2 构建完整时间轴（entrance → emphasis → exit）- GSAP 版本
 * 用于页面/画布上元素进入视口后的整条动画播放
 * @param containerElement 容器 DOM
 * @param animateQueue 动画队列
 * @returns { timeline, split } timeline 供 play/seek，split 供调用方做清理
 */
export function buildTimelineFromAnimateQueue(
  containerElement: HTMLElement,
  animateQueue: AnimateQueue2
): { timeline: gsap.core.Timeline; split: SplitText | null } {
  // 创建主时间轴（暂停状态）
  const mainTimeline = gsap.timeline({ 
    paused: true,
    // 立即应用初始状态，确保在时间轴创建时元素就处于正确的初始状态
    immediateRender: true
  });
  let splitText: SplitText | null = null;

  // 检查是否有文字动画
  const hasTextEntrance = animateQueue.entrance?.some(item => item.type === 'text');
  const hasTextExit = animateQueue.exit?.some(item => item.type === 'text');

  // 如果有文字动画，先分割文字
  if (hasTextEntrance || hasTextExit) {
    splitText = new SplitText(containerElement, { type: 'chars' });
    // 初始隐藏字符（进场动画需要）
    if (hasTextEntrance) {
      gsap.set(splitText.chars, { opacity: 0 });
    }
  }

  // 1. 构建进场动画（entrance）—— 多个入场动画叠加（同时播放）
  if (animateQueue.entrance && animateQueue.entrance.length > 0) {
    // 合并所有进场动画的初始状态（from），一次性 gsap.set 避免相互覆盖
    const mergedCommonFrom: Record<string, unknown> = {};
    const mergedTextFrom: Record<string, unknown> = {};
    animateQueue.entrance.forEach((item) => {
      const { from } = convertAnimeParamsToGsap(item.parameters);
      if (item.type === 'text' && splitText) {
        Object.assign(mergedTextFrom, from);
      } else {
        Object.assign(mergedCommonFrom, from);
      }
    });
    if (Object.keys(mergedTextFrom).length > 0 && splitText) {
      gsap.set(splitText.chars, mergedTextFrom);
    }
    if (Object.keys(mergedCommonFrom).length > 0) {
      gsap.set(containerElement, mergedCommonFrom);
    }

    // 然后构建进场动画时间轴——多个动画叠加（同时开始）
    animateQueue.entrance.forEach((item, index) => {
      const { from, to } = convertAnimeParamsToGsap(item.parameters);

      if (item.type === 'text' && splitText) {
        // 文字动画：应用到字符数组
        const staggerDelay = convertStagger(item.delay);
        mainTimeline.fromTo(
          splitText.chars,
          from,
          {
            ...to,
            stagger: staggerDelay,
            immediateRender: true,
          },
          index === 0 ? 0 : '<' // 叠加：后续动画与第一个同时开始
        );
      } else {
        // 常规元素动画
        mainTimeline.fromTo(
          containerElement,
          from,
          {
            ...to,
            immediateRender: true,
          },
          index === 0 ? 0 : '<' // 叠加：后续动画与第一个同时开始
        );
      }
    });
  }

  // 2. 构建强调动画（emphasis）
  // 强调动画在进场动画完成后开始
  if (animateQueue.emphasis && animateQueue.emphasis.length > 0) {
    // 检查是否为无限循环
    const emphasisInfinite = animateQueue.emphasis.some(
      item => item.parameters?.loop === true
    );

    animateQueue.emphasis.forEach((item, index) => {
      const { from, to } = convertAnimeParamsToGsap(item.parameters);

      mainTimeline.fromTo(
        containerElement,
        from,
        to,
        index === 0 ? '>' : '<' // 第一个强调动画在进场后开始，后续同时开始
      );
    });

    // 如果强调动画是无限循环，不添加退场动画
    if (emphasisInfinite) {
      return { timeline: mainTimeline, split: splitText };
    }
  }

  // 3. 构建退场动画（exit）
  // 退场动画在强调动画完成后开始（如果没有强调动画，则在进场动画后开始）
  if (animateQueue.exit && animateQueue.exit.length > 0) {
    animateQueue.exit.forEach((item, index) => {
      const { from, to } = convertAnimeParamsToGsap(item.parameters);

      if (item.type === 'text' && splitText) {
        // 文字退场动画
        const staggerDelay = convertStagger(item.delay);
        mainTimeline.fromTo(
          splitText.chars,
          from,
          {
            ...to,
            stagger: staggerDelay,
          },
          index === 0 ? '>' : '>'
        );
      } else {
        // 常规元素退场动画
        mainTimeline.fromTo(
          containerElement,
          from,
          to,
          index === 0 ? '>' : '>'
        );
      }
    });
  }

  return { timeline: mainTimeline, split: splitText };
}

/**
 * 笔刷动画路径预设
 * 使用 SVG path 来定义笔刷绘制的轨迹
 * 路径设计原则：确保 stroke 完全覆盖 0-100 的区域
 */
export const BRUSH_PATHS = {
  // Z形路径：密集的来回路径，确保完全覆盖
  zigzag: 'M -5,8 L 105,8 L -5,25 L 105,25 L -5,42 L 105,42 L -5,58 L 105,58 L -5,75 L 105,75 L -5,92 L 105,92',
  // N形路径：从左下到左上，斜向右下，再到右上
  nShape: 'M 5,95 L 5,5 L 95,95 L 95,5',
  // 波浪形路径：横向波浪覆盖
  wave: 'M -5,12 Q 25,-5 50,12 T 105,12 M -5,37 Q 25,20 50,37 T 105,37 M -5,62 Q 25,45 50,62 T 105,62 M -5,87 Q 25,70 50,87 T 105,87',
  // 螺旋形路径：从中心向外扩展，确保覆盖边缘
  spiral: 'M 50,50 L 50,35 L 65,35 L 65,65 L 35,65 L 35,25 L 75,25 L 75,75 L 25,75 L 25,15 L 85,15 L 85,85 L 15,85 L 15,5 L 95,5 L 95,95 L 5,95 L 5,-5 L 105,-5 L 105,105 L -5,105 L -5,-5',
  // 简单横向：密集横线覆盖，确保完全填充
  horizontal: 'M -5,6 L 105,6 M -5,18 L 105,18 M -5,30 L 105,30 M -5,42 L 105,42 M -5,54 L 105,54 M -5,66 L 105,66 M -5,78 L 105,78 M -5,94 L 105,94',
} as const;

export type BrushPathType = keyof typeof BRUSH_PATHS;

/** 笔刷动画配置 */
export interface BrushAnimationConfig {
  /** 路径类型 */
  pathType: BrushPathType;
  /** 动画时长（毫秒） */
  duration?: number;
  /** 笔刷宽度（像素） */
  strokeWidth?: number;
  /** 缓动函数 */
  ease?: string;
}

/** 存储笔刷动画的 SVG 元素引用，用于清理 */
const brushSvgMap = new Map<string, SVGSVGElement>();

/**
 * 播放笔刷动画（使用 DrawSVGPlugin）
 * 
 * 原理：
 * 1. 动态创建 SVG 元素，包含笔刷路径
 * 2. 将 SVG 作为目标元素的 mask
 * 3. 使用 DrawSVGPlugin 动画描边，从 0% 到 100%
 * 4. 随着描边进行，元素逐渐显示
 * 
 * @param target 目标元素
 * @param config 笔刷动画配置
 * @param previousInstance 上一次的动画实例
 * @returns GSAP 动画实例
 */
export function playBrushAnimation(
  target: AnimationTarget,
  config: BrushAnimationConfig,
  previousInstance?: gsap.core.Tween | gsap.core.Timeline | null
): gsap.core.Timeline | null {
  const targetDOM = resolveTarget(target);
  if (!targetDOM) return null;

  // 清理之前的动画
  if (previousInstance) {
    previousInstance.kill();
  }

  // 获取目标元素的 ID，用于唯一标识 SVG
  const targetId = typeof target === 'string' ? target : targetDOM.id || `brush-${Date.now()}`;
  
  // 清理之前的 SVG
  const existingSvg = brushSvgMap.get(targetId);
  if (existingSvg) {
    existingSvg.remove();
    brushSvgMap.delete(targetId);
  }

  // 获取配置参数
  const {
    pathType,
    duration = 1000,
    strokeWidth = 30,
    ease = 'power2.out',
  } = config;

  const pathData = BRUSH_PATHS[pathType];
  const maskId = `brush-mask-${targetId}-${Date.now()}`;

  // 创建 SVG 元素
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position: absolute; pointer-events: none;');
  svg.innerHTML = `
    <defs>
      <mask id="${maskId}" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
        <rect x="0" y="0" width="1" height="1" fill="black"/>
        <g transform="scale(0.01, 0.01)">
          <path 
            d="${pathData}" 
            stroke="white" 
            stroke-width="${strokeWidth}" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            fill="none"
            class="brush-path"
          />
        </g>
        <!-- 用于动画结束时确保完全显示的白色矩形 -->
        <rect x="0" y="0" width="1" height="1" fill="white" opacity="0" class="fill-rect"/>
      </mask>
    </defs>
  `;

  // 将 SVG 添加到 body
  document.body.appendChild(svg);
  brushSvgMap.set(targetId, svg);

  // 获取路径元素和填充矩形
  const pathElement = svg.querySelector('.brush-path') as SVGPathElement;
  const fillRect = svg.querySelector('.fill-rect') as SVGRectElement;
  if (!pathElement) {
    console.error('Brush path element not found');
    return null;
  }

  // 设置目标元素的 mask
  const originalMask = targetDOM.style.mask || targetDOM.style.webkitMask || '';
  targetDOM.style.mask = `url(#${maskId})`;
  targetDOM.style.webkitMask = `url(#${maskId})`;

  // 初始状态：完全隐藏（设置初始透明度）
  gsap.set(targetDOM, { opacity: 1 });

  // 计算动画时间分配：90% 用于路径绘制，10% 用于确保完全填充
  const pathDuration = (duration / 1000) * 0.9;
  const fillDuration = (duration / 1000) * 0.1;

  // 创建时间轴
  const timeline = gsap.timeline({
    onComplete: () => {
      // 动画完成后，移除 mask 并清理 SVG
      targetDOM.style.mask = originalMask || '';
      targetDOM.style.webkitMask = originalMask || '';
      svg.remove();
      brushSvgMap.delete(targetId);
    },
  });

  // 使用 DrawSVGPlugin 动画描边
  timeline.fromTo(
    pathElement,
    { drawSVG: '0%' },
    {
      drawSVG: '100%',
      duration: pathDuration,
      ease,
    }
  );

  // 在路径动画接近结束时，淡入白色矩形确保完全显示
  if (fillRect) {
    timeline.to(
      fillRect,
      {
        attr: { opacity: 1 },
        duration: fillDuration,
        ease: 'power2.in',
      },
      `-=${fillDuration}` // 与路径动画末尾重叠
    );
  }

  return timeline;
}

/**
 * 清理所有笔刷动画的 SVG 元素
 */
export function cleanupAllBrushAnimations(): void {
  brushSvgMap.forEach((svg) => {
    svg.remove();
  });
  brushSvgMap.clear();
}
