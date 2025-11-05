'use client';

interface StatusBarProps {
  /**
   * 背景色，默认为白色
   */
  bgColor?: string;
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * StatusBar 组件 - 用于处理移动端安全区域顶部
 * 高度为 calc(var(--safe-area-inset-top))
 */
export default function StatusBar({
  bgColor = '#ffffff',
  className = '',
}: StatusBarProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{
        height: 'calc(var(--safe-area-inset-top))',
        backgroundColor: bgColor,
      }}
    />
  );
}
