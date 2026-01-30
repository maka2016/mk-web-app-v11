// This file is auto-generated, don't edit it
// 依赖的模块可通过下载工程中的模块依赖文件或右上角的获取 SDK 依赖信息查看
import Sls20201230, _ as $Sls20201230 from '@alicloud/sls20201230';
import OpenApi, _ as $OpenApi from '@alicloud/openapi-client';
import Util, _ as $Util from '@alicloud/tea-util';
import Credential from '@alicloud/credentials';
import _ as $tea from '@alicloud/tea-typescript';

export default class Client {

/\*\*

- @remarks
- 使用凭据初始化账号Client
- @returns Client
-
- @throws Exception
  \*/
  static createClient(): Sls20201230 {
  // 工程代码建议使用更安全的无AK方式，凭据配置方式请参见：https://help.aliyun.com/document_detail/378664.html。
  let credential = new Credential();
  let config = new $OpenApi.Config({
  credential: credential,
  });
  // Endpoint 请参考 https://api.aliyun.com/product/Sls
  config.endpoint = `cn-beijing.log.aliyuncs.com`;
  return new Sls20201230(config);
  }

static async main(args: string[]): Promise<void> {
let client = Client.createClient();
let getLogsV2Headers = new $Sls20201230.GetLogsV2Headers({ });
let getLogsV2Request = new $Sls20201230.GetLogsV2Request({ });
let runtime = new $Util.RuntimeOptions({ });
try {
// 复制代码运行请自行打印 API 的返回值
await client.getLogsV2WithOptions("", "", getLogsV2Request, getLogsV2Headers, runtime);
} catch (error) {
// 此处仅做打印展示，请谨慎对待异常处理，在工程项目中切勿直接忽略异常。
// 错误 message
console.log(error.message);
// 诊断地址
console.log(error.data["Recommend"]);

    }

}

}

Client.main(process.argv.slice(2));
