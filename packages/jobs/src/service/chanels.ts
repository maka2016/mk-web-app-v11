import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import _ from 'lodash';
import {
  BitChannelItem,
  BitTempalteFilterItem,
  JTBitTables,
  TemplateChannelItem,
} from './cms/bit_tables/jiantie';
import {
  DatasheetItem,
  batchCreateAndUpdate,
  getAllRecord,
  updateRecordById,
} from './cms/lark';
import { downloadAndUploadLarkImage } from './cms/upload-helper';

dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

export const syncChannel = async (
  sonBitTable: DatasheetItem,
  ChClassName: string,

  parentBit?: DatasheetItem,
  env = 'production',
  option?: {
    needThumb?: boolean;
    needParent?: boolean;
    needFilter?: boolean;
    needTemplate?: boolean;
    // templateBit?: DatasheetItem;
  }
) => {
  const sonCh1RawOnbit: BitChannelItem[] = await getAllRecord(sonBitTable);

  const parentCh1RawOnbit: BitChannelItem[] = parentBit
    ? await getAllRecord(parentBit, {
        noCache: true,
      })
    : [];

  const parentMap = _.keyBy(parentCh1RawOnbit, 'record_id');
  // const ch2OnbitMap = keyBy(ch2Onbit, "record_id");

  let filterMap: Record<string, BitTempalteFilterItem> = {};

  if (option?.needFilter) {
    const filtersOnBit: BitTempalteFilterItem[] = await getAllRecord(
      JTBitTables['模板筛选器']
    );
    filterMap = _.keyBy(filtersOnBit, 'record_id');
  }

  let templateMap: Record<string, TemplateChannelItem> = {};
  if (option?.needTemplate) {
    const templatesOnBit: TemplateChannelItem[] = await getAllRecord(
      JTBitTables['模版生产']
    );
    templateMap = _.keyBy(templatesOnBit, 'record_id');
    console.log('一共模板：', templateMap.length);
  }

  // 用于回写封面 URL 的数组
  const coverUpdateArr: any[] = [];
  for (const item of sonCh1RawOnbit) {
    if (option?.needThumb) {
      if (!item?.fields['封面'] || item?.fields['封面']?.length < 1) {
        // 需要上传封面
        await updateRecordById(sonBitTable, item.record_id, {
          状态: '需要封面图',
        });
        continue;
      }
    }

    if (option?.needParent) {
      console.log('needParent check', !item?.fields['父级']);
      if (!item?.fields['父级']?.link_record_ids?.[0]) {
        // 需要上传封面
        await updateRecordById(sonBitTable, item.record_id, {
          状态: '需要指定父级',
        });
        continue;
      }
    }

    if (!!item.fields['封面'] && !item.fields['封面url']) {
      // 需要上传封面
      try {
        const coverFiles = item.fields['封面'];
        if (coverFiles && coverFiles.length > 0) {
          // 取第一个封面图片
          const firstCover = coverFiles[0];

          // 下载并上传到 OSS
          const ossPath = await downloadAndUploadLarkImage(
            firstCover,
            'jiantie'
          );
          item.fields['封面url'] = [{ text: ossPath, type: 'text' }];
          // 添加到回写数组
          coverUpdateArr.push({
            record_id: item.record_id,
            fields: {
              封面url: ossPath,
            },
          });
        }
      } catch (error) {
        console.error(`处理记录 ${item.record_id} 的封面失败:`, error);
        // 继续处理下一条记录
      }
    }
  }

  // 批量回写封面 URL 到飞书
  if (coverUpdateArr.length > 0) {
    await batchCreateAndUpdate([], coverUpdateArr, sonBitTable, 100);
    console.log('封面 URL 回写完成');
  }

  const inserData = sonCh1RawOnbit
    .filter(item => {
      let pass = true;
      console.log('item', item.fields.id?.[0]?.text);
      if (option?.needThumb) {
        pass = pass && !!item.fields['封面url'];
        console.log('needThumb check ', pass);
      }
      if (option?.needParent) {
        // return item.fields['父级'];
        pass = pass && !!item?.fields['父级']?.link_record_ids?.[0];
        console.log('needParent check ', pass);
      }

      return (
        pass &&
        !!item.fields['alias'] &&
        !!item.fields['显示名'] &&
        !!item.fields['语言']
      );
    })
    .map(item => {
      console.log('item', item);

      // 提取内部唯一名称（bitTextRef 类型）
      const alias = item.fields['alias']?.value?.[0]?.text || '';

      console.log('alias', alias);
      // const alias = aliasField?.[0]?.text || '';
      // 提取显示名（bitTextRaw[] 类型）
      const displayNameField = item.fields['显示名'];
      const displayName = displayNameField?.[0]?.text || '';

      console.log('排序权重:::', item.fields['排序权重']);

      const sortWeight = 100 - (item.fields['排序权重'] || 0);

      // 提取语言（string 类型）
      const language = item.fields['语言'] || 'zh-CN';

      console.log(`处理栏目: ${alias} - ${displayName}`);

      const parent = item.fields['父级']?.link_record_ids?.[0];
      console.log('parent', parent);
      const parentData = parent ? parentMap[parent] : null;
      console.log('parentData', parentData);
      const parentId = parentData?.fields['id']?.[0]?.text || null;

      const thumbPath = item.fields['封面url']?.[0]?.text || null;
      console.log('thumbPath', thumbPath);

      //子级-筛选器

      const newData: any = {
        online: !(item.fields['上线'] === '下线'),
        alias, // 使用内部唯一名称作为 alias
        desc: item.fields['内部名称']?.[0]?.text || '',
        display_name: displayName, // 显示名
        thumb_path: item.fields['封面url']?.[0]?.text || null,
        class: ChClassName, // 一级栏目
        locale: language, // 语言类型
        appid: item.fields['appid']?.value?.[0]?.text || null,
        sort_weight: sortWeight,
        // template_ids: templateIds,
        env: env,
      };

      if (option?.needFilter) {
        const filterAliasID = item.fields['模板筛选器']?.link_record_ids?.[0];
        const filterAlias = filterAliasID
          ? filterMap[filterAliasID]?.fields?.['alias']?.value?.[0]?.text ||
            null
          : null;
        if (filterAlias) {
          newData.templateFilterEntityAlias = filterAlias;
        }
      }

      if (option?.needTemplate) {
        const templateIds = item.fields['包含模版']?.link_record_ids || [];
        console.log('包含模版数量：', templateIds.length);
        const templateData = templateIds.map(id => templateMap[id]);
        newData.template_ids = templateData.map(
          item => item.fields['任务模板ID']?.[0]?.text || ''
        );
        console.log('写入包含模版ID：', newData.template_ids.length);
      }

      if (parentId) {
        newData.parent_id = Number(parentId);
      }
      return {
        record_id: item.record_id,
        data: newData,
      };
    });

  //feishuArr用于回写
  const feishuArr: any[] = [];

  // 批量 upsert 数据
  for (const data of inserData) {
    const upsertRes = await prisma.templateMarketChannelEntity.upsert({
      where: {
        alias: data.data.alias,
      },
      update: {
        display_name: data.data.display_name,
        locale: data.data.locale,
        class: data.data.class,
        thumb_path: data.data.thumb_path,
        parent_id: data.data.parent_id,
        update_time: new Date(),
        templateFilterEntityAlias: data.data.templateFilterEntityAlias,
        sort_weight: data.data.sort_weight ?? 0,
        template_ids: data.data.template_ids,
        env: env,
        online: data.data.online,
        appid: data.data.appid,
        desc: data.data.desc,
      },
      create: data.data,
    });
    // console.log('upsertRes', upsertRes);
    if (upsertRes.id) {
      feishuArr.push({
        record_id: data.record_id,
        fields: {
          状态: '已同步',
          id: `${upsertRes.id}`,
        },
      });
    }
  }

  await batchCreateAndUpdate([], feishuArr, sonBitTable, 100);
  console.log(`已同步 ${inserData.length} 条${ChClassName}数据`);
};
