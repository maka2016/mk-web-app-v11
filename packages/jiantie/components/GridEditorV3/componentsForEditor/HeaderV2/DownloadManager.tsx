import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import clas from 'classnames';
import { downloadZip } from 'client-zip';
import FileSaver from 'file-saver';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import RowRendererV2 from '../../AppV2/RowRendererV2';
import { useWorksStore } from '../../works-store/store/hook';
import { downloadMultiplePage } from './services';

const RowRoot = styled.div`
  /* height: 100%; */
  width: 100%;
  overflow: hidden;
  display: flex;
  /* flex-direction: column; */
  flex-wrap: wrap;
  padding: 8px;
  gap: 8px;
  .row_container {
    max-height: 100%;
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 8px;
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .row_wrapper {
    position: relative;
    outline: 1px solid #eee;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
      outline: 2px solid #1a87ff;
    }

    &.selected {
      outline: 2px solid #1a87ff;
      background-color: rgba(26, 135, 255, 0.05);
    }

    .row_content {
      * {
        pointer-events: none !important;
      }
    }

    .page_checkbox {
      position: absolute;
      top: 4px;
      left: 4px;
      z-index: 10;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 4px;
      padding: 2px;
    }
  }
  .page_name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    text-align: center;
    padding: 2px 0;
  }
`;

function DownloadManager() {
  const worksStore = useWorksStore();
  const { gridsData } = worksStore.worksData.gridProps;
  const { worksDetail } = worksStore;
  const [downloading, setDownloading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const zoom = 0.2; // 更小的缩放比例以适应网格布局

  // 获取页面总数
  const totalPages = gridsData?.length || 0;

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedPages.length === totalPages) {
      setSelectedPages([]);
    } else {
      setSelectedPages(Array.from({ length: totalPages }, (_, i) => i));
    }
  };

  // 选择单个页面
  const handleSelectPage = (pageIndex: number) => {
    setSelectedPages(prev => {
      if (prev.includes(pageIndex)) {
        return prev.filter(i => i !== pageIndex);
      } else {
        return [...prev, pageIndex];
      }
    });
  };

  const handleDownload = async () => {
    if (selectedPages.length === 0) {
      toast.error('请选择要下载的页面');
      return;
    }

    setDownloading(true);

    toast.loading(`正在生成${selectedPages.length}个页面的图片...`);

    const downloadQueue = await downloadMultiplePage(
      selectedPages.map(p => gridsData[p]),
      undefined,
      worksDetail
    );

    if (downloadQueue.length === 0) {
      toast.error('没有成功生成任何页面图片');
      setDownloading(false);
      return;
    }

    toast.loading('正在打包下载...');

    try {
      // 下载所有图片并准备zip内容
      const zipContents = [];
      for (let i = 0; i < downloadQueue.length; i++) {
        const { url, filename } = downloadQueue[i];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            toast.error(`${filename} 下载失败`);
            continue;
          }
          const blob = await response.blob();
          zipContents.push({
            name: filename,
            input: blob,
          });
        } catch (error) {
          console.error(`下载 ${filename} 失败:`, error);
          toast.error(`${filename} 下载失败`);
        }
      }

      if (zipContents.length === 0) {
        toast.error('没有成功下载任何图片');
        setDownloading(false);
        return;
      }

      // 创建并下载zip文件
      const zipBlob = await downloadZip(zipContents).blob();
      const zipFilename = `页面集合_${selectedPages.length}页.zip`;
      FileSaver.saveAs(zipBlob, zipFilename);

      toast.dismiss();
      toast.success(`成功下载${zipContents.length}个页面！`);
    } catch (error) {
      console.error('打包下载失败:', error);
      toast.error('打包下载失败，请重试');
    }

    setDownloading(false);
  };

  return (
    <>
      <div className='p-2'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='text-lg font-semibold'>下载管理</h3>
          <div className='flex items-center gap-2' onClick={handleSelectAll}>
            <Checkbox checked={selectedPages.length === totalPages} />
            <span className='text-sm text-gray-600'>
              {selectedPages.length === totalPages ? '全选' : '全选'}
            </span>
          </div>
        </div>
        <div className='text-sm text-gray-500 mb-2'>
          已选择 {selectedPages.length} / {totalPages} 个页面
        </div>
      </div>

      <RowRoot>
        <RowRendererV2
          readonly={true}
          isPlayFlipPage={false}
          isFlipPage={false}
          blockStyle={{
            width: '375px',
            zoom,
            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
          blockWrapper={(rowDOM, blockIdx, row) => {
            const isSelected = selectedPages.includes(blockIdx);
            return (
              <div
                key={`row_${blockIdx}`}
                className={clas(
                  isSelected && 'selected',
                  'row_wrapper relative'
                )}
                onClick={() => handleSelectPage(blockIdx)}
              >
                <div className='page_checkbox'>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {}} // 由父元素的onClick处理
                  />
                </div>
                <div className='row_content relative z-0'>{rowDOM}</div>
                <div className='page_name'>
                  {row.name || '页面' + (blockIdx + 1)}
                </div>
              </div>
            );
          }}
        />
      </RowRoot>

      <div className='p-4 border-t border-gray-200 bg-gray-50'>
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => setSelectedPages([])}
            disabled={selectedPages.length === 0}
          >
            清空选择
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || selectedPages.length === 0}
          >
            {downloading
              ? '生成中...'
              : `下载选中的${selectedPages.length}个页面`}
          </Button>
        </div>
      </div>
    </>
  );
}
export default observer(DownloadManager);
