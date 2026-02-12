import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import { JTBitTables } from './cms/bit_tables/jiantie';
import { batchCreateAndUpdate, getAllRecord } from './cms/lark';
dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

export const syncTags = async () => {
  const tags = await getAllRecord(JTBitTables['模板标签'], {
    filter: {
      conjunction: 'and',
      conditions: [
        {
          field_name: '同步状态',
          operator: 'isNot',
          value: ['已同步'],
        },
        {
          field_name: '名称',
          operator: 'isNotEmpty',
          value: [],
        },
        {
          field_name: '类型',
          operator: 'isNotEmpty',
          value: [],
        },
      ],
    },
  });
  for (const tag of tags) {
    const tagData = tag.fields;
    console.log('tagData', tagData);

    const newData: any = {
      name: tagData['名称']?.[0]?.text || '',
      type: tagData['类型']?.[0]?.text || '',
    };

    if (newData.name === '' || newData.type === '') {
      console.log('tag name or type is empty', tagData['id']?.[0]?.text);
      continue;
    }

    if (tagData['同步状态']?.[0]?.text === '已同步') {
      console.log('tag already synced', tagData['id']?.[0]?.text);
      continue;
    }

    const upsertRes = await prisma.templateTag.upsert({
      where: {
        id: tagData['id']?.[0]?.text || '',
      },
      update: newData,
      create: newData,
    });

    await batchCreateAndUpdate(
      [],
      [
        {
          record_id: tag.record_id,
          fields: {
            同步状态: '已同步',
            id: `${upsertRes.id}`,
          },
        },
      ],
      JTBitTables['模板标签'],
      100
    );
  }
  // const tagsMap = _.keyBy(tags, 'record_id');
};
