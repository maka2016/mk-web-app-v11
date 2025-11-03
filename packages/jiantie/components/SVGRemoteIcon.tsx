import React, { useEffect, useState } from 'react';

interface SVGRemoteIconProps {
  url: string;
  width?: number | string;
  height?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const cleanSvgFill = (svg: string, color?: string) => {
  let cleaned = svg;

  // 移除所有 fill="..."
  cleaned = cleaned.replace(/fill=".*?"/gi, '');

  // 移除 style 中的 fill
  cleaned = cleaned.replace(/style=".*?fill:[^;"]+;?[^"]*"/gi, match => {
    const withoutFill = match.replace(/fill:[^;"]+;?/gi, '');
    return withoutFill === `style=""` ? '' : withoutFill;
  });

  // 用 color 包装外层 <svg> 加一个 fill 属性
  if (color) {
    cleaned = cleaned.replace(/<svg\b([^>]*)>/i, `<svg $1 fill="${color}">`);
  }

  return cleaned;
};

const SVGRemoteIcon: React.FC<SVGRemoteIconProps> = ({
  url,
  width = 24,
  height = 24,
  color,
  className,
  style,
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSvg = async () => {
      try {
        const response = await fetch(url);
        const text = await response.text();

        if (isMounted) {
          const cleaned = cleanSvgFill(text, color);
          setSvgContent(cleaned);
          setError(false);
        }
      } catch (e) {
        console.error('Error loading SVG:', e);
        if (isMounted) setError(true);
      }
    };

    fetchSvg();
    return () => {
      isMounted = false;
    };
  }, [url, color]);

  if (error) {
    return <span style={{ color: 'red' }}>⚠️ Failed to load SVG</span>;
  }

  return (
    <div
      className={className}
      style={{
        width,
        height,
        display: 'inline-block',
        lineHeight: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export default SVGRemoteIcon;
