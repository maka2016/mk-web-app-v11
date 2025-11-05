import { queryToObj } from '@mk/utils';

// export interface WorksDetailEntity
//   extends Omit<
//     WorksEntity,
//     'create_time' | 'update_time' | 'custom_time' | 'version'
//   > {
//   specInfo: WorksSpecEntity;
//   create_time: string;
//   update_time: string;
//   custom_time: string;
//   designer_uid?: number;
//   version: string | number;
//   cover: string;
// }
export interface WorksDetailEntity {
  is_rsvp: boolean;
  id: string;
  uid?: number;
  works_id: string;
  title: string;
  /** @deprecated */
  content?: string;
  desc: string;
  /** @deprecated */
  first_img?: string;
  template_id: string;
  preview?: string;
  cover: string;
  version: string;
  offline: boolean;
  spec_id: number;
  /** @deprecated */
  specId?: string;
  /** @deprecated */
  specIdNew?: string;
  /** @deprecated */
  type: string;
  name: string;
  /** @deprecated */
  thumb?: string;
  update_time: string;
  create_time: string;
  /** @deprecated */
  flipPage?: number;
  specInfo: {
    id: string;
    /** 唯一内部名称 */
    name: string;
    /** 显示名称 */
    display_name: string;
    alias: string;
    desc: string;
    /** 编辑器画布宽度 */
    width: number;
    /** viewer 实际渲染宽度 */
    viewport_width: number;
    /** 编辑器画布高度 */
    height: number;
    max_page_count: number;
    is_flip_page: boolean;
    is_flat_page: boolean;
    use_animation: boolean;
    fixed_height: boolean;
    unit: string;
    export_format: string[];
    /**
     * @deprecated
     * 弃用，设计师在编辑器中添加组件
     */
    interactive_features: string[];
  };
  is_title_desc_modified: boolean;
}

export const getPageId = (): string => {
  const queryParams = queryToObj();
  if (queryParams) {
    return (
      queryParams.works_id ||
      queryParams.page_id ||
      queryParams.id ||
      getWorksDetailStatic().id
    );
  } else {
    return getWorksDetailStatic().id;
  }
};
export const getWorksId = getPageId;

let worksDetail = {} as WorksDetailEntity;

export const setWorksDetail = (nextVal: Partial<WorksDetailEntity>) => {
  Object.assign(worksDetail, nextVal);
  return worksDetail;
};

export const getWorksDetailStatic = () => {
  if (!worksDetail) {
    throw new Error('请先设置 setWorksDetail');
  }
  return { ...worksDetail };
};

/**
 * 判断是否平铺页面
 * @returns
 */
export const getIsFlatPages = () => {
  return worksDetail.specInfo?.is_flat_page;
};

export const watermarkVersion = () => {
  return '2';
};
