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
