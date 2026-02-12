import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
dotenv.config();

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const GROUP_ID = process.env.LARK_TICKET_GROUP_ID;

async function getTenantAccessToken() {
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  return res.data.tenant_access_token;
}

async function testSendCard() {
  if (!GROUP_ID) {
    console.error('❌ 请先在 .env 中配置 LARK_TICKET_GROUP_ID');
    return;
  }
  
  try {
    const token = await getTenantAccessToken();
    console.log('✅ 获取 Token 成功');

    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            template: "blue",
            title: { content: `🆕 测试工单: #TEST-001`, tag: "plain_text" }
        },
        elements: [
            {
                fields: [
                    { is_short: true, text: { content: `**测试用户:** TEST_USER`, tag: "lark_md" } },
                    { is_short: true, text: { content: `**当前状态:** ⏳ 等待接单`, tag: "lark_md" } }
                ],
                tag: "div"
            },
            { tag: "hr" },
            { content: `**问题描述:**\n这是一条测试消息，用于验证话题群卡片创建是否正常。`, tag: "markdown" }
        ]
    };

    console.log(`📡 正在向群组 (${GROUP_ID}) 发送卡片...`);
    const res = await axios.post(
        `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`,
        {
          receive_id: GROUP_ID,
          msg_type: 'interactive',
          content: JSON.stringify(cardContent),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (res.data.code === 0) {
        console.log('✅ 发送成功！');
        console.log('Message ID:', res.data.data.message_id);
        console.log('请去飞书群查看是否出现新的话题卡片。');
    } else {
        console.error('❌ 发送失败:', JSON.stringify(res.data, null, 2));
    }

  } catch (error: any) {
    console.error('❌ 请求异常:', error.message);
    if (error.response) {
        console.error('详细信息:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSendCard();
