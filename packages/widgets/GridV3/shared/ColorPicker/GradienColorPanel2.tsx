import React, { useEffect, useState } from 'react';
import cls from 'classnames';
import { ChromePicker, ColorResult } from 'react-color';
import { DebounceClass } from '@mk/utils';

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
    const colorStops = match[2].split(',').map(s => s.trim());

    const points: GradientPoint[] = colorStops.map(stop => {
      const [color, pos] = stop.split(' ');
      const position = parseInt(pos, 10) || 0;
      const hex = color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { position, rgb: { r, g, b, a: 1 } };
    });

    return { degress, points };
  } catch {
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
