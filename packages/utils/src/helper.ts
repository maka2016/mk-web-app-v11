import React from 'react';

export function LoadWidget<T = any>(widgetRef?: string): React.FC<T> | null {
  if (!widgetRef) return null;
  const result =
    ((window as any)?.[widgetRef] as any)?.default ||
    (window as any)?.[widgetRef];
  return result;
}

export const getFileExtendingName = (filename: string) => {
  // 文件扩展名匹配正则
  const reg = /\.[^.]+$/;
  const matches = reg.exec(filename);
  if (matches) {
    return matches[0].replace('.', '');
  }
  return '';
};
