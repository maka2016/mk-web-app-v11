'use client';

import GridCompWrapper from '@/components/GridEditorV3/AppV2';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import { convert2025ToNew } from '@/components/GridEditorV3/works-store/utils/convertDataFrom2025';
import { getTemplate2025Data } from '@/services/works';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import testWorksDetail from './test.template.json';

export default function ConvertWorks2025Page() {
  const [templateId, setTemplateId] = useState('T_MPCRVHSG9ED2');
  const [loading, setLoading] = useState(false);
  const [convertedData, setConvertedData] = useState<IWorksData | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const handleConvert = async () => {
    if (!templateId.trim()) {
      toast.error('请输入模板ID');
      return;
    }

    setLoading(true);
    setConvertedData(null);
    setOriginalData(null);

    try {
      // 获取 2025 版本的数据
      const response = await getTemplate2025Data(templateId.trim());

      if (!response || !response.work_data) {
        toast.error('获取数据失败：返回数据格式不正确');
        return;
      }

      setOriginalData(response.work_data);

      // 转换为新版本数据
      const newData = convert2025ToNew(response.work_data);

      setConvertedData(newData);
      setPreviewKey(prev => prev + 1); // 更新 key 强制重新渲染编辑器

      toast.success('转换成功！');
    } catch (error: any) {
      console.error('转换失败:', error);
      toast.error(
        `转换失败: ${error?.response?.data?.message || error?.message || '未知错误'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='container mx-auto'>
      <div className='h-full flex flex-col'>
        <div className='flex-1 grid grid-cols-3 gap-2 overflow-hidden'>
          {/* 左侧：输入和控制区 */}
          <div className='flex flex-col space-y-4 overflow-hidden'>
            <Card className='flex-shrink-0'>
              <CardHeader>
                <CardTitle>输入</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='templateId'>
                      模板ID <span className='text-red-500'>*</span>
                    </Label>
                    <Input
                      id='templateId'
                      value={templateId}
                      onChange={e => setTemplateId(e.target.value)}
                      placeholder='请输入2025版本的模板ID，例如：T_O4286JON5KOA'
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleConvert();
                        }
                      }}
                    />
                  </div>

                  <div className='flex gap-3'>
                    <Button
                      onClick={handleConvert}
                      disabled={loading || !templateId.trim()}
                    >
                      {loading && (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      )}
                      {loading ? '转换中...' : '开始转换'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 转换结果和下载按钮 */}
            {convertedData && (
              <Card className='flex-shrink-0'>
                <CardHeader>
                  <CardTitle>转换结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          handleDownload(
                            originalData,
                            `${templateId}_original.json`
                          )
                        }
                      >
                        下载原始数据
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          handleDownload(
                            convertedData,
                            `${templateId}_converted.json`
                          )
                        }
                      >
                        下载转换数据
                      </Button>
                    </div>

                    <div className='space-y-4'>
                      <div className='space-y-2'>
                        <h4 className='font-medium text-sm text-muted-foreground'>
                          原始数据（IWorksData2025）
                        </h4>
                        <div className='bg-muted p-4 rounded-lg max-h-[300px] overflow-auto'>
                          <pre className='text-xs select-text'>
                            {JSON.stringify(originalData, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <h4 className='font-medium text-sm text-muted-foreground'>
                          转换后数据（IWorksData）
                        </h4>
                        <div className='bg-muted p-4 rounded-lg max-h-[300px] overflow-auto'>
                          <pre className='text-xs select-text'>
                            {JSON.stringify(convertedData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：预览区 */}
          <div className='flex flex-col overflow-hidden col-span-2'>
            {convertedData ? (
              <GridCompWrapper
                readonly={false}
                headerType='mobile'
                // showHeader={false}
                worksData={convertedData}
                worksId={`11`}
                worksDetail={testWorksDetail as any}
              />
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground'>
                <p>转换后将在此处显示预览</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
