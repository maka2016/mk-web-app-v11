/**
 *  type:
 *      openEditor  打开编辑器，创建新模板
 *      message 弹窗消息
 *      login 唤起客户端登录窗口
 *      handShake 某方法加载完毕
 *      openUrl 通知客户端唤起本地浏览器打开指定链接
 *      login_error 第三方（微博）登录失败
 *      login_success 登陆成功
 *      vipBuy 会员购买信息
 */

// web与客户端通信全局方法
class ClientMessage {
  constructor() {
    this.TOCLIENT(
      { type: 'handShake', data: { TOCLIENT: this.TOCLIENT } },
      'windows'
    );
    this.TOCLIENT(
      { type: 'handShake', data: { GETCLIENTDATA: this.TOCLIENT } },
      'windows'
    );
  }

  async TOCLIENT(obj: any, device = 'all') {
    if (!ClientMessage.isWindows()) return;
    if (!obj.type) return console.error('communication type error!');
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    const { type } = obj;
    try {
      // mac
      if (
        (window as any).webkit &&
        navigator.userAgent.includes('Mac') &&
        (device === 'all' || device === 'mac')
      ) {
        (window as any).webkit.messageHandlers.JSObjec.postMessage(
          JSON.stringify(obj)
        );
        // windows 谷歌内核
      } else if (
        navigator.vendor.includes('Google') &&
        !navigator.userAgent.includes('Mac') &&
        (device === 'all' || device === 'windows')
      ) {
        // eslint-disable-next-line no-undef
        await (window as any).CefSharp.BindObjectAsync('windows');
        // eslint-disable-next-line no-undef
        (window as any).windows.postMessage(JSON.stringify(obj));
      } else {
        console.error(`client identification error in ${type}!`);
      }
    } catch (error) {
      console.warn(`communication failure in ${type}!`);
    }
  }

  static isWindows() {
    return !!(window && (window as any).CefSharp);
  }
}

export default ClientMessage;
