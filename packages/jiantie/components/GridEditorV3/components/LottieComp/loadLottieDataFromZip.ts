// import JSZip, { JSZipObject } from 'jszip';

// // 定义 Lottie 动画资源类型（简化版）
// interface LottieAsset {
//   id?: string;
//   u?: string;
//   p?: string;
//   e?: number;
// }

// interface LottieAnimationData {
//   v: string;
//   fr: number;
//   ip: number;
//   op: number;
//   w: number;
//   h: number;
//   nm: string;
//   ddd: number;
//   assets?: LottieAsset[];
//   layers: any[];
//   [key: string]: any; // 允许额外字段
// }

// export async function loadLottieDataFromZip(
//   zipUrl: string
// ): Promise<LottieAnimationData> {
//   const response = await fetch(zipUrl);
//   if (!response.ok) {
//     throw new Error(`下载失败: ${response.statusText}`);
//   }

//   const blob = await response.blob();
//   const zip = await JSZip.loadAsync(blob);

//   // 找出 JSON 文件（过滤隐藏文件和 macOS 系统文件）
//   const jsonEntry = Object.entries(zip.files).find(
//     ([name, file]) =>
//       name.endsWith('.json') &&
//       !file.dir &&
//       !name.includes('__MACOSX') &&
//       !name.includes('.DS_Store')
//   );

//   if (!jsonEntry) {
//     throw new Error('未找到有效的 Lottie JSON 文件');
//   }

//   const [jsonFileName, jsonFile] = jsonEntry;
//   const jsonText = await (jsonFile as JSZipObject).async('string');

//   let animationData: LottieAnimationData;
//   try {
//     animationData = JSON.parse(jsonText);
//   } catch (e) {
//     console.error('JSON 解析失败内容预览：', jsonText.slice(0, 100));
//     throw new Error('JSON 文件解析失败');
//   }

//   // 构建 base64 图片映射表
//   const imageMap: Record<string, string> = {};

//   for (const [name, file] of Object.entries(zip.files)) {
//     if (/\.(png|jpg|jpeg|webp)$/i.test(name) && !file.dir) {
//       const shortName = name.split('/').pop()!;
//       const ext = name.split('.').pop()!.toLowerCase();
//       const base64 = await (file as JSZipObject).async('base64');
//       imageMap[shortName] = `data:image/${ext};base64,${base64}`;
//     }
//   }

//   // 替换 assets 中的图片路径为 base64
//   if (animationData.assets) {
//     animationData.assets.forEach(asset => {
//       if (asset.p && imageMap[asset.p]) {
//         asset.u = '';
//         asset.p = imageMap[asset.p];
//       }
//     });
//   }

//   return animationData;
// }
