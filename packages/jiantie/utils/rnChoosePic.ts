import { uploadFile } from '@/services';
import APPBridge from '@/store/app-bridge';
import toast from 'react-hot-toast';
import { compressImg } from './compressImg';

// 格式化文件大小
// const formatFileSize = (bytes: number): string => {
//   if (bytes === 0) return '0 B';
//   const k = 1024;
//   const sizes = ['B', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
// };

// 展示调试信息弹窗
// const showDebugDialog = async (fileInfo: {
//   originalFile: File;
//   compressStatus?: 'success' | 'failed' | 'skipped';
//   compressedFile?: File | null;
//   compressError?: any;
//   uploadStatus?: 'success' | 'failed' | 'not_started';
//   uploadResult?: any;
//   uploadError?: any;
// }) => {
//   try {
//     const { ResponsiveDialog } = await import(
//       '@workspace/ui/components/responsive-dialog'
//     );
//     const React = await import('react');
//     const { createRoot } = await import('react-dom/client');

//     // 创建容器
//     const container = document.createElement('div');
//     document.body.appendChild(container);
//     const root = createRoot(container);

//     // 构建阶段状态信息
//     const getStatusText = (status?: string) => {
//       if (status === 'success') return '✅ 成功';
//       if (status === 'failed') return '❌ 失败';
//       if (status === 'skipped') return '⏭️ 跳过';
//       if (status === 'not_started') return '⏸️ 未开始';
//       return '❓ 未知';
//     };

//     const fileInfoText = `
// 原始文件信息:
// - 文件名: ${fileInfo.originalFile.name}
// - 文件类型: ${fileInfo.originalFile.type}
// - 文件大小: ${formatFileSize(fileInfo.originalFile.size)}
// - 最后修改: ${new Date(fileInfo.originalFile.lastModified).toLocaleString()}
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 压缩阶段: ${getStatusText(fileInfo.compressStatus)}
// ${
//   fileInfo.compressStatus === 'success' && fileInfo.compressedFile
//     ? `- 文件名: ${fileInfo.compressedFile.name}
// - 文件类型: ${fileInfo.compressedFile.type}
// - 文件大小: ${formatFileSize(fileInfo.compressedFile.size)}
// - 压缩率: ${Math.round((1 - fileInfo.compressedFile.size / fileInfo.originalFile.size) * 100)}%
// - 节省空间: ${formatFileSize(fileInfo.originalFile.size - fileInfo.compressedFile.size)}
// `
//     : fileInfo.compressStatus === 'failed'
//       ? `- 错误: ${fileInfo.compressError instanceof Error ? fileInfo.compressError.message : String(fileInfo.compressError)}`
//       : fileInfo.compressStatus === 'skipped'
//         ? '- 原因: 文件格式不支持压缩或已在限制范围内'
//         : '- 状态: 未执行'
// }
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 上传阶段: ${getStatusText(fileInfo.uploadStatus)}
// ${
//   fileInfo.uploadStatus === 'success' && fileInfo.uploadResult
//     ? `- URL: ${fileInfo.uploadResult.url}
// - OSS Key: ${fileInfo.uploadResult.ossKey || fileInfo.uploadResult.name || 'N/A'}
// - 文件ID: ${fileInfo.uploadResult.id || 'N/A'}
// `
//     : fileInfo.uploadStatus === 'failed'
//       ? `- 错误: ${fileInfo.uploadError instanceof Error ? fileInfo.uploadError.message : String(fileInfo.uploadError)}`
//       : '- 状态: 未执行'
// }
//     `.trim();

//     const DebugDialog = () => {
//       const [open, setOpen] = React.useState(true);

//       const handleClose = () => {
//         setOpen(false);
//         setTimeout(() => {
//           root.unmount();
//           if (document.body.contains(container)) {
//             document.body.removeChild(container);
//           }
//         }, 300);
//       };

//       const handleCopy = async () => {
//         try {
//           await navigator.clipboard.writeText(fileInfoText);
//           toast.success('调试信息已复制到剪贴板');
//         } catch (error) {
//           console.error('复制失败:', error);
//           toast.error('复制失败，请手动复制');
//         }
//       };

//       const handleRefresh = () => {
//         if (confirm('确定要刷新页面吗？')) {
//           location.reload();
//         }
//       };

//       const dialogContent = React.createElement(
//         'div',
//         { className: 'p-4 space-y-4' },
//         React.createElement(
//           'pre',
//           {
//             className:
//               'text-xs bg-muted p-4 rounded-md overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono',
//           },
//           fileInfoText
//         ),
//         React.createElement(
//           'div',
//           { className: 'flex gap-2 justify-end' },
//           React.createElement(
//             'button',
//             {
//               onClick: handleCopy,
//               className:
//                 'px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90',
//             },
//             '复制信息'
//           ),
//           React.createElement(
//             'button',
//             {
//               onClick: handleRefresh,
//               className:
//                 'px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90',
//             },
//             '刷新页面'
//           ),
//           React.createElement(
//             'button',
//             {
//               onClick: handleClose,
//               className:
//                 'px-4 py-2 bg-primary text-primary-btn rounded-md hover:bg-primary/90',
//             },
//             '关闭'
//           )
//         )
//       );

//       return React.createElement(ResponsiveDialog, {
//         isOpen: open,
//         onOpenChange: setOpen,
//         title: '文件上传调试信息',
//         description: '查看文件压缩和上传的详细信息',
//         showCloseIcon: true,
//         children: dialogContent,
//       } as any);
//     };

//     root.render(React.createElement(DebugDialog));
//   } catch (error) {
//     console.error('无法显示调试弹窗:', error);
//     // 降级方案：使用 alert
//     const getStatusText = (status?: string) => {
//       if (status === 'success') return '✅ 成功';
//       if (status === 'failed') return '❌ 失败';
//       if (status === 'skipped') return '⏭️ 跳过';
//       if (status === 'not_started') return '⏸️ 未开始';
//       return '❓ 未知';
//     };
//     const info = `
// 原始文件: ${fileInfo.originalFile.name} (${formatFileSize(fileInfo.originalFile.size)})

// 压缩阶段: ${getStatusText(fileInfo.compressStatus)}
// ${fileInfo.compressedFile ? `压缩后: ${fileInfo.compressedFile.name} (${formatFileSize(fileInfo.compressedFile.size)})` : ''}
// ${fileInfo.compressError ? `压缩错误: ${fileInfo.compressError}` : ''}

// 上传阶段: ${getStatusText(fileInfo.uploadStatus)}
// ${fileInfo.uploadResult ? `上传URL: ${fileInfo.uploadResult.url}` : ''}
// ${fileInfo.uploadError ? `上传错误: ${fileInfo.uploadError}` : ''}
//     `.trim();
//     alert(info);
//   }
// };

export const canUseRnChoosePic = async () => {
  const features = await APPBridge.featureDetect(['RNCHOOSEPIC']);
  return features.RNCHOOSEPIC;
};

export const showRnChoosePic = async (onSelectItem: (url?: string) => void, t?: (key: string) => string) => {
  toast.loading(t?.('正在上传图片') ?? '正在上传图片2...');
  APPBridge.appCall(
    {
      type: 'RNCHOOSEPIC' as any,
      params: {},
      jsCbFnName: 'RNCHOOSEPIC',
    },
    async cbParams => {
      const convertBase64ToBlob = (base64: string): Promise<Blob> => {
        return new Promise(resolve => {
          fetch(base64).then(res => {
            resolve(res.blob());
          });
        });
      };

      console.log('cbParams', cbParams);
      if (!cbParams.success) {
        toast.dismiss();
        onSelectItem();
        return;
      }
      // console.log("cbParams", cbParams);
      // console.log("cbParams 64", cbParams?.data?.images?.[0]?.base64);
      const asset = cbParams?.data?.images?.[0];
      const base64Data = asset.base64; // 👈 纯 Base64，没有头
      const mimeType = asset.type; // 比如 "image/jpeg"
      const base64 = `data:${mimeType};base64,${base64Data}`;
      const blob = await convertBase64ToBlob(base64);
      console.log('blob url', URL.createObjectURL(blob));

      // 1. 将 Blob 转换为 File
      const fileName = `image_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
      const file = new File([blob], fileName, {
        type: mimeType,
        lastModified: Date.now(),
      });

      // 初始化调试信息
      // let compressStatus: 'success' | 'failed' | 'skipped' =
      //   'not_started' as any;
      // let compressedFile: File | null = null;
      // let compressError: any = null;
      // let uploadStatus: 'success' | 'failed' | 'not_started' = 'not_started';
      // let uploadResult: any = null;
      // let uploadError: any = null;
      let compressedFile: File | null = null;

      // 2. 压缩图片
      try {
        // toast.loading('正在压缩图片...');
        compressedFile = await compressImg(file);
        // if (compressedFile && compressedFile !== file) {
        //   compressStatus = 'success';
        // } else {
        //   compressStatus = 'skipped';
        // }
      } catch (error) {
        console.error('压缩失败:', error);
        // compressStatus = 'failed';
        // compressError = error;
        // 压缩失败不影响上传，使用原文件继续
      }

      const fileToUpload = compressedFile || file;

      // 3. 上传图片
      try {
        const uploadResult = await uploadFile({
          file: fileToUpload,
          type: 'picture',
        });

        if (uploadResult?.url) {
          // uploadStatus = 'success';
          toast.dismiss();

          // 展示调试信息
          // await showDebugDialog({
          //   originalFile: file,
          //   compressStatus,
          //   compressedFile: compressedFile || undefined,
          //   compressError,
          //   uploadStatus,
          //   uploadResult,
          // });

          onSelectItem(uploadResult.url);
        } else {
          throw new Error(t?.('上传失败未返回有效的URL') ?? '上传失败：未返回有效的 URL');
        }
      } catch (error) {
        console.error('上传失败:', error);
        // uploadStatus = 'failed';
        // uploadError = error;
        toast.dismiss();
        toast.error(`${t?.('图片上传失败，请重试') ?? '图片上传失败，请重试'}: ${error}`);

        // 展示错误调试信息
        // try {
        //   await showDebugDialog({
        //     originalFile: file,
        //     compressStatus,
        //     compressedFile: compressedFile || undefined,
        //     compressError,
        //     uploadStatus,
        //     uploadError,
        //   });
        // } catch (debugError) {
        //   console.error('无法显示调试信息:', debugError);
        // }

        // 上传失败时不返回本地 blob URL，只返回 undefined
        onSelectItem();
      }
      // console.log("cbParams", cbParams?.data?.images?.[0]?.base64);
    },
    60 * 1000 * 60
  );
};
