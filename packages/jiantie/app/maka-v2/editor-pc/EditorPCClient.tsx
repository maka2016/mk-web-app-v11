'use client';

import { API, getToken, getUid } from '@/services';
import { useStore } from '@/store';
import { useEffect } from 'react';

interface ShellConfig {
  target: Window;
  onReady?: any;
}

function create(options: ShellConfig) {
  // // const handshakeType: HandshakeType = options.type;

  const msgTarget = options.target;

  const messageResolvers = new Map<string, any>();

  const callBackResolvers = new Map<string, any>();
  /** 初始化 */
  const _init = function () {
    window.addEventListener(
      'message',
      event => {
        event.data && _parse(event.data);
      },
      false
    );
  };
  /** 发送函数 */
  const _call = function (method: string, param: any, callback?: any) {
    const sendData: any = {
      protocol: '',
      method,
      param: param || {},
    };
    // 存在回调函数
    if (callback) {
      // 保存回调函数
      callBackResolvers.set(method, callback);
      // 指定回调的key
      sendData.callback = method;
    }
    // 向指定iframe 发送消息
    msgTarget.postMessage(JSON.stringify(sendData), '*');
  };

  /** 函数call的回调处理 */
  const _callback = function (method: string, param: any) {
    const sendData = {
      protocol: '',
      callback_fnc: method,
      param: param || {},
    };
    msgTarget.postMessage(JSON.stringify(sendData), '*');
  };

  /** 解析消息 */
  const _parse = function (data: any) {
    let parseData: any = null;
    if (!data) {
      return;
    }
    try {
      parseData = JSON.parse(data);
    } catch (e) {
      console.warn(e);
      return;
    }
    if (!parseData) {
      return;
    }

    // 如果是call的回到函数
    if (
      parseData.callback_fnc &&
      callBackResolvers.get(parseData.callback_fnc)
    ) {
      callBackResolvers.get(parseData.callback_fnc)(parseData.param);
    } else if (parseData.method && messageResolvers.get(parseData.method)) {
      // 如果存在回调函数
      if (parseData.callback) {
        const callback_method = parseData.callback;
        messageResolvers.get(parseData.method)(
          parseData.param,
          (params: any) => {
            _callback(callback_method, params);
          }
        );
      } else {
        messageResolvers.get(parseData.method)(parseData.param);
      }
    }
  };

  /** 发送函数 */
  const _on = function (method: string, callback?: any) {
    messageResolvers.set(method, callback);
  };

  _init();
  return { msgTarget, call: _call, on: _on };
}

function EditorPCClient({ worksId, uid }: { worksId: string; uid: string }) {
  const store = useStore();

  useEffect(() => {
    const initBridge = () => {
      const s: any = create({
        target: (document.getElementById('editor7frame') as any).contentWindow,
      });
      (window as any).$bridge = s;
      s.on('login', (data: any, callback: any) => {
        const returnData = {
          uid: getUid(),
          token: getToken(),
          isvip: store.isVip ? 1 : 0,
          pageid: worksId,
        };
        if (callback) {
          callback(returnData);
        }
      });
      s.on('uptovip', (data: any, callback: any) => {
        (window as any).__editor7_callback = callback;
        // 升级VIP
        let vipType = data.vip_page_type;
        if (data.vip_page_type.includes('super')) {
          vipType = 'super';
        } else if (data.vip_page_type.includes('busi')) {
          vipType = 'busi';
        }
        store.setVipShow(true, {
          works_type: vipType,
          works_id: worksId,
        });
      });
    };
    initBridge();
  }, [store, worksId]);

  const iframeurl = `${API('根域名')}/heditor7/index.html?page_id=${worksId}&uid=${uid}`;

  return (
    <div className='w-full h-full'>
      <iframe
        id='editor7frame'
        src={iframeurl}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          border: 'none',
          top: 0,
          left: 0,
        }}
      ></iframe>
    </div>
  );
}

export default EditorPCClient;
