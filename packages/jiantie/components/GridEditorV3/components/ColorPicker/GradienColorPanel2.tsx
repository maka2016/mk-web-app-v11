import { DebounceClass } from '@/utils';
import cls from 'classnames';
import { useEffect, useState } from 'react';
import { ChromePicker, ColorResult } from 'react-color';

interface GradientPoint {
  position: number;
  rgb: { r: number; g: number; b: number; a: number };
}

interface GradientData {
  degress: number;
  points: GradientPoint[];
}

const PRESET_ANGLES = [0, 45, 90, 180, 225, 270];
const debounce = new DebounceClass();

/** 解析颜色值（支持 hex、rgb、rgba） */
const parseColor = (
  colorStr: string
): { r: number; g: number; b: number; a: number } => {
  // 处理 hex 格式 #ffffff 或 #fff
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    if (hex.length === 3) {
      // 短格式 #fff -> #ffffff
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }

  // 处理 rgb/rgba 格式
  const rgbMatch = colorStr.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // 默认返回黑色
  return { r: 0, g: 0, b: 0, a: 1 };
};

/** 解析线性渐变字符串 */
const parseGradientString = (gradientString: string): GradientData => {
  const fallback: GradientData = {
    degress: 90,
    points: [
      { position: 0, rgb: { r: 255, g: 255, b: 255, a: 1 } },
      { position: 100, rgb: { r: 0, g: 0, b: 0, a: 1 } },
    ],
  };

  try {
    const match = gradientString.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    if (!match) return fallback;

    const degress = parseInt(match[1], 10);
    const stopsStr = match[2];

    const points: GradientPoint[] = [];
    let currentIndex = 0;

    // 逐个解析颜色停止点
    while (currentIndex < stopsStr.length) {
      // 跳过空白和逗号
      while (
        currentIndex < stopsStr.length &&
        /[\s,]/.test(stopsStr[currentIndex])
      ) {
        currentIndex++;
      }
      if (currentIndex >= stopsStr.length) break;

      // 匹配颜色值
      let colorStr = '';
      let colorEndIndex = currentIndex;

      // 匹配 hex 格式
      if (stopsStr[currentIndex] === '#') {
        const hexMatch = stopsStr
          .slice(currentIndex)
          .match(/^#[\da-fA-F]{3,6}/i);
        if (hexMatch) {
          colorStr = hexMatch[0];
          colorEndIndex = currentIndex + hexMatch[0].length;
        }
      }
      // 匹配 rgb/rgba 格式
      else if (stopsStr.slice(currentIndex).startsWith('rgb')) {
        let parenCount = 0;
        let startIdx = currentIndex;
        let i = currentIndex;
        while (i < stopsStr.length) {
          if (stopsStr[i] === '(') parenCount++;
          if (stopsStr[i] === ')') {
            parenCount--;
            if (parenCount === 0) {
              colorStr = stopsStr.slice(startIdx, i + 1);
              colorEndIndex = i + 1;
              break;
            }
          }
          i++;
        }
      }

      if (!colorStr) break;

      // 跳过颜色值后的空白
      let posStartIndex = colorEndIndex;
      while (
        posStartIndex < stopsStr.length &&
        /\s/.test(stopsStr[posStartIndex])
      ) {
        posStartIndex++;
      }

      // 匹配位置值（数字后可能跟 %）
      const posMatch = stopsStr
        .slice(posStartIndex)
        .match(/^(\d+(?:\.\d+)?)%?/);
      if (!posMatch) break;

      const position = parseFloat(posMatch[1]);
      const rgb = parseColor(colorStr);
      points.push({ position, rgb });

      // 移动到下一个停止点的开始位置
      currentIndex = posStartIndex + posMatch[0].length;
    }

    // 确保至少有两个点
    if (points.length < 2) {
      return fallback;
    }

    // 按位置排序
    points.sort((a, b) => a.position - b.position);

    // 检查所有位置是否相同（会导致没有渐变效果）
    const allSamePosition = points.every(
      p => p.position === points[0].position
    );
    if (allSamePosition) {
      // 如果所有位置都相同，自动修正为均匀分布
      // 第一个点为0%，最后一个点为100%，中间的点均匀分布
      points.forEach((point, index) => {
        point.position = (index / (points.length - 1)) * 100;
      });
    }

    return { degress, points };
  } catch (error) {
    console.error('Error parsing gradient string:', error, gradientString);
    return fallback;
  }
};

const rgbToHex = (rgb: { r: number; g: number; b: number }) => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

export default function GradienColorPanel2({
  immediateChange = false,
  value = 'linear-gradient(90deg, #ffffff 0%, #000000 100%)',
  onChange,
}: {
  immediateChange?: boolean;
  value?: string;
  onChange: (gradient: string) => void;
}) {
  /* ------------------------- state & helpers ------------------------- */
  const parsed = parseGradientString(value);
  const [gradient, setGradient] = useState<GradientData>(parsed);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(
    rgbToHex(parsed.points[0].rgb)
  );
  const [angleInput, setAngleInput] = useState(String(parsed.degress));

  useEffect(() => {
    if (/gradient/.test(value)) {
      setGradient(parseGradientString(value));
    }
  }, [value]);

  const gradientCSS = () =>
    `linear-gradient(${gradient.degress}deg, ${gradient.points
      .map(p => `${rgbToHex(p.rgb)} ${p.position}%`)
      .join(', ')})`;

  const emitChange = (g: GradientData) => {
    const css = `linear-gradient(${g.degress}deg, ${g.points
      .map(p => `${rgbToHex(p.rgb)} ${p.position}%`)
      .join(', ')})`;
    if (immediateChange) onChange(css);
    else debounce.exec(() => onChange(css), 200);
  };

  /* ------------------------- handlers ------------------------- */
  const handleColorChange = (c: ColorResult) => {
    const pts = [...gradient.points];
    pts[activeIdx] = { ...pts[activeIdx], rgb: { ...c.rgb, a: c.rgb.a ?? 1 } };
    const g = { ...gradient, points: pts };
    setGradient(g);
    setSelectedColor(c.hex);
    emitChange(g);
  };

  const updateAngle = (deg: number) => {
    const clamped = Math.max(0, Math.min(360, deg));
    const g = { ...gradient, degress: clamped };
    setGradient(g);
    setAngleInput(String(clamped));
    emitChange(g);
  };

  const handleAddPoint = () => {
    if (gradient.points.length >= 5) return;
    const pts = [...gradient.points].sort((a, b) => a.position - b.position);
    const cur = pts[activeIdx];
    const next = pts[activeIdx + 1] ?? ({ position: 100 } as GradientPoint);
    const newPos = Math.round((cur.position + next.position) / 2);
    const newPoint: GradientPoint = { position: newPos, rgb: { ...cur.rgb } };
    const newPts = [...pts, newPoint].sort((a, b) => a.position - b.position);
    const newIdx = newPts.findIndex(p => p === newPoint);
    const g = { ...gradient, points: newPts };
    setGradient(g);
    setActiveIdx(newIdx);
    setSelectedColor(rgbToHex(newPoint.rgb));
    emitChange(g);
  };

  const handleDeletePoint = () => {
    if (gradient.points.length <= 2) return;
    const newPts = gradient.points.filter((_, idx) => idx !== activeIdx);
    const newIdx = Math.max(0, activeIdx - 1);
    const g = { ...gradient, points: newPts };
    setGradient(g);
    setActiveIdx(newIdx);
    setSelectedColor(rgbToHex(newPts[newIdx].rgb));
    emitChange(g);
  };

  /* ------------------------- effects ------------------------- */
  useEffect(() => {
    setSelectedColor(rgbToHex(gradient.points[activeIdx].rgb));
  }, [activeIdx, gradient.points]);

  /* ------------------------- render ------------------------- */
  return (
    <div className='w-[280px] bg-white rounded-md p-2 text-xs select-none'>
      {/* 节点行 */}
      <div className='flex items-center gap-1 mb-1'>
        {gradient.points.map((p, idx) => (
          <div
            key={idx}
            className={cls(
              'w-4 h-4 rounded-full border-2 cursor-pointer shadow transition-transform hover:scale-110',
              idx === activeIdx ? 'border-blue-500' : 'border-white'
            )}
            style={{ backgroundColor: rgbToHex(p.rgb) }}
            onClick={() => setActiveIdx(idx)}
          />
        ))}
        {/* 添加 / 删除 按钮 */}
        {gradient.points.length < 5 && (
          <button
            className='w-4 h-4 flex items-center justify-center rounded-full border border-dashed border-gray-300 text-blue-500 text-[10px] hover:bg-blue-500 hover:text-white hover:border-blue-500'
            onClick={handleAddPoint}
            title='添加节点'
          >
            +
          </button>
        )}
        {gradient.points.length > 2 && (
          <button
            className='w-4 h-4 flex items-center justify-center rounded-full border border-dashed border-gray-300 text-blue-500 text-[10px] hover:bg-blue-500 hover:text-white hover:border-blue-500'
            onClick={handleDeletePoint}
            title='删除节点'
          >
            −
          </button>
        )}
      </div>

      {/* 预览 + 角度滑动条 + 指示器 */}
      <div className='flex items-center gap-2 mb-1'>
        <div
          className='flex-1 h-6 rounded border'
          style={{ background: gradientCSS() }}
        />
        <input
          title='角度'
          type='range'
          min={0}
          max={360}
          value={gradient.degress}
          onChange={e => updateAngle(parseInt(e.target.value, 10))}
          className='flex-1 h-1 accent-blue-500'
        />
        <div className='w-10 h-6 flex items-center justify-center border rounded'>
          <div
            className='w-4 h-px bg-blue-500'
            style={{ transform: `rotate(${gradient.degress}deg)` }}
          />
        </div>
      </div>

      {/* 角度输入 & 预设 */}
      <div className='flex items-center justify-between mb-1'>
        <span className='text-[12px]'>角度</span>
        <input
          title='角度'
          className='w-12 h-5 text-center border rounded text-[12px]'
          value={angleInput}
          onChange={e => setAngleInput(e.target.value)}
          onBlur={() =>
            updateAngle(parseInt(angleInput, 10) || gradient.degress)
          }
          onKeyDown={e => {
            if (e.key === 'Enter')
              updateAngle(parseInt(angleInput, 10) || gradient.degress);
          }}
        />
      </div>
      <div className='flex flex-wrap gap-1 mb-2'>
        {PRESET_ANGLES.map(a => (
          <button
            key={a}
            className={cls(
              'px-1 py-0.5 text-[11px] border rounded',
              gradient.degress === a
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 hover:border-blue-500 hover:text-blue-500'
            )}
            onClick={() => updateAngle(a)}
          >
            {a}°
          </button>
        ))}
      </div>

      {/* 颜色选择器 */}
      <ChromePicker
        color={selectedColor}
        onChange={handleColorChange}
        disableAlpha
      />
    </div>
  );
}
