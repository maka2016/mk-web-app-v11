import axios from 'axios';

const FEISHU_WEBHOOK_URL_MAP = {
  图片下载:
    'https://open.feishu.cn/open-apis/bot/v2/hook/539c0cf1-48da-423f-94bb-e3d99d4b688c',
};

export async function sendFeishuMessage(
  type: '图片下载',
  title: string,
  msg: string
) {
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
