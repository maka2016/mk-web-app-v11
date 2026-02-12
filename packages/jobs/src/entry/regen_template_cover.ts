import { prisma } from '@mk/jiantie/v11-database';
import axios from 'axios';
import dotenv from 'dotenv';
import {
  JTBitTables,
  TemplateChannelItem,
} from '../service/cms/bit_tables/jiantie';
import { batchCreateAndUpdate, getAllRecord } from '../service/cms/lark';
dotenv.config({ path: '.env.local' });

let count1 = 0;
let count2 = 0;

const flagName = '已生成2';

let bitUpdateArr: any[] = [];

const dealOneTemplate = async (data: TemplateChannelItem) => {
  const templateId = data.fields.任务模板ID?.[0]?.text;

  // console.log(templateId, workId);

  //根据模板id查询prima规格
  if (!templateId) {
    console.warn('未获取到模板ID，跳过');
    return;
  }

  type TemplateSpecRow = {
    template_id: string;
    spec_id: string | null;
    spec_alias: string | null;
    spec_name: string | null;
    spec_width: number | null;
    spec_height: number | null;
    spec_unit: string | null;
  };

  const tempalteData = await prisma.templateEntity.findUnique({
    where: {
      id: templateId,
    },
  });

  if (!tempalteData) {
    console.warn('未找到模板', templateId);
    return;
  }

  const [templateSpec] = await prisma.$queryRaw<TemplateSpecRow[]>`
    SELECT
      t.id AS template_id,
      t.spec_id AS spec_id,
      s.alias AS spec_alias,
      s.name AS spec_name,
      s.width AS spec_width,
      s.height AS spec_height,
      s.unit AS spec_unit
    FROM template_entity AS t
    LEFT JOIN works_spec_entity AS s
      ON t.spec_id = s.id
    WHERE t.id = ${templateId}
    LIMIT 1
  `;

  if (!templateSpec) {
    console.warn(`未找到模板 ${templateId} 的规格信息`);
    return;
  }

  if (templateSpec.spec_name === '长页H5') {
    count1++;

    const width = 540; //9
    const height = (540 * 16) / 9;

    const templateUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;

    console.log('templateUrl', templateUrl);

    const coverType = data.fields['封面类型']?.value?.[0];
    const designer_uid = tempalteData.designer_uid;
    const apiUrl =
      coverType === '动态'
        ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
        : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';

    const apiUrlFinal = `${apiUrl}?url=${encodeURIComponent(
      templateUrl
    )}&width=${width}&height=${height}&works_id=${templateId}&uid=${designer_uid}&mode=template&watermark=0&setpts=0.5&pageCount=1&st=v2`;
    console.log('apiUrlFinal', apiUrlFinal);
    const coverRes = await axios.get(apiUrlFinal, {
      timeout: 60000,
    });

    const coverUrl =
      coverType === '动态'
        ? coverRes.data.fullUrls[0]
        : coverRes.data?.data?.fullUrls?.[0];
    console.log('coverUrl', coverUrl);

    await prisma.templateEntity.update({
      where: {
        id: templateId,
      },
      data: {
        coverV2: coverUrl,
      },
    });

    await batchCreateAndUpdate(
      [],
      [
        {
          record_id: data.record_id,
          fields: {
            封面V2生成状态: flagName,
          },
        },
      ],
      JTBitTables['模版生产'],
      100
    );
  } else {
    // console.log('非长页H5。直接更新', templateId, tempalteData.cover);
    //直接讲模版的cover复制给coverV2
    await prisma.templateEntity.update({
      where: {
        id: templateId,
      },
      data: {
        coverV2: tempalteData.cover,
      },
    });

    bitUpdateArr.push({
      record_id: data.record_id,
      fields: {
        封面V2生成状态: flagName,
      },
    });

    // count2++;
    // console.log('templateSpec', templateSpec);
  }
};

const main = async () => {
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
            field_name: '封面V2生成状态',
            operator: 'isNot',
            value: [flagName],
          },
          {
            field_name: '集合',
            operator: 'isNotEmpty',
            value: [],
          },
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
      await main();
      // await buildExcercise();
      // await syncTagFromBit2cms();
      process.exit(1);
    })();
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}
