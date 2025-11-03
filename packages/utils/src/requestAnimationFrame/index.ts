type RequestAnimationFrame = Window['requestAnimationFrame'] | undefined | null;

export const getRequestAnimationFrame = () => {
  const Window = window as any;
  const requestAnimationFrame =
    Window.requestAnimationFrame ||
    Window.webkitRequestAnimationFrame ||
    Window.mozRequestAnimationFrame;
  // const requestAnimationFrame: Window['requestAnimationFrame'] | null = get<Window, any>(window, paths, null)
  return requestAnimationFrame?.bind(window);
};

export const requestAnimationFrameAction = (callback: () => void) => {
  const r = getRequestAnimationFrame();
  if (r) {
    r(callback);
  } else {
    callback();
  }
};

export default class RequestAnimationFrameControl {
  actionStatus: Record<string, boolean>;

  action: Record<string, (() => void) | null>;

  r: RequestAnimationFrame;

  constructor() {
    this.actionStatus = {};
    this.action = {};
    this.r = getRequestAnimationFrame();
  }

  static new() {
    const r = new this();
    r.run();
    return r;
  }

  run = () => {
    if (this.r) {
      this.r(() => {
        for (const key of Object.keys(this.actionStatus)) {
          const val = this.actionStatus[key];
          const fun = this.action[key];
          if (val && fun) {
            fun();
          }
        }
        this.run();
      });
    }
  };

  add = (key: string, callback: () => void) => {
    this.actionStatus[key] = true;
    this.action[key] = callback;
  };

  remove = (key: string) => {
    this.actionStatus[key] = false;
    this.action[key] = null;
  };
}

export const requestAnimationFrame = RequestAnimationFrameControl.new();
