export type IObject<T = any> = Record<string, T>;

export interface Point {
  x: number;
  y: number;
}

export interface IRect {
  leftTop: Point;
  rightTop: Point;
  leftBottom: Point;
  rightBottm: Point;
  center?: Point;
}

export interface Position extends Point {
  width?: number;
  height?: number;
  rotate?: number;
}

export interface TransformInfo {
  dx?: number;
  dy?: number;
  rotate?: number;
}

export interface TransformCompCoordinateSystemInfo {
  transformCompCoordinateSystemStandardRect: IRect;
  /** 在变换后的坐标系中的坐标 */
  inTransformCompCoordinateSystemPoint: Point;
  /** 元素在组合里的坐标 */
  inCombinationPoint?: Point;
  /** 在画布上的坐标，此时在视觉上已经被组合套住了 */
  inCombinationPointView?: Point;
  transformCompCoordinateSystemRect: IRect;
  transformCompCoordinateSystemCenter: Point;
}
