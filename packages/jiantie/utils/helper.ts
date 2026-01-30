export const getFileExtendingName = (filename: string) => {
  // 文件扩展名匹配正则
  const reg = /\.[^.]+$/;
  const matches = reg.exec(filename);
  if (matches) {
    return matches[0].replace('.', '');
  }
  return '';
};
