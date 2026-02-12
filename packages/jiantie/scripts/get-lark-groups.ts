import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file in the project root
// Assuming this script is run from project root or packages/jiantie
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Try local .env too if above fails or for override
dotenv.config();

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

if (!APP_ID || !APP_SECRET) {
  console.error('❌ 错误: 未找到 FEISHU_APP_ID 或 FEISHU_APP_SECRET 环境变量。');
  console.error('请确保在 packages/jiantie/.env 或项目根目录 .env 文件中配置了这些变量。');
  process.exit(1);
}

console.log(`✅ 检测到应用凭证: AppID=${APP_ID}`);

async function getTenantAccessToken() {
  try {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    if (res.data.code === 0) {
      return res.data.tenant_access_token;
    }
    throw new Error(`获取 Token 失败: ${JSON.stringify(res.data)}`);
  } catch (error: any) {
    console.error('❌ 获取 Tenant Access Token 失败:', error.message);
    if (error.response) {
      console.error('详细错误信息:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

async function getChats() {
  try {
    const token = await getTenantAccessToken();
    console.log('✅ 成功获取 Access Token，正在拉取群组列表...');

    const res = await axios.get(
      'https://open.feishu.cn/open-apis/im/v1/chats?page_size=20', // Get first 20 groups
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.data.code === 0) {
      const items = res.data.data.items || [];
      if (items.length === 0) {
        console.log('⚠️  未找到任何群组。请确认：\n1. 机器人已经被拉入群组。\n2. 机器人已开通 im:chat 权限。');
        return;
      }

      console.log('\n📋 机器人所在的群组列表：');
      console.log('================================================');
      items.forEach((item: any) => {
        console.log(`群名称: ${item.name}`);
        console.log(`群 ID (chat_id): ${item.chat_id}`);
        console.log(`描述: ${item.description || '无'}`);
        console.log('------------------------------------------------');
      });
      console.log('\n💡 请复制上面的 "群 ID" (例如 oc_xxx) 填入 .env 文件的 LARK_TICKET_GROUP_ID 字段。');
    } else {
      console.error('❌ 获取群组列表失败:', res.data.msg);
    }
  } catch (error: any) {
    console.error('❌ 请求 API 失败:', error.message);
    if (error.response) {
      console.error('详细错误信息:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getChats();
