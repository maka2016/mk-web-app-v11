import { DebounceClass } from '@/utils';
import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import EyeDropperPickerButton from './EyeDropper';

const debounce = new DebounceClass();

const ColorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  .chrome-picker {
    width: 100% !important;
    box-shadow: none !important;
    border: 1px solid #e5e5e5 !important;
    border-radius: 4px !important;
  }
`;

interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// Helper function to parse color string to ColorResult
const parseColorToColorResult = (color: string): ColorResult => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color;
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;

    return {
      hex,
      rgb: { r, g, b, a },
      hsl: { h: 0, s: 0, l: 100, a: 1 }, // Will be calculated by ChromePicker
    };
  }

  // Handle rgba colors
  if (color.startsWith('rgba')) {
    const match = color.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      const a = match[4] ? parseFloat(match[4]) : 1;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

      return {
        hex,
        rgb: { r, g, b, a },
        hsl: { h: 0, s: 0, l: 100, a: 1 }, // Will be calculated by ChromePicker
      };
    }
  }

  // Default fallback
  return {
    hex: color,
    rgb: { r: 255, g: 255, b: 255, a: 1 },
    hsl: { h: 0, s: 0, l: 100, a: 1 },
  };
};

export default function CustomColorPanel2({
  disableAlpha = false,
  color = '#fff',
  onChange,
}: {
  disableAlpha?: boolean;
  color?: string;
  onChange: (color: { hex: string; rgb: RGBColor }) => void;
}) {
  const [selectedColor, setSelectedColor] = useState<ColorResult>(() =>
    parseColorToColorResult(color)
  );

  useEffect(() => {
    setSelectedColor(parseColorToColorResult(color));
  }, [color]);

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color);
  };

  return (
    <ColorContainer>
      <EyeDropperPickerButton
        onChange={color => {
          const submitData = {
            hex: color.hex,
            rgb: color.rgb,
            hsl: { h: 0, s: 0, l: 100, a: 1 },
          };
          handleColorChange(submitData);
          onChange(submitData);
        }}
      />
      <ChromePicker
        color={selectedColor.rgb}
        onChange={handleColorChange}
        onChangeComplete={color => {
          debounce.exec(() => {
            onChange(color);
          }, 200);
        }}
        disableAlpha={disableAlpha}
      />
    </ColorContainer>
  );
}
