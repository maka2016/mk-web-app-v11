'use client';

import { getAppId, getDesignerInfoForClient, getUid } from '@/services';
import { useStore } from '@/store';
import { isPc, queryToObj } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// 从 tRPC 推导类型
type SpecItem = Awaited<
  ReturnType<typeof trpc.worksSpec.findManyWithCount.query>
>['list'][0];

const ChangeTemplate = () => {
  const [templateId, setTemplateId] = useState<string>();
  return (
    <div className='p-4'>
      <div>
        <Input
          value={templateId}
          onChange={e => setTemplateId(e.target.value)}
          placeholder='请输入模版ID'
        />
      </div>
      <Button
        onClick={() => {
          if (!templateId) {
            toast.error('请输入模版ID');
            return;
          }
          window.open(
            `/desktop/editor-designer?works_id=${templateId}&designer_tool=2&uid=${getUid()}&is_template=true`
          );
        }}
      >
        确定
      </Button>
    </div>
  );
};

const exportFormatMap: any = {
  video: '视频',
  html: '网页',
  image: '图片',
};

const ChangeSpec = ({
  defaultWorksName,
  worksCate,
}: {
  defaultWorksName: string;
  worksCate?: 'template' | 'theme';
}) => {
  const [specList, setSpecList] = useState<SpecItem[]>([]);
  const [worksName, setWorksName] = useState(defaultWorksName);
  const [selectedSpec, setSelectedSpec] = useState<SpecItem | null>(null);

  const { setLoginShow } = useStore();
  useEffect(() => {
    trpc.worksSpec.findManyWithCount.query({ deleted: false }).then(res => {
      setSpecList(res.list);
    });
  }, []);

  const handleCreateWorks = async (item: SpecItem) => {
    try {
      const res = await trpc.works.create.mutate({
        title: worksName + item.display_name,
        desc: '请填写描述',
        spec_id: item.id,
        appid: getAppId(),
        cover: '',
      });
      console.log(res);
      window.open(
        `/desktop/editor-designer?works_id=${res.id}&designer_tool=2&uid=${getUid()}&appid=${getAppId()}&works_cate=${worksCate}`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.log(errorMessage);
      if (/uid/.test(errorMessage) || errorMessage.includes('请先登录')) {
        toast.error(`需要先登录`);
        setLoginShow(true);
      } else {
        toast.error(`创建作品失败: ${errorMessage}`);
      }
    }
  };

  return (
    <div className='flex flex-col flex-wrap gap-4 p-4 w-[800px]'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-sm'>作品名称</h1>
        <div className='flex items-center'>
          <Input
            value={worksName}
            onChange={e => setWorksName(e.target.value)}
            placeholder='请输入作品名称'
          />
          <span className='w-1/2 ml-2 flex items-center'>
            - {selectedSpec?.display_name || '未选规格'}
          </span>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <h1 className='text-sm'>选择规格</h1>
        <div className='border rounded-lg overflow-hidden'>
          <div className='overflow-auto max-h-96'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 border-b sticky top-0 z-10'>
                <tr>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[100px]'>
                    规格显示(用户视角)
                  </th>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                    内部规格(旧)
                  </th>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                    宽度
                  </th>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                    高度
                  </th>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[60px]'>
                    翻页
                  </th>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                    最大页数
                  </th>
                  <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                    导出格式
                  </th>
                </tr>
              </thead>
              <tbody>
                {specList.map(item => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedSpec?.id === item.id ? 'bg-blue-50' : ''
                      }`}
                    onClick={() => setSelectedSpec(item)}
                  >
                    <td className='px-3 py-2 font-medium text-gray-900 truncate'>
                      {item.display_name}
                    </td>
                    <td className='px-3 py-2 font-medium text-gray-900 truncate'>
                      {item.name}
                    </td>
                    <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                      {item.viewport_width || 0}px
                    </td>
                    <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                      {item.fixed_height &&
                        item.viewport_width &&
                        item.width &&
                        item.height
                        ? Math.floor(
                          (item.viewport_width / item.width) * item.height
                        ) + 'px'
                        : '自适应'}
                    </td>
                    <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                      {item.is_flip_page ? '是' : '否'}
                    </td>
                    <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                      {item.max_page_count}
                    </td>
                    <td className='px-3 py-2'>
                      <div className='flex flex-wrap gap-1'>
                        {item.export_format &&
                          item.export_format
                            .split(',')
                            .filter(format => format.trim())
                            .map((format, index) => (
                              <span
                                key={index}
                                className='px-1.5 py-0.5 bg-gray-100 rounded text-xs whitespace-nowrap'
                              >
                                {exportFormatMap[format.trim()] ||
                                  format.trim()}
                              </span>
                            ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className='flex justify-end'>
        <Button
          disabled={!selectedSpec}
          onClick={() => selectedSpec && handleCreateWorks(selectedSpec)}
        >
          创建
        </Button>
      </div>
    </div>
  );
};

export default function DesignerTool() {
  const [showDesignerTool, setShowDesignerTool] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  const [defaultWorksName, setDefaultWorksName] = useState('设计师作品');
  const [worksCate, setWorksCate] = useState<'template' | 'theme'>();
  const [designerName, setDesignerName] = useState('');

  useEffect(() => {
    const designerTool = queryToObj().designer_tool;

    if (designerTool && isPc()) {
      getDesignerInfoForClient({
        uid: getUid(),
        appid: getAppId(),
      })
        .then(res => {
          setShowDesignerTool(res.isDesigner);
          setDesignerName(res.fullName);
          setDefaultWorksName(prev => prev + res.fullName);
          if (!res.isDesigner) {
            toast.error('你还不是设计师，请联系管理员');
          }
        })
        .catch(() => {
          toast.error('需要登陆才能使用设计师功能');
        });
    }
  }, []);

  if (!showDesignerTool) {
    return null;
  }

  return (
    <div className='fixed bottom-0 left-0 top-0 bg-white'>
      <div className='flex justify-between'>
        <div className='p-4 flex flex-col gap-2'>
          <span className='text-xs'>当前设计师：{designerName}</span>
          <Button
            variant='outline'
            onClick={() => {
              // setShowTemplate(true);
              window.open('/dashboard/designer/works');
            }}
          >
            设计师工作台
          </Button>
        </div>
      </div>
      <ResponsiveDialog
        isOpen={showSpec}
        onOpenChange={setShowSpec}
        title='选择规格'
        contentProps={{
          className: 'max-w-[800px]',
        }}
      >
        <ChangeSpec defaultWorksName={defaultWorksName} worksCate={worksCate} />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showTemplate}
        onOpenChange={setShowTemplate}
        title='编辑模版'
      >
        <ChangeTemplate />
      </ResponsiveDialog>
    </div>
  );
}
