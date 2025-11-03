/**
 * 将rgb颜色转换为hex
 * @param r
 * @param g
 * @param b
 */
export const rgba2Hex = (rgbaStr: string) => {
  if (!rgbaStr) {
    return {
      hex: '',
      transparentPercent: 100,
    };
  }

  if (rgbaStr?.indexOf('#') > -1) {
    const aNum = rgbaStr.replace(/#/, '').split('');
    if (aNum.length === 6) {
      return {
        hex: rgbaStr,
        transparentPercent: 100,
      };
    } else if (aNum.length === 3) {
      // 补全6位
      let numHex = '#';
      for (let i = 0; i < aNum.length; i += 1) {
        numHex += aNum[i] + aNum[i];
      }
      return {
        hex: numHex,
        transparentPercent: 100,
      };
    }
  }
  if (rgbaStr === 'transparent') {
    return {
      hex: 'transparent',
      transparentPercent: 100,
    };
  }
  const sep = rgbaStr.indexOf(',') > -1 ? ',' : '';
  if (rgbaStr.indexOf('a') > -1) {
    rgbaStr = rgbaStr.substr(5).split(')')[0].split(sep) as unknown as string;
  } else {
    rgbaStr = rgbaStr.substr(4).split(')')[0].split(sep) as unknown as string;
  }
  let r = (+rgbaStr[0]).toString(16);
  let g = (+rgbaStr[1]).toString(16);
  let b = (+rgbaStr[2]).toString(16);
  let transparentPercent = 100;
  if (rgbaStr.length === 4) {
    transparentPercent = parseFloat(rgbaStr[3]) * 100;
  }
  if (r.length === 1) {
    r = `0${r}`;
  }
  if (g.length === 1) {
    g = `0${g}`;
  }
  if (b.length === 1) {
    b = `0${b}`;
  }
  return {
    hex: `#${r}${g}${b}`,
    transparentPercent,
  };
};

/**
 * 将hex颜色转换为rgba
 * @param hex
 * @param opacity 透明度，取值范围：0-1
 */
export const hex2Rgb = (hex: string, opacity: number = 1) => {
  if (hex.indexOf('rgb') > -1) {
    const val = hex
      .slice(4)
      .replace('(', '')
      .replace(')', '')
      .trim()
      .split(',');
    return {
      value: `rgba(${val[0]},${val[1]},${val[2]},${val[3]})`,
      rgb: {
        r: parseInt(val[0], 10),
        g: parseInt(val[1], 10),
        b: parseInt(val[2], 10),
        a: parseFloat(val[3]),
      },
    };
  }
  return {
    value: `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${opacity})`,
    rgb: {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
      a: opacity ?? 1,
    },
  };
};

export const formatPresetColor = (color: string) => {
  if (color.indexOf('linear') < 0) {
    const rgbObj = hex2Rgb(color);
    return {
      colors: null,
      hex: color,
      rgb: rgbObj.rgb,
      type: 'color',
      value: rgbObj.value,
      elementId: '',
      elementRef: 'background',
      colorType: 'preset',
    };
  } else {
    const val = color.slice(16).replace(')', '').trim().split(',');
    const degress = Number(val[0].replace(/[^0-9]/gi, '') as string);
    const color1 = val[1].trim().split(' ')[0];
    const color2 = val[2].trim().split(' ')[0];
    const rgbObj1 = hex2Rgb(color1);
    const rgbObj2 = hex2Rgb(color2);
    return {
      colors: {
        degress,
        points: [
          {
            position: 0,
            rgb: rgbObj1.rgb,
          },
          {
            position: 100,
            rgb: rgbObj2.rgb,
          },
        ],
      },
      hex: '',
      rgb: rgbObj1.rgb,
      type: 'gradient',
      value: color,
      elementId: '',
      elementRef: 'background',
      colorType: 'preset',
    };
  }
};
