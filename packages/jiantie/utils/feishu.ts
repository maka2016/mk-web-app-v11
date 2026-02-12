import axios from 'axios';

const FEISHU_WEBHOOK_URL_MAP = {
  图片下载: 'https://open.feishu.cn/open-apis/bot/v2/hook/539c0cf1-48da-423f-94bb-e3d99d4b688c',
};

export async function sendFeishuMessage(type: '图片下载', title: string, msg: string) {
  const contentBlocks: any[] = [
    {
      tag: 'text',
      text: `${msg}`,
    },
  ];

  const payload = {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: `${title}`,
          content: [contentBlocks],
        },
      },
    },
  };

  try {
    const res = await axios.post(FEISHU_WEBHOOK_URL_MAP[type], payload);
    console.log('飞书消息发送成功:', res.data);
  } catch (err) {
    console.error('飞书消息发送失败:', err);
  }
}

// --- New Lark API Client ---

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a903094110b8dbef';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'jnx6h2G9iPPNiWQABYSqlbiWScIgbxvN';

// Debug Log
// console.log('Feishu Config Loaded:', {
//   APP_ID: APP_ID ? `${APP_ID.slice(0, 5)}...` : 'MISSING',
//   APP_SECRET: APP_SECRET ? 'SET' : 'MISSING',
// });

let tenantAccessToken = '';
let tokenExpireAt = 0;

async function getTenantAccessToken() {
  const now = Date.now() / 1000;
  if (tenantAccessToken && now < tokenExpireAt) {
    return tenantAccessToken;
  }

  try {
    console.log('Fetching Feishu Tenant Access Token...');
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    if (res.data.code === 0) {
      console.log('Feishu Token fetched successfully');
      tenantAccessToken = res.data.tenant_access_token;
      tokenExpireAt = now + res.data.expire - 60; // buffer 60s
      return tenantAccessToken;
    }
    console.error('Feishu Token Error:', res.data);
    throw new Error(`Failed to get tenant_access_token: ${res.data.msg}`);
  } catch (error) {
    console.error('getTenantAccessToken error', error);
    throw error;
  }
}

export async function createMessage(receiveId: string, msgType: string, content: any, receiveIdType = 'chat_id') {
  console.log(`Sending Feishu Message to ${receiveId} (type: ${receiveIdType})...`);
  try {
    const token = await getTenantAccessToken();
    const res = await axios.post(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        receive_id: receiveId,
        msg_type: msgType,
        content: JSON.stringify(content),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('Feishu Create Message Response:', JSON.stringify(res.data));
    return res.data;
  } catch (e: any) {
    console.error('Feishu Create Message Failed:', e.message);
    if (e.response) {
      console.error('Feishu Error Details:', JSON.stringify(e.response.data));
    }
    return { code: -1, msg: e.message, error: e };
  }
}

export async function patchMessage(messageId: string, content: any) {
  const token = await getTenantAccessToken();
  const res = await axios.patch(
    `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}`,
    {
      content: JSON.stringify(content),
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

export async function replyMessage(messageId: string, msgType: string, content: any) {
  const token = await getTenantAccessToken();
  const res = await axios.post(
    `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`,
    {
      msg_type: msgType,
      content: JSON.stringify(content),
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

export async function getChats() {
  const token = await getTenantAccessToken();
  const res = await axios.get('https://open.feishu.cn/open-apis/im/v1/chats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
