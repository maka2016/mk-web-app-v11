import { getWorksDetailStatic } from '@mk/services';

export const SpecInfoView = () => {
  const worksDetail = getWorksDetailStatic();
  const specInfo = worksDetail?.specInfo;

  if (!specInfo) {
    return <div className='p-4 text-center text-gray-500'>暂无规格信息</div>;
  }

  const exportFormatMap: any = {
    video: '视频',
    image: '图片',
    html: '网页分享',
  };

  return (
    <div className='p-4 w-full max-h-[75vh] overflow-auto'>
      {/* 头部信息 */}
      <div className='mb-4'>
        <h3 className='text-lg font-bold text-gray-900 mb-1'>作品规格详情</h3>
        <p className='text-sm text-gray-600'>
          {worksDetail?.title || '未设置标题'}
        </p>
      </div>

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
                        (specInfo.viewport_width / specInfo.width) *
                          specInfo.height
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
                    {specInfo.export_format?.map((format, index) => (
                      <span
                        key={index}
                        className='px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium'
                      >
                        {exportFormatMap[format] || format}
                      </span>
                    ))}
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
            <h4 className='text-sm font-semibold text-gray-800'>规格描述</h4>
          </div>
          <p className='text-sm text-gray-600 leading-relaxed'>
            {specInfo.desc}
          </p>
        </div>
      )}
    </div>
  );
};
