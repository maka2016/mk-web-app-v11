import { SerializedWorksEntity, trpc } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export const SpecInfoView = ({
  worksDetail,
  onSpecChangeSuccess,
}: {
  worksDetail: SerializedWorksEntity;
  onSpecChangeSuccess?: (updated: SerializedWorksEntity) => void;
}) => {
  const [specsList, setSpecsList] = useState<any[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [switchingSpec, setSwitchingSpec] = useState(false);
  const [currentSpecInfo, setCurrentSpecInfo] = useState(
    worksDetail?.specInfo || null
  );
  const [selectedSpecId, setSelectedSpecId] = useState<string | undefined>(
    worksDetail?.specInfo?.id || (worksDetail as any).spec_id || undefined
  );

  const specInfo = currentSpecInfo;

  useEffect(() => {
    const loadSpecs = async () => {
      setLoadingSpecs(true);
      try {
        const specs = (await trpc.worksSpec.findMany.query({
          deleted: false,
          take: 1000,
        })) as any[];
        setSpecsList(specs || []);
      } catch (error) {
        console.error('加载规格列表失败:', error);
        setSpecsList([]);
      } finally {
        setLoadingSpecs(false);
      }
    };

    loadSpecs();
  }, []);

  const exportFormatMap: any = {
    video: '视频',
    image: '图片',
    html: '网页分享',
  };

  const handleSaveSpec = async () => {
    if (!worksDetail?.id || !selectedSpecId) return;
    try {
      setSwitchingSpec(true);
      const updated = (await trpc.works.switchSpec.mutate({
        id: worksDetail.id,
        spec_id: selectedSpecId,
      })) as unknown as SerializedWorksEntity;

      setCurrentSpecInfo(updated.specInfo || null);
      onSpecChangeSuccess?.(updated);
      toast.success('规格已更新');
    } catch (error: any) {
      console.error('切换规格失败:', error);
      toast.error(error?.message || '切换规格失败');
    } finally {
      setSwitchingSpec(false);
    }
  };

  return (
    <div className='p-4 w-full max-h-[75vh] overflow-auto'>
      {/* 头部信息 + 规格切换 */}
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div>
          <h3 className='text-lg font-bold text-gray-900 mb-1'>作品规格详情</h3>
          <p className='text-sm text-gray-600'>
            {worksDetail?.title || '未设置标题'}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Select
            value={selectedSpecId || ''}
            onValueChange={value => {
              setSelectedSpecId(value || undefined);
            }}
            disabled={loadingSpecs || switchingSpec || !specsList.length}
          >
            <SelectTrigger className='h-8 w-[240px] text-xs'>
              <SelectValue
                placeholder={loadingSpecs ? '规格加载中...' : '选择规格'}
              />
            </SelectTrigger>
            <SelectContent>
              {specsList.map(spec => {
                const displayText = spec.display_name
                  ? `${spec.display_name}${
                      spec.name && spec.name !== spec.display_name
                        ? ` (${spec.name})`
                        : ''
                    }`
                  : spec.name || spec.alias || '';
                return (
                  <SelectItem key={spec.id} value={spec.id}>
                    {displayText}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            size='sm'
            variant='outline'
            disabled={
              switchingSpec ||
              !selectedSpecId ||
              selectedSpecId ===
                (worksDetail?.specInfo?.id || (worksDetail as any).spec_id)
            }
            onClick={handleSaveSpec}
          >
            {switchingSpec ? '保存中...' : '保存规格'}
          </Button>
        </div>
      </div>

      {!specInfo ? (
        <div className='p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200'>
          当前作品暂无规格信息，请在上方选择规格并保存。
        </div>
      ) : (
        <>
          {/* 紧凑表格视图 */}
          <div className='bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      规格名称
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      规格代码
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      画布尺寸
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      导出真实尺寸
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      翻页
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      页面类型
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      动画
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      最大页数
                    </th>
                    <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      导出格式
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  <tr className='hover:bg-gray-50'>
                    <td className='px-3 py-2 font-medium text-gray-900 text-sm'>
                      {specInfo.display_name}
                    </td>
                    <td className='px-3 py-2 font-mono text-gray-700 text-xs'>
                      {specInfo.name}
                    </td>
                    <td className='px-3 py-2 text-gray-600 text-sm'>
                      {specInfo.width} ×{' '}
                      {specInfo.fixed_height ? specInfo.height : '自适应'}
                    </td>
                    <td className='px-3 py-2 text-gray-600 text-sm'>
                      {specInfo.viewport_width} ×{' '}
                      {specInfo.fixed_height
                        ? Math.floor(
                            ((specInfo.viewport_width ?? 0) /
                              (specInfo.width ?? 0)) *
                              (specInfo.height ?? 0)
                          )
                        : '自适应'}
                    </td>
                    <td className='px-3 py-2'>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          specInfo.is_flip_page
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {specInfo.is_flip_page ? '是' : '否'}
                      </span>
                    </td>
                    <td className='px-3 py-2'>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          specInfo.is_flat_page
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {specInfo.is_flat_page ? '多页平铺' : '单页展示'}
                      </span>
                    </td>
                    <td className='px-3 py-2'>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          specInfo.use_animation
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {specInfo.use_animation ? '是' : '否'}
                      </span>
                    </td>
                    <td className='px-3 py-2 text-gray-600 text-sm font-medium'>
                      {specInfo.max_page_count}
                    </td>
                    <td className='px-3 py-2'>
                      <div className='flex flex-wrap gap-1'>
                        <span className='px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium'>
                          {exportFormatMap[specInfo.export_format ?? ''] ||
                            specInfo.export_format}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 规格描述 */}
          {specInfo.desc && (
            <div className='mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200'>
              <div className='flex items-center mb-2'>
                <div className='w-2 h-2 bg-indigo-500 rounded-full mr-2'></div>
                <h4 className='text-sm font-semibold text-gray-800'>
                  规格描述
                </h4>
              </div>
              <p className='text-sm text-gray-600 leading-relaxed'>
                {specInfo.desc}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
