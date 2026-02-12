export const imageCompIdPref = '__imggroup_container_layer_';
export const imgEditingIdPref = 'for_imggroup_editing_';
export const EDITOR_CANVA_SCOPE = 'id-canvas';

export const wrapImgCompId = (widgetID: string) =>
  `${imageCompIdPref}${widgetID}`;

/**
 * 获取画布上的元素
 */
export const getImageCompDOMAtCanvas = (widgetID: string) => {
  return document.querySelector<HTMLDivElement>(
    `#${EDITOR_CANVA_SCOPE} #${wrapImgCompId(widgetID)}`
  );
};

export const getImgEditAreaId = (id: string) => {
  return `${imgEditingIdPref}${id}`;
};

export const getImgRootContainer = (id: string) => {
  return document.querySelector(`#${EDITOR_CANVA_SCOPE} #${wrapImgCompId(id)}`);
};

export const getImgRootEditingContainer = (id: string) => {
  return document.querySelector(
    `#${EDITOR_CANVA_SCOPE} #${getImgEditAreaId(id)}`
  );
};
