type TencentUserId = {
  wechat_openid?: string;
  wechat_unionid?: string;
  wechat_app_id: string;
};

type TencentActionParam = Record<string, any>;

export type TencentAction = {
  outer_action_id?: string;
  action_time: number;
  user_id: TencentUserId;
  action_type: string;
  action_param?: TencentActionParam;
};

export type ReportTencentAdOptions = {
  /**
   * 从点击转发出去的 __CALLBACK__ 字段中 URLDecode 后得到的完整 URL（包括 path 和 query）
   * 例如: https://api.e.qq.com/v3.0/user_actions/add?cb=xxx&conv_id=10001
   */
  callbackUrl: string;
  /**
   * DataNexus - 数据源中拿到的静态 access-token
   */
  accessToken: string;
  /**
   * 要上报的一条或多条行为
   */
  actions: TencentAction[];
  /**
   * 可选，自定义时间戳（秒），不传则使用当前时间
   */
  timestampSec?: number;
  /**
   * 可选，自定义 nonce，不超过 32 个字符；不传则自动生成
   */
  nonce?: string;
};

function generateNonce(length = 16): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

/**
 * 上报腾讯广告转化行为
 */
export async function reportTencentAdAction(options: ReportTencentAdOptions) {
  const {
    callbackUrl,
    accessToken,
    actions,
    timestampSec = Math.floor(Date.now() / 1000),
    nonce = generateNonce(),
  } = options;

  const resp = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 注意：这里必须是中划线
      'access-token': accessToken,
      timestamp: String(timestampSec),
      nonce,
      'cache-control': 'no-cache',
    },
    body: JSON.stringify({
      actions,
    }),
  });

  const data = await resp.json().catch(() => null);

  return {
    ok: resp.ok,
    status: resp.status,
    data,
  };
}
