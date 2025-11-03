import APPBridge from '@mk/app-bridge';

export const canUseRnChoosePic = async () => {
  const features = await APPBridge.featureDetect(['RNCHOOSEPIC']);
  return features.RNCHOOSEPIC;
};

export const showRnChoosePic = async (onSelectItem: (url?: string) => void) => {
  APPBridge.appCall(
    {
      type: 'RNCHOOSEPIC' as any,
      params: {},
      jsCbFnName: 'RNCHOOSEPIC',
    },
    async cbParams => {
      const convertBase64ToBlob = (base64: string): Promise<Blob> => {
        return new Promise(resolve => {
          fetch(base64).then(res => {
            resolve(res.blob());
          });
        });
      };

      console.log('cbParams', cbParams);
      if (!cbParams.success) {
        onSelectItem();
      }
      // console.log("cbParams", cbParams);
      // console.log("cbParams 64", cbParams?.data?.images?.[0]?.base64);
      const asset = cbParams?.data?.images?.[0];
      const base64Data = asset.base64; // 👈 纯 Base64，没有头
      const mimeType = asset.type; // 比如 "image/jpeg"
      const base64 = `data:${mimeType};base64,${base64Data}`;
      const blob = await convertBase64ToBlob(base64);
      console.log('blob url', URL.createObjectURL(blob));
      onSelectItem(URL.createObjectURL(blob));
      // console.log("cbParams", cbParams?.data?.images?.[0]?.base64);
    },
    60 * 1000 * 60
  );
};
