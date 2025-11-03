import { API, request } from '@mk/services';
import { DebounceClass } from '@mk/utils';
import { EventEmitterClass } from './event-emitter';

const internalUrl = 'https://fontservice.oss-cn-beijing-internal.aliyuncs.com';

const debounce = new DebounceClass();

const errorFontList = [
  'https://font.maka.im/20220627/常规/全字库正楷体.ttf',
  null,
  '',
  undefined,
]; // 错误的字体，遗留问题

export const waitFontLoad = (name: string, fontUrl?: string) => {
  return new Promise(resolve => {
    if (
      name === 'default' ||
      name == null ||
      name === '' ||
      errorFontList.includes(fontUrl)
    ) {
      resolve(true);
      return;
    }
    const k = setInterval(() => {
      const values =
        document.fonts.values == null ? [] : document.fonts.values();
      const fonts = Array.from(values).map(v => v.family);
      if (fonts.includes(name)) {
        resolve(true);
        clearInterval(k);
      }
    }, 100);
  });
};

const fontLoadedList: Record<string, boolean> = {};
const fontLoadingState: Record<string, boolean> = {};

interface BatchGetFontCropUrlManagerOptions {
  uid: string;
  pageId: string;
}

interface QueueItem {
  fontFamily: string;
  content: string;
  id: string;
}

class BatchGetFontCropUrlManager extends EventEmitterClass {
  queue: QueueItem[] = [];

  options?: BatchGetFontCropUrlManagerOptions;

  setOptions = (options: BatchGetFontCropUrlManagerOptions) => {
    this.options = options;
  };

  addItem = (item: QueueItem) => {
    if (this.queue.find(i => i.id === item.id)) return;

    this.queue.push(item);
    debounce.exec(this.start, 200);
  };

  private start = async () => {
    if (!this.options) {
      throw new Error('请先设置 options');
    }

    const _queue = JSON.parse(JSON.stringify(this.queue));
    this.queue = [];

    const params = {
      uid: this.options.uid,
      pageId: this.options.pageId,
      cropQueue: _queue,
    };
    const res = await request.post<
      Record<
        string,
        {
          predictUrl: string;
          url?: string;
          fontFamily?: string;
        }
      >
    >(`${API('根域名')}/mk-fe-node/get-font/v2/font`, params);
    // console.log("res", res)

    this.emit('success', res);
  };
}

export const batchGetFontCropUrlManager = new BatchGetFontCropUrlManager();

export const loadFontAction = async ({
  fontFamily,
  fontUrl: fontUrlOrigin,
}: {
  fontFamily: string;
  fontUrl: string;
}) => {
  let fontUrl = fontUrlOrigin;
  if (/MAKAInternal/.test(window.navigator.userAgent)) {
    fontUrl = fontUrl.replace(/https?:\/\/font\.maka\.im/, internalUrl);
  }
  if (fontLoadedList[fontUrl] || fontLoadingState[fontUrl]) return;
  fontLoadingState[fontUrl] = true;
  const fontFace = new FontFace(fontFamily, `url("${fontUrl}")`);
  await fontFace.load();
  fontLoadingState[fontUrl] = false;
  fontLoadedList[fontUrl] = true;
  document.fonts.add(fontFace);
};

// interface LoadFontParams {
//   fontFamily: string
//   fontUrl: string
//   onLoad?: () => void
// }
// interface FontFetchStatusItem {
//   isFetching: boolean
//   loaded: boolean
// }
// const fontLoadListQueue: Record<string, LoadFontParams[]> = {}
// const fontFetchStatus: Record<string, FontFetchStatusItem> = {}
// const execQueueCallback = (fontFamily) => {
//   /** 遍历当前的 */
//   fontLoadListQueue[fontFamily].forEach((item) => {
//     item.onLoad?.()
//   })
//   /** 清空队列 */
//   fontLoadListQueue[fontFamily] = []
// }

/**
 * @deprecated
 */
// export const loadFont = async (params: LoadFontParams) => {
//   const { fontFamily } = params
//   if (!fontLoadListQueue[fontFamily]) {
//     fontLoadListQueue[fontFamily] = []
//   }

//   /** 将字体的 onloaded 回调推入队列中 */
//   fontLoadListQueue[fontFamily].push(params)

//   if (!fontFetchStatus[fontFamily]) {
//     // 如果是第一次加载
//     fontFetchStatus[fontFamily] = {
//       isFetching: true,
//       loaded: false,
//     }
//     loadFontAction(params).then(() => {
//       execQueueCallback(fontFamily)
//     })
//   }

//   if (fontFetchStatus[fontFamily].isFetching) {
//     /** 如果该字体正在加载中，则忽略 */
//   }

//   if (fontFetchStatus[fontFamily].loaded) {
//     /** 如果字体加载完，直接执行回调 */
//     execQueueCallback(fontFamily)
//   }
// }
