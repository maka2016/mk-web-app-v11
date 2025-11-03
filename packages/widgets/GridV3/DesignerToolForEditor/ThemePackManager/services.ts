import { getAppId, getPageId, getUid } from '@mk/services';
import axios from 'axios';
import qs from 'qs';
import toast from 'react-hot-toast';
import {
  MaterialItem,
  requestCMSForDesigner,
} from '../MaterialResourceManager/services';

// 分页参数接口
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export type { MaterialItem };

// export interface MaterialItem {
//   id?: number;
//   name?: string;
//   author: string;
//   desc: string;
//   material_tags?: {
//     name: string;
//     documentId: string;
//   }[];
//   theme_pack_v2?: {
//     name: string;
//     documentId: string;
//   }[];
//   content: any;
//   cover_url: string;
//   cover: {
//     url: string;
//   };
//   documentId: string;
//   createdAt: string;
//   updatedAt: string;
// }

export interface MaterialFloor {
  id: number;
  name: string;
  desc: string;
  documentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThemePack {
  id: string;
  documentId: string;
  name: string;
  desc: string;
  author: string;
  content: any;
  template_app?: {
    // set: string[];
    appid: string;
  };
}

export interface ThemePackForUser {
  id: string;
  documentId: string;
  name: string;
  desc: string;
  author: string;
  content: any;
  template_app?: {
    // set: string[];
    appid: string;
  };
  material_items: {
    content: any;
    documentId: string;
    cover_url: string;
    name: string;
    material_tags: {
      documentId: string;
      name: string;
    }[];
  }[];
}

interface UpdateThemePack extends Omit<ThemePack, 'template_app'> {
  template_app?: {
    set: string[];
  };
}

export interface TemplateApp {
  id: string;
  documentId: string;
  name: string;
  desc: string;
  appid: string;
}

export interface TemplateChannel {
  id: string;
  documentId: string;
  name: string;
  desc: string;
  appid: string;
}

interface CreateThemePack {
  name: string;
  content: any;
  author: string;

  template_app?: {
    set: string[];
  };
}

export const saveThemePack = async (themePack: Partial<UpdateThemePack>) => {
  const res = await requestCMSForDesigner.put(
    `/theme-pack-v2s/${themePack.documentId}`,
    {
      data: {
        name: themePack.name,
        content: themePack.content,
        author: themePack.author,
        desc: themePack.desc,
        ...(themePack.template_app
          ? {
              template_app: themePack.template_app,
            }
          : {}),
      },
    }
  );
  return res.data;
};

export const createThemePack = async (themePack: CreateThemePack) => {
  const res = await requestCMSForDesigner.post('/theme-pack-v2s', {
    data: themePack,
  });
  return res.data;
};

interface CreateThemePackLayout {
  name: string;
  content: any;
  author: string;
  cover_url: string;
  theme_pack_v2: {
    connect: string[];
  };
  material_tags: {
    connect: string[];
  };
}

export const createThemePackLayout = async (
  themePackLayout: CreateThemePackLayout
) => {
  const res = await requestCMSForDesigner.post('/material-items', {
    data: themePackLayout,
  });
  return res.data;
};

// 素材列表
export const getThemePackMaterialItems = async (
  themePackId: string,
  floorId: string,
  pagination?: PaginationParams
) => {
  const query = qs.stringify(
    {
      populate: {
        material_tags: {
          fields: ['documentId'],
        },
        cover: {
          populate: '*',
        },
      },

      filters: {
        theme_pack_v2: {
          documentId: {
            $eq: themePackId,
          },
        },
        ...(floorId ? { material_tags: { documentId: { $eq: floorId } } } : {}),
      },
      pagination: {
        pageSize: pagination?.pageSize || 100,
        page: pagination?.page || 1,
      },
      sort: ['createdAt:desc'],
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get(`/material-items?${query}`);
  return res.data as PaginatedResponse<MaterialItem>;
};

export interface MaterialChannel {
  id: string;
  documentId: string;
  name: string;
  display_name: string;
  desc: string;
  material_tags: MaterialFloor[];
}

// 素材列表
export const getMaterialChannels = async (templateAppId: string) => {
  const query = qs.stringify(
    {
      populate: {
        material_tags: {
          fields: ['documentId', 'name', 'desc'],
        },
      },

      filters: {
        template_apps: {
          appid: {
            $eq: templateAppId,
          },
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get(`/material-classes?${query}`);
  return res.data.data as MaterialChannel[];
};

export const updateMaterialItem = async (documentId: string, data: any) => {
  const res = await requestCMSForDesigner.put(`/material-items/${documentId}`, {
    data,
  });
  return res.data;
};

export const getThemePackFloorData = async (templateAppId?: string) => {
  if (!templateAppId) {
    console.log('templateAppId is undefined');
    return [];
  }
  const query = qs.stringify(
    {
      populate: 'material_tags',
      filters: {
        template_apps: {
          appid: {
            $eq: templateAppId,
          },
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const promptGroupRes =
    (await requestCMSForDesigner.get(`/material-classes?${query}`)).data.data[0]
      ?.material_tags || [];
  return promptGroupRes as MaterialFloor[];
};

// 删除素材
export const removeThemePackLayout = async (documentId: string) => {
  const res = await requestCMSForDesigner.delete(
    `/material-items/${documentId}`
  );
  return res.data;
};

export const getThemePackList = async (
  templateAppId?: string | null,
  pagin?: {
    page: number;
    pageSize: number;
  }
) => {
  const query = qs.stringify(
    {
      fields: ['documentId', 'name', 'desc', 'author', 'content'],
      populate: {
        template_app: {
          fields: ['appid'],
        },
      },
      filters: {
        ...(templateAppId
          ? {
              template_app: {
                appid: {
                  $eq: templateAppId,
                },
              },
            }
          : {}),
      },
      pagination: {
        pageSize: pagin?.pageSize || 500,
        page: pagin?.page || 1,
      },
      sort: ['createdAt:desc'],
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get<PaginatedResponse<ThemePack>>(
    `/theme-pack-v2s?${query}`
  );
  return res;
};

export const getThemePack = async (documentId: string) => {
  const query = qs.stringify(
    {
      fields: ['documentId', 'name', 'desc', 'author', 'content'],
      populate: {
        template_app: {
          fields: ['appid'],
        },
      },
      filters: {
        documentId: {
          $eq: documentId,
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get<PaginatedResponse<ThemePack>>(
    `/theme-pack-v2s?${query}`
  );
  return res.data.data[0];
};

export const getThemePackItemsByTemplateId = async (templateId: string) => {
  const query = qs.stringify(
    {
      populate: {
        material_items: {
          populate: {
            material_tags: {
              fields: ['documentId', 'name'],
            },
          },
          fields: ['content', 'documentId', 'cover_url', 'name'],
        },
      },
      fields: ['documentId'],
      filters: {
        ref_templates: {
          template_id: {
            $in: templateId,
          },
        },
      },
      pagination: {
        pageSize: 10,
        page: 1,
      },
      sort: ['createdAt:desc'],
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get<{ data: ThemePackForUser[] }>(
    `/theme-pack-v2s?${query}`
  );
  return res.data.data?.[0];
};

export const getTemplateApps = async () => {
  const query = qs.stringify(
    {
      fields: ['documentId', 'name', 'desc', 'appid'],
      pagination: {
        pageSize: 500,
        page: 1,
      },
      sort: ['createdAt:desc'],
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get<{ data: TemplateApp[] }>(
    `/template-apps?${query}`
  );
  return res.data;
};

export const genRowCover = async (params: {
  blockId?: string;
  rowId?: string;
  width: number;
  height: number;
}) => {
  const { blockId, rowId, width, height } = params;
  const uid = getUid();
  const worksId = getPageId();
  const queryStr = qs.stringify({
    appid: getAppId(),
    ...(blockId && { screenshot_block: `${blockId}` }),
    ...(rowId && { screenshot_row: `${rowId}` }),
    __watermark__: false,
    screenshot: true,
  });
  const targetUrl = `https://www.jiantieapp.com/viewer2/${worksId}?${queryStr}`;
  console.log('targetUrl', targetUrl);
  // const screenshotServerUrl = `http://localhost:5544/screenshot/v2/export?format=png&works_id=${worksId}&uid=${uid}&url=${encodeURIComponent(
  const screenshotServerUrl = `https://www.maka.im/mk-gif-generator/screenshot/v2/export?format=png&works_id=${worksId}&uid=${uid}&url=${encodeURIComponent(
    targetUrl
  )}&width=${width}&height=${height}&pageCount=1&mode=template&surfix=${Date.now()}`;
  const screenshotRes = await axios.get(screenshotServerUrl);
  const tempUrl = screenshotRes.data.data?.fullUrls?.[0];
  return tempUrl as string;
};

export const getBlockCover = async (blockId: string) => {
  if (!blockId) {
    toast.error('没有blockId');
    return;
  }
  const dom = document.querySelector(
    `#designer_canvas_container #editor_block_${blockId}`
  );
  if (!dom) {
    toast.error('找不到blockId对应的DOM');
    return;
  }
  const domRect = dom.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(dom);
  const marginTop = parseFloat(computedStyle.marginTop) || 0;
  const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
  const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
  const marginRight = parseFloat(computedStyle.marginRight) || 0;

  const adjustedRect = {
    width: domRect.width + marginLeft + marginRight,
    height: domRect.height + marginTop + marginBottom,
  };
  const { width, height } = adjustedRect;
  const tempUrl = await genRowCover({ width, height, blockId });
  return tempUrl;
};
