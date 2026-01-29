/* eslint-disable no-param-reassign */
interface LoadParams {
  id?: string;
  /** Resource's url */
  src: string;
  /** if fail to load then reload time */
  reloadTime?: number;
  /** onload */
  onload?: (loadedEvent: any) => void;
}

interface LoadStuffParams extends LoadParams {
  type: string;
}

const load = (
  element: HTMLLinkElement | HTMLScriptElement,
  params: LoadStuffParams
) => {
  const { onload } = params;
  return new Promise((resolve, reject) => {
    element.onload = (...arg) => {
      onload?.(...arg);
      element.setAttribute('__loaded__', 'true');
      resolve(...arg);
    };
    /** 如果加载失败，尝试继续加载 */
    element.onerror = err => {
      reject(err);
    };
    document.head.appendChild(element);
  });
};

export const loadDataFormApi = async (params: LoadStuffParams) => {
  const { src: url, type, id = '' } = params;
  if (type === 'css') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = id;
    link.href = url;
    return await load(link, params);
  } else if (type === 'script') {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.id = id;
    script.crossOrigin = '';
    return await load(script, params);
  }
};

/**
 * 加载外部资源
 */
export const LoadStuff = async (params: LoadStuffParams) => {
  const { id = '', src } = params;

  const existTag = document.getElementById(`${id || src}`);
  if (existTag && existTag.getAttribute('__loaded__')) {
    return true;
  } else {
    const res = await loadDataFormApi(params).catch(e =>
      console.log('组件文件加载失败', params, e)
    );
    return res;
  }
};

/**
 * 加载 link
 *
 * @param {object} options { src: string, onload: func }
 */
export function LoadLink(options: LoadParams) {
  const _options = Object.assign({}, options, {
    type: 'css',
  });
  return LoadStuff(_options);
}

/**
 * 加载 script
 *
 * @param {object} options { src: string, onload: func }
 */
export function LoadScript(options: LoadParams) {
  const _options = Object.assign({}, options, {
    type: 'script',
  });
  return LoadStuff(_options);
}
