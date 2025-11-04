import * as lark from '@larksuiteoapi/node-sdk';
//获取所有记录

export interface DatasheetItem {
  name: string;
  baseId: string;
  tableId: string;
  viewId: string;
  templateCoverUseGif?: boolean;
}

const config = {
  appId: 'cli_a3070910dc3ad013',
  appSecret: 'YYaWHVUAUJ1mEgpfhPNYabx11M16qOyR',
};

export const getLarkClient = async () => {
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
  limit?: number
) => {
  if (!datasheetItem) {
    console.log('wrong getAllRecord', datasheetItem);
  }

  const cacheKey = `${datasheetItem.tableId}-${limit}`;
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
  larkClient: any,
  app_token: string,
  table_id: string,
  recordId: string,
  filedsData: any
) => {
  // const datasheet = await listTablesView(datasheetItem);
  // const larkClient = await getLarkClient();
  let wRes = await larkClient.bitable.v1.appTableRecord.update({
    path: {
      app_token: app_token,
      table_id: table_id,
      record_id: recordId,
    },
    data: {
      fields: filedsData,
    },
  });
};

export const updateRecordByIdV1 = async (
  larkClient: any,
  table: DatasheetItem,
  recordId: string,
  filedsData: any
) => {
  const datasheet = await listTablesView(table);
  let wRes = await larkClient.bitable.v1.appTableRecord.update({
    path: {
      app_token: datasheet.nodeData.obj_token || '',
      table_id: table.tableId,
      record_id: recordId,
    },
    data: {
      fields: filedsData,
    },
  });

  return wRes;
};
