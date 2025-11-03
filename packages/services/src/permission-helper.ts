import { queryToObj } from '@mk/utils';

export interface PermissionData {
  isDesignerRole: boolean;
  isLoadMaterialList: boolean;
  designerSubmitWorks: boolean;
  layerRename: boolean;
  importPsd: boolean;
  maxPageQtyH5: number;
  maxPageQtyPoster: number;
  posterWorkDownload: boolean;
  h5WenzhangH5WorkSharing: boolean;
  tiantianhuodongSharing: boolean;
  removeWatermarks: boolean;
  removeProductIdentifiers: boolean;
  removeAds: boolean;
  tiantianhuodongRemoveAds: boolean;
  materialProduct: boolean;
  customBrandIdentity: boolean;
  posterDownloadPerDay: number;
  useDownload: boolean;
  useTemplate: boolean;
  useUpToVip: boolean;
  useMaterialComment: boolean;
  isTmplLink: boolean;
  isThemeGenerator: boolean;
  modifyTemplate: boolean;
  env: string;
  developerMode: boolean;
  designerUid: string;
  worksId: string;
  noSave: boolean;
  mode: string;
  version: string;
  token: string;
  logMode: boolean;
  uid: string;
  specConnectMode: boolean;
  cmsUid: string;
  cmsToken: string;
  isAuxiliaryLine: boolean;
}

const defaultPermission = {
  isDesignerRole: false,
  isLoadMaterialList: false,
  designerSubmitWorks: false,
  layerRename: false,
  importPsd: true,
  maxPageQtyH5: 20,
  maxPageQtyPoster: 5,
  /** 平面可是否下载 */
  posterWorkDownload: false,
  /** 翻页h5是否可分享 */
  h5WenzhangH5WorkSharing: false,
  /** 营销活动是否可分享 */
  tiantianhuodongSharing: false,
  /** 去除水印 */
  removeWatermarks: false,
  /** 去除产品标识 */
  removeProductIdentifiers: false,
  /** 翻页h5去除广告 */
  removeAds: false,
  /** 长页h5去除广告 */
  tiantianhuodongRemoveAds: false,
  /** 是否能生产素材 */
  materialProduct: false,
  /** 是否能自定义品牌 */
  customBrandIdentity: false,
  /** 每日下载海报次数 */
  posterDownloadPerDay: 3,
};

/**
 * 统一授权编辑器功能的 api
 */
export const getPermissionData = (): PermissionData => {
  const configFromUrl = queryToObj();
  // const designerOff = configFromUrl.designer === 'false'
  const env = configFromUrl.env || process.env.ENV;
  const {
    page_id = '',
    works_id,
    mode = '',
    version = '',
    token,
    uid,
    event_uid,
    cmsUid,
    cmsToken,
    app_mode,
    designerUid,
  } = configFromUrl;
  const noSave = 'no_save' in configFromUrl;
  const developerMode = 'developer' in configFromUrl;
  const designerTool = 'designer_tool' in configFromUrl;
  const disableDesignerRole = configFromUrl.designer === 'false';
  const specConnectMode = 'spec_connect_mode' in configFromUrl;
  const modifyTemplate = 'modify_template' in configFromUrl;
  const isAuxiliaryLine = 'is_auxiliary_line' in configFromUrl;
  const checkCommentMode = 'check_comment_mode' in configFromUrl;
  const isDesignerWorkSpace =
    'designer' in configFromUrl && !disableDesignerRole;
  const isThemeGenerator =
    'themegen' in configFromUrl ||
    (isDesignerWorkSpace && app_mode === 'flex_editor');
  const logMode = 'log' in configFromUrl;
  if (disableDesignerRole) {
    defaultPermission.isDesignerRole = false;
  }

  return {
    ...defaultPermission,
    materialProduct: defaultPermission.materialProduct || designerTool,
    useDownload: !isDesignerWorkSpace,
    useTemplate: defaultPermission.materialProduct || !isDesignerWorkSpace,
    useUpToVip: !defaultPermission.isDesignerRole,
    useMaterialComment:
      defaultPermission.materialProduct ||
      defaultPermission.isDesignerRole ||
      checkCommentMode,
    isTmplLink: !(
      defaultPermission.tiantianhuodongSharing ||
      defaultPermission.h5WenzhangH5WorkSharing
    ),
    isThemeGenerator,
    modifyTemplate,
    env,
    developerMode,
    designerUid,
    worksId: page_id || works_id,
    noSave,
    mode,
    version,
    token,
    logMode,
    uid: uid || event_uid,
    specConnectMode,
    cmsUid,
    cmsToken,
    isAuxiliaryLine,
  };
};
