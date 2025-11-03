export interface CanvaInfo {
  /** 缩放比例 */
  scaleRate: number;
  /** 缩放比例 区分wap和web web传入一定是1 */
  scaleZommRate: number;
  /** 画布的宽 */
  canvaW: number;
  /** 画布的高 */
  canvaH: number;
  /** 给组件做iOS缩放的比例 */
  iosScale?: number;
}

export interface ContainerInfo {
  /** 宽度，单位 px */
  width: number;
  /** 高度，单位 px */
  height: number;
  /** 旋转信息，单位 deg */
  rotate: number;
  /** x axis */
  x: number;
  /** y axis */
  y: number;
  /** box-shadow */
  boxShadow?: string;
  /** 透明度 */
  opacity?: number;
  action?: {
    enable: boolean;
    type: string;
    label?: string;
    actionAttrs: Record<string, any>;
  };
}

export type HasWatermark = () => boolean;
