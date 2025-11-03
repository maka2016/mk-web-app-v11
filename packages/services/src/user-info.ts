let $Shell: any | null = null;

export const WebBridge = {
  appready: () => {
    $Shell?.call('appready', {}, (data: any) => {});
  },
  openTuxiaochao: () => {
    $Shell?.call('totucao', {}, (data: any) => {});
  },
  uptovip: (data: any, callback: any) => {
    $Shell?.call('uptovip', data, (data: any) => {
      callback?.();
    });
  },
  getShell: () => $Shell,
};
