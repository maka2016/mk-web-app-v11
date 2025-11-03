import { LayerElemItem } from '../types';

export const deepLayers = (
  layers: LayerElemItem[],
  cbk: (layer: LayerElemItem, parentId?: string, idx?: number) => void,
  parentId?: string
) => {
  if (!layers) {
    return;
  }
  for (let idx = 0; idx < layers.length; idx++) {
    const layer = layers[idx];
    cbk(layer, parentId, idx);
    if (layer) {
      const { body } = layer;
      if (body instanceof Array && body.length > 0) {
        deepLayers(body, cbk, layer.elemId);
      }
    } else {
      console.error('deepLayers: layer is undefined');
    }
  }
};
