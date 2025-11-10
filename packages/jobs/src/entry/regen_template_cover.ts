import dotenv from 'dotenv';
import {
  JTBitTables,
  TemplateChannelItem,
} from '../service/cms/bit_tables/jiantie';
import { getAllRecord } from '../service/cms/lark';
import { prisma } from '@workspace/database';
dotenv.config({ path: '.env.local' });

const dealOneTemplate = async (data: TemplateChannelItem) => {
  const templateId = data.fields.任务模板ID?.[0]?.text;
  const workId = data.fields.作品id?.value?.[0]?.text;

  console.log(templateId, workId);

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

  console.log('templateSpec', templateSpec);
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
            value: ['已生成'],
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

  for (let i in tempalteRawOnbit) {
    const item = tempalteRawOnbit[i];
    await dealOneTemplate(item);
  }
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
