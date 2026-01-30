import * as lark from '@larksuiteoapi/node-sdk';
//获取所有记录
import _ from 'lodash';

export interface DatasheetItem {
  name: string;
  baseId: string;
  tableId: string;
  viewId: string;
  templateCoverUseGif?: boolean;
}

export const getLarkClient = async () => {
  const config = {
    appId: process.env.LARK_APP_ID || '',
    appSecret: process.env.LARK_APP_SECRET || '',
  };
  const larkClient = new lark.Client(config);
  return larkClient;
};

export async function listTablesView(datasheetItem: DatasheetItem) {
  const larkClient = await getLarkClient();

  const getNodeRes = await larkClient.wiki.space.getNode({
    params: {
      token: datasheetItem.baseId,
    },
  });

  if (!getNodeRes.data?.node?.obj_token) {
    throw new Error(`无效token: ${datasheetItem.baseId}`);
  }

  return {
    nodeData: getNodeRes.data?.node,
  };
}

const cacheMap = new Map<string, any>();
export const getAllRecord = async (
  datasheetItem: DatasheetItem,
  config?: {
    limit?: number;
    noCache?: boolean;
    filter?: any;
  }
) => {
  const { limit, noCache, filter } = config ?? {};
  if (!datasheetItem) {
    console.log('wrong getAllRecord', datasheetItem);
  }
  const cacheKey = `${datasheetItem.tableId}-${limit}-${JSON.stringify(filter)}`;
  if (noCache) {
    cacheMap.delete(cacheKey);
  }
  if (cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  //初始化client
  const datasheet = await listTablesView(datasheetItem);
  const larkClient = await getLarkClient();

  let page_token = '';
  let dwflag = false;
  let dwArr: any[] = [];
  const dw_page_size = 500;

  //查询所有多维表格信息
  //读取原多维表格信息

  while (!dwflag) {
    const bitResData = await larkClient.bitable.v1.appTableRecord.search({
      path: {
        app_token: datasheet.nodeData.obj_token || '',
        table_id: datasheetItem.tableId,
      },
      params: {
        page_token,
        page_size: dw_page_size,
      },
      data: {
        view_id: datasheetItem.viewId,
        filter: filter ?? undefined,
      },
    });

    if (bitResData.data?.items) {
      dwArr = dwArr.concat(bitResData.data?.items);
      page_token = bitResData.data?.page_token ?? '';
      if (!bitResData.data?.has_more) {
        dwflag = true;
      }
      if (limit && dwArr.length > limit) {
        dwflag = true;
      }
    }

    if ((bitResData as any).error) {
      console.log('error', bitResData);
      dwflag = true;
    }
  }
  cacheMap.set(cacheKey, dwArr);
  return dwArr;
};

export const updateRecordById = async (
  table: DatasheetItem,
  record_id: string,
  filedsData: any
) => {
  const larkClient = await getLarkClient();
  const pmdatasheet = await listTablesView(table);
  // const datasheet = await listTablesView(datasheetItem);
  // const larkClient = await getLarkClient();
  let wRes = await larkClient.bitable.v1.appTableRecord.update({
    path: {
      app_token: pmdatasheet.nodeData.obj_token || '',
      table_id: table.tableId,
      record_id: record_id,
    },
    data: {
      fields: filedsData,
    },
  });
  console.log('wRes', wRes);
};

interface FeishuRecord {
  record_id: string;
  fields: Record<string, any>;
}

export const batchCreateAndUpdate = async (
  insertArr: FeishuRecord[] = [],
  updateArr: FeishuRecord[] = [],
  table: DatasheetItem,
  chunkSize: number = 100
) => {
  if (insertArr.length === 0 && updateArr.length === 0) {
    console.log('没有需要处理的数据');
    return;
  }

  const pmdatasheet = await listTablesView(table);
  const larkClient = await getLarkClient();

  // 处理更新
  if (updateArr.length > 0) {
    const updateChunks = _.chunk(updateArr, chunkSize);
    for (let i = 0; i < updateChunks.length; i++) {
      console.log('更新第', i, '批');
      const chunk = updateChunks[i];
      if (chunk?.length === 0) continue;
      let wRes = await larkClient.bitable.v1.appTableRecord.batchUpdate({
        path: {
          app_token: pmdatasheet.nodeData.obj_token || '',
          table_id: table.tableId,
        },
        data: {
          records: chunk,
        },
      });
      console.log('wRes', wRes?.msg);
    }
  }

  // 处理插入
  if (insertArr.length > 0) {
    const chunks = _.chunk(insertArr, chunkSize);
    for (let i = 0; i < chunks.length; i++) {
      console.log('插入第', i, '批');

      const chunk = chunks[i];
      if (chunk?.length === 0) continue;
      let wRes = await larkClient.bitable.v1.appTableRecord.batchCreate({
        path: {
          app_token: pmdatasheet.nodeData.obj_token || '',
          table_id: table.tableId,
        },
        data: {
          records: chunk,
        },
      });
      console.log('wRes', wRes?.msg);
    }
  }
};
