import {
  IRect,
  Point,
  Position,
  TransformCompCoordinateSystemInfo,
  TransformInfo,
} from './types';

/**
 * 获得元素的中心点 直角坐标系
 *
 * @param {{ x: number; y: number; width: number; height: number }} info
 * @return {*}
 */
export const getCenter = (info: {
  x: number;
  y: number;
  width?: number;
  height?: number;
}) => {
  const x = info.x + (info.width || 0) / 2;
  const y = info.y + (info.height || 0) / 2;
  return [x, y];
};

/**
 * 获得元素的中心点 直角坐标系
 *
 * @param {{ x: number; y: number; width: number; height: number }} info
 * @return {*}
 */
export const getCenterObj = (info: {
  x: number;
  y: number;
  width?: number;
  height?: number;
}) => {
  const x = info.x + (info.width || 0) / 2;
  const y = info.y + (info.height || 0) / 2;
  return { x, y };
};

/**
 * 获得元素中心，利用四点坐标
 *
 * @param {IRect} rect
 * @returns
 */
export const getCenterByRect = (rect: IRect) => {
  const x = (rect.leftTop.x + rect.rightBottm.x) / 2;
  const y = (rect.leftTop.y + rect.rightBottm.y) / 2;
  return { x, y };
};

/**
 * 弧度和角度的互换函数 传入rad时转换出角度 传入rotate时转换出弧度
 *
 * @param {{ rad?: number; rotate?: number }} info
 * @return {*}
 */
export const transformRad = (info: { rad?: number; rotate?: number }) => {
  if (info.rad != null) {
    // 从弧度返回角度
    return (info.rad * 180) / Math.PI;
  }
  if (info.rotate != null) {
    return (info.rotate * Math.PI) / 180;
  }
  return 0;
};

/**
 * 变换坐标系
 *
 * @param {Position} position 原坐标值点的信息
 * @param {TransformInfo} [transformInfo] 坐标轴变换的信息
 * @returns
 */
export const transformCoordinateSystem = (
  position: Point,
  transformInfo?: TransformInfo
) => {
  const { x, y } = position;
  if (transformInfo && Object.values(transformInfo).some(e => !!e)) {
    const { dx, dy, rotate = 0 } = transformInfo;
    const x0 = dx || 0;
    const y0 = dy || 0;
    const rad = transformRad({ rotate });
    const result = {
      x: (x - x0) * Math.cos(rad) + (y - y0) * Math.sin(rad),
      y: -(x - x0) * Math.sin(rad) + (y - y0) * Math.cos(rad),
    };
    return result;
  }
  return { x, y };
};

/**
 * 获得元素绕某个点旋转后的坐标
 *
 * @param {Point} point
 * @param {Point} center
 * @param {number} rotate
 * @return {*}
 */
export const getRotatedPoint = (
  point: Point,
  center: Point,
  rotate: number
) => {
  const rad = transformRad({ rotate });
  const x =
    (point.x - center.x) * Math.cos(rad) -
    (point.y - center.y) * Math.sin(rad) +
    center.x;
  const y =
    (point.x - center.x) * Math.sin(rad) +
    (point.y - center.y) * Math.cos(rad) +
    center.y;
  return { x, y };
};

/**
 * 获得元素四个顶点的坐标 根据 positionLink
 *
 * @param {Position} position
 * @return {*}
 */
export const getRectPoint = (position: Position) => {
  const { rotate = 0, width = 0, height = 0, x = 0, y = 0 } = position;
  const center = getCenter(position);
  // 计算未旋转前的坐标
  const rect1: IRect = {
    leftTop: { x, y },
    rightTop: { x: x + width, y },
    leftBottom: { x, y: y + height },
    rightBottm: { x: x + width, y: y + height },
  };
  const result = Object.keys(rect1).reduce((pre, key) => {
    const point = rect1[key as keyof IRect];
    const newPoint = getRotatedPoint(
      point as Point,
      { x: center[0], y: center[1] },
      rotate
    );
    pre[key as keyof IRect] = newPoint;
    return pre;
  }, {} as any) as IRect;
  result.center = {
    x: (result.leftTop.x + result.rightBottm.x) / 2,
    y: (result.leftTop.y + result.rightBottm.y) / 2,
  };
  return result;
};

/**
 * 点在旋转坐标系后的x y，利用点到直线的距离公式
 *
 * @param {number} rotate
 * @param {Point} point
 */
export const transformOriginPoint = (rotate: number, point: Point) => {
  if (rotate === 0) {
    return point;
  }
  const rad = transformRad({ rotate: -rotate });
  const k = Math.tan(rad);
  const k2 = Math.tan(Math.PI - rad);
  const x = (k * point.x - point.y) / Math.sqrt(k ** 2 + 1);
  const y = (k2 * point.x - point.y) / Math.sqrt(k2 ** 2 + 1);
  return { x, y };
};

/**
 * 获得若干个矩形的边界
 *
 * @param {IRect[]} rects
 * @returns
 */
export const getRectBorder = (rects: IRect[]) => {
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (i === 0) {
      minX = Math.min(
        rect.leftTop.x,
        rect.rightTop.x,
        rect.leftBottom.x,
        rect.rightBottm.x
      );
      minY = Math.min(
        rect.leftTop.y,
        rect.rightTop.y,
        rect.leftBottom.y,
        rect.rightBottm.y
      );
      maxX = Math.max(
        rect.leftTop.x,
        rect.rightTop.x,
        rect.leftBottom.x,
        rect.rightBottm.x
      );
      maxY = Math.max(
        rect.leftTop.y,
        rect.rightTop.y,
        rect.leftBottom.y,
        rect.rightBottm.y
      );
    } else {
      minX = Math.min(
        minX,
        rect.leftTop.x,
        rect.rightTop.x,
        rect.leftBottom.x,
        rect.rightBottm.x
      );
      minY = Math.min(
        minY,
        rect.leftTop.y,
        rect.rightTop.y,
        rect.leftBottom.y,
        rect.rightBottm.y
      );
      maxX = Math.max(
        maxX,
        rect.leftTop.x,
        rect.rightTop.x,
        rect.leftBottom.x,
        rect.rightBottm.x
      );
      maxY = Math.max(
        maxY,
        rect.leftTop.y,
        rect.rightTop.y,
        rect.leftBottom.y,
        rect.rightBottm.y
      );
    }
  }
  return { minX, minY, maxX, maxY };
};

/**
 * 利用极坐标变换中 组件的圆心距离极坐标原点的距离不变，计算出组件旋转后的坐标变化，再换算为直角坐标系
 *
 * @param {string} combinationId 组id
 * @param {string[]} combinationIds
 * @return {*}
 */
export const polarCoordinatesTransfrom = (
  combinationId: string,
  combinationIds: string[],
  positionLink: Record<string, Position>
) => {
  const combinationDict = positionLink[combinationId];
  const combinationRad = transformRad({ rotate: combinationDict.rotate }); // 获得组合组件的旋转角 - 弧度
  const [combinationCenterX, combinationCenterY] = getCenter(combinationDict); // 获得组合组件的相对于父级容器的几何中心 （ 直角坐标系 ），并且以此作为极坐标的原点
  const resutl: Record<string, Position> = {};
  for (const childrenId of combinationIds) {
    const childrenDict = positionLink[childrenId];
    const childrenByCanvaDict = {
      // 获得回组件基于画布直角坐标系的dict
      ...childrenDict,
      x: childrenDict.x + combinationDict.x,
      y: childrenDict.y + combinationDict.y,
    };
    const [childrenCenterX, childrenCenterY] = getCenter(childrenByCanvaDict); // 获得组件在直角坐标系下的几何中心坐标
    const rad = Math.atan2(
      childrenCenterY - combinationCenterY,
      childrenCenterX - combinationCenterX
    ); // 获得组件几何中心在极坐标体系下的偏移角
    const l = Math.sqrt(
      (combinationCenterX - childrenCenterX) ** 2 +
        (combinationCenterY - childrenCenterY) ** 2
    ); // 获得组件在极坐标体系下的 l 参数
    const newRad = rad + combinationRad; // 旋转后的极坐标体系下的旋转角 - 弧度
    const targetX =
      l * Math.cos(newRad) + combinationCenterX - (childrenDict.width || 0) / 2;
    const targetY =
      l * Math.sin(newRad) +
      combinationCenterY -
      (childrenDict.height || 0) / 2;
    resutl[childrenId] = {
      ...childrenDict,
      rotate: (combinationDict.rotate || 0) + (childrenDict.rotate || 0),
      x: targetX,
      y: targetY,
    };
  }
  return resutl;
};

/**
 * 获得元素变换坐标系的一切信息
 *
 * @param {string[]} comps
 * @param {Record<string, Position>} linkDict_
 * @param {number} [rotate=0]
 */
export const getCompTransformCoordinateSystem = (
  comps: string[],
  positionLink: Record<string, Position>,
  rotate = 0
) => {
  const rectTransformCompCoordinateSystemInfoDict: Record<
    string,
    TransformCompCoordinateSystemInfo
  > = {};
  for (const id of comps) {
    const compRect = getRectPoint(positionLink[id]);
    const selfRotate = positionLink[id].rotate || 0;
    // 元素四个顶点变换坐标系
    const newRect = {
      leftTop: transformCoordinateSystem(compRect.leftTop, { rotate }),
      rightTop: transformCoordinateSystem(compRect.rightTop, { rotate }),
      leftBottom: transformCoordinateSystem(compRect.leftBottom, { rotate }),
      rightBottm: transformCoordinateSystem(compRect.rightBottm, { rotate }),
    };
    // 得到四个顶点变换坐标系后的中心点
    const center = getCenterByRect(newRect);
    // 变换坐标系后，将四个顶点绕着自身中心旋转至与坐标轴平行 （摆正）
    const baseRect = {
      leftTop: getRotatedPoint(newRect.leftBottom, center, rotate - selfRotate),
      rightTop: getRotatedPoint(newRect.rightTop, center, rotate - selfRotate),
      leftBottom: getRotatedPoint(
        newRect.leftBottom,
        center,
        rotate - selfRotate
      ),
      rightBottm: getRotatedPoint(
        newRect.rightBottm,
        center,
        rotate - selfRotate
      ),
    };
    const x = Math.min(
      baseRect.leftTop.x,
      baseRect.leftBottom.x,
      baseRect.rightTop.x,
      baseRect.rightBottm.x
    );
    const y = Math.min(
      baseRect.leftTop.y,
      baseRect.leftBottom.y,
      baseRect.rightTop.y,
      baseRect.rightBottm.y
    );
    rectTransformCompCoordinateSystemInfoDict[id] = {
      transformCompCoordinateSystemStandardRect: baseRect,
      inTransformCompCoordinateSystemPoint: { x, y },
      transformCompCoordinateSystemRect: newRect,
      transformCompCoordinateSystemCenter: center,
    };
  }
  // 得到坐标系变换后元素组的边界值
  const { minX, minY, maxX, maxY } = getRectBorder(
    Object.values(rectTransformCompCoordinateSystemInfoDict).map(
      item => item.transformCompCoordinateSystemRect
    )
  );
  // 计算出元素组的几何中心
  const rectsCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  // 计算出组合的坐标，将最小的x y 变换回之前的坐标系
  const combinationInfo = transformCoordinateSystem(
    { x: minX, y: minY },
    { rotate: -rotate }
  );
  // 将元素组的几何中心变换回之前的坐标系
  const baseCenter = transformCoordinateSystem(rectsCenter, {
    rotate: -rotate,
  });
  // 因为此时的组合仍然的
  const baseInfo = getRotatedPoint(combinationInfo, baseCenter, -rotate);
  Object.values(rectTransformCompCoordinateSystemInfoDict).forEach(info => {
    const { x, y } = info.inTransformCompCoordinateSystemPoint;
    const inCombinationPoint = { x: x - minX, y: y - minY };
    info.inCombinationPoint = inCombinationPoint;
  });
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    combinationPosition: { width, height, ...baseInfo },
    baseCenter,
    rectTransformCompCoordinateSystemInfoDict,
  };
};

/**
 * 根据linkDict获得元素中心
 *
 * @param {Position} positionLink
 * @return {*}
 */
export const getCenterByLink = (positionLink: Position) => {
  const { width = 0, height = 0, x, y } = positionLink;
  const center = {
    x: x + width / 2,
    y: y + height / 2,
  };
  return center;
};
