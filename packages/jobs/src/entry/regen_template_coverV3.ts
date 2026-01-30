// import { getAllBlock } from '@/components/GridV3/shared';

import { getTemplateDataFromOSS } from '@mk/jiantie/server';
import axios from 'axios';
import dotenv from 'dotenv';
// import { getCanvaInfo2 } from '../../../jiantie/components/GridEditorV3//provider/utils';
import { getAllBlock } from '../../../jiantie/components/GridEditorV3/utils';
import {
  JTBitTables,
  TemplateChannelItem,
} from '../service/cms/bit_tables/jiantie';
import { batchCreateAndUpdate, getAllRecord } from '../service/cms/lark';
dotenv.config({ path: '.env.local' });

import { initPrisma } from '@mk/jiantie/v11-database';
dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

let count1 = 0;
let count2 = 0;

const maxRatio = 1.5;

const flagName = '已生成';

let bitUpdateArr: any[] = [];

const dealOneTemplate = async (data: TemplateChannelItem) => {
  const templateId = data.fields.任务模板ID?.[0]?.text;

  console.log(templateId);

  let shotWidth = 0;
  let shotHeight = 0;
  //根据模板id查询prima规格
  if (!templateId) {
    console.warn('未获取到模板ID，跳过');
    return;
  }

  const detail = await prisma.templateEntity.findUnique({
    where: { id: templateId },
  });
  if (!detail) {
    console.warn('未找到模板', templateId);
    return;
  }

  // 获取 spec 信息
  let specInfo = null;
  if (detail?.spec_id) {
    try {
      specInfo = await prisma.worksSpecEntity.findUnique({
        where: { id: detail.spec_id },
      });
    } catch (error) {
      console.error('Failed to get spec info:', error);
    }
  }
  if (!specInfo) {
    console.warn('未找到模板规格', templateId);
    return;
  }

  const currentWorksDetail = {
    ...detail,
    specInfo,
  };

  console.log('shotWidth', shotWidth);
  console.log('shotHeight', shotHeight);
  console.log('end');

  let ratio = shotHeight / shotWidth;
  // if (ratio > (16 / 9) * maxRatio) {
  //   ratio = (16 / 9) * maxRatio;
  // }

  // let ratio = (16 / 9) * maxRatio;

  console.log('specInfo.ratio::', ratio);
  if (specInfo.name === '海报集') {
    //电视背景图，特殊处理
    const width = 540; //9
    const height = (540 * 16) / 9;
    ratio = 16 / 9;
    const coverUrl = detail.cover;
    await prisma.templateEntity.update({
      where: {
        id: templateId,
      },
      data: {
        coverV3: {
          url: coverUrl,
          width: 540,
          height: (540 * ratio).toFixed(0),
        },
      },
    });

    batchCreateAndUpdate(
      [],
      [
        {
          record_id: data.record_id,
          fields: {
            封面V3生成状态: flagName,
          },
        },
      ],
      JTBitTables['模版生产'],
      1
    );
  } else if (specInfo.name === '长页H5') {
    count1++;

    const currentWorksData = await getTemplateDataFromOSS(templateId);

    // const canvaInfo2 = getCanvaInfo2(
    //   currentWorksDetail as any,
    //   currentWorksData
    // );
    // const { canvaW } = canvaInfo2;
    const canvaW = 375;
    // console.log('canvaInfo2', canvaInfo2);

    // // console.log('currentWorksData', currentWorksData);
    const bData = getAllBlock(currentWorksData);

    console.log('bData', bData);
    if (!bData) {
    } else {
      //叠加canvasHeight
      let totalHeight = 0;
      for (let block of bData) {
        totalHeight += block.canvasHeight || 0;
      }

      if (totalHeight > 0) {
        shotHeight = totalHeight;
        shotWidth = canvaW;
      }
    }

    console.log('shotWidth', shotWidth);
    console.log('shotHeight', shotHeight);

    if (shotWidth > 0 && shotHeight > 0) {
      ratio = shotHeight / shotWidth;
      if (ratio > maxRatio) {
        ratio = maxRatio * (16 / 9);
      }
    } else {
      ratio = 16 / 9;
    }

    const width = 540; //9
    const height = 540 * ratio;

    const templateUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;

    console.log('templateUrl', templateUrl);

    const designer_uid = detail.designer_uid;

    const apiUrl =
      'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync';

    const apiUrlFinal = `${apiUrl}?url=${encodeURIComponent(
      templateUrl
    )}&width=${width}&height=${height}&works_id=${templateId}&uid=${designer_uid}&mode=template&watermark=0&setpts=0.5&pageCount=1&st=v3`;
    console.log('apiUrlFinal', apiUrlFinal);
    const coverRes = await axios.get(apiUrlFinal, {
      timeout: 60000,
    });

    const coverUrl = coverRes.data.fullUrls[0];

    console.log('coverUrl', coverUrl);

    await prisma.templateEntity.update({
      where: {
        id: templateId,
      },
      data: {
        coverV3: {
          url: coverUrl,
          width: 540,
          height: (540 * ratio).toFixed(0),
        },
      },
    });

    batchCreateAndUpdate(
      [],
      [
        {
          record_id: data.record_id,
          fields: {
            封面V3生成状态: flagName,
          },
        },
      ],
      JTBitTables['模版生产'],
      1
    );
  } else {
    console.log('非长页H5。直接更新', specInfo);

    let coverType = '静态';
    if (
      specInfo.export_format === 'video' ||
      specInfo.export_format === 'html'
    ) {
      coverType = '动态';
    }
    // console.log('非长页H5。直接更新', templateId, detail.cover);
    console.log('ratio', ratio, 540, (540 * ratio).toFixed(0));

    ratio = 16 / 9;
    const designer_uid = detail.designer_uid;
    const templateUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;

    const width = 540; //9
    const height = (540 * ratio).toFixed(0);

    const apiUrl =
      coverType === '动态'
        ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
        : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';

    const apiUrlFinal = `${apiUrl}?url=${encodeURIComponent(
      templateUrl
    )}&width=${width}&height=${height}&works_id=${templateId}&uid=${designer_uid}&mode=template&watermark=0&setpts=0.5&pageCount=1&st=v3`;
    console.log('apiUrlFinal', apiUrlFinal);
    const coverRes = await axios.get(apiUrlFinal, {
      timeout: 60000,
    });

    const coverUrl =
      coverType === '动态'
        ? coverRes.data.fullUrls[0]
        : coverRes.data?.data?.fullUrls?.[0];
    console.log('coverUrl', coverUrl);

    //直接讲模版的cover复制给coverV2
    await prisma.templateEntity.update({
      where: {
        id: templateId,
      },
      data: {
        coverV3: {
          url: coverUrl,
          width: 540,
          height: (540 * ratio).toFixed(0),
        },
      },
    });

    batchCreateAndUpdate(
      [],
      [
        {
          record_id: data.record_id,
          fields: {
            封面V3生成状态: flagName,
          },
        },
      ],
      JTBitTables['模版生产'],
      1
    );

    // count2++;
    // console.log('templateSpec', templateSpec);
  }
};

export const runRegenTemplateCoverV3 = async () => {
  const tempalteRawOnbit: TemplateChannelItem[] = await getAllRecord(
    JTBitTables['模版生产'],
    {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '状态',
            operator: 'is',
            value: ['已上架'],
          },
          {
            field_name: '封面V3生成状态',
            operator: 'isNot',
            value: [flagName],
          },
          {
            field_name: '四级-标签',
            operator: 'isNotEmpty',
            value: [],
          },
          // {
          //   field_name: '规格类型',
          //   operator: 'isNot',
          //   value: ['长页H5'],
          // },

          // {
          //   field_name: '任务模板ID',
          //   operator: 'is',
          //   value: ['T_AC3CP7K7XJGZ'],
          // },
        ],
      },
    }
  );

  console.log('tempalteRawOnbit', tempalteRawOnbit.length);

  for (let i in tempalteRawOnbit) {
    const item = tempalteRawOnbit[i];
    await dealOneTemplate(item);
    console.log('dealOneTemplate', i, ':', tempalteRawOnbit.length);
  }

  //多维表格更新
  await batchCreateAndUpdate([], bitUpdateArr, JTBitTables['模版生产'], 100);

  console.log('count1', count1);
  console.log('count2', count2);
};

if (require.main === module) {
  try {
    (async function run() {
      await runRegenTemplateCoverV3();
      // await buildExcercise();
      // await syncTagFromBit2cms();
      process.exit(0);
    })();
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(0);
  }
}
