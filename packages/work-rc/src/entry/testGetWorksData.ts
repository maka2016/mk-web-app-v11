import dotenv from 'dotenv';
import { getWorksDataFromOSS } from '../utils/service';

// 加载环境变量
dotenv.config();

/**
 * 测试从 OSS 获取作品数据
 */
async function main() {
  const uid = 605551267;
  const worksId = 'GMPSFZ29W605551267';
  const version = 5;

  console.log('开始测试获取作品数据...');
  console.log(`参数: uid=${uid}, worksId=${worksId}, version=${version}`);

  try {
    const worksData = await getWorksDataFromOSS(worksId, uid, version);
    console.log('\n✅ 成功获取作品数据:');
    console.log(JSON.stringify(worksData, null, 2));
  } catch (error) {
    console.error('\n❌ 获取作品数据失败:');
    console.error(error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

export { main };
