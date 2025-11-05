export * from './register';

export const getAppName = (appid: string) => {
  switch (appid) {
    case 'gov':
      return '「宣宝」';
    case 'perschool':
      return '「幼伴」';
    case 'jiantie':
    case 'makaai':
      return '「简帖」';

    default:
      return '「MAKA（码卡）」';
  }
};
