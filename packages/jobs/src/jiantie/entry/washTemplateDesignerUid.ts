import {
  BitTemplateItem,
  JTBitTables,
} from '../../service/cms/bit_tables/jiantie';
import { getAllRecord } from '../../service/cms/lark';

import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const washTemplateDesignerUid = async () => {
  const prisma = initPrisma({
    connectionString: `${process.env.DATABASE_URL}`,
  });
  const templatesOnBit: BitTemplateItem[] = await getAllRecord(
    JTBitTables['模版生产'],
    {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '四级-标签',
            operator: 'isNotEmpty',
            value: [],
          },
          // {
          //   field_name: '任务模板ID',
          //   operator: 'is',
          //   value: ['T_PHZ5JXKCUEGA'],
          // },
        ],
      },
    }
  );

  console.log('templatesOnBit', templatesOnBit.length);

  let wrong: any[] = [];
  let count = 0;
  for (const template of templatesOnBit) {
    count++;
    console.log('count', count, '/', templatesOnBit.length);
    const templateData = template.fields;
    const designerUid = templateData['真实作者UID']?.value?.[0] || '';
    const templateId = templateData['任务模板ID']?.[0]?.text || '';
    console.log('template', templateData['真实作者UID']?.value?.[0]);
    if (designerUid) {
      console.log(templateData['任务模板ID']?.[0]?.text, designerUid);

      try {
        await prisma.templateEntity.update({
          where: { id: templateId },
          data: { designer_uid: +designerUid },
        });
      } catch (error) {
        console.error('error', error);
        wrong.push({ designerUid, templateId, error });
      }
    }
  }

  console.log('wrong', wrong);
};
async function main() {
  try {
    await washTemplateDesignerUid();
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { washTemplateDesignerUid };
