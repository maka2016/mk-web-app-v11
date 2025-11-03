import { Package, Tag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MaterialItem } from '../MaterialResourceManager/services';
import { themePackV3Manager } from './services';

interface ThemePackInfoCardProps {
  version?: 'v2' | 'v3';
  documentId: string;
  className?: string;
}

export default function ThemePackInfoCard({
  version,
  documentId,
  className = '',
}: ThemePackInfoCardProps) {
  const [themePackItem, setThemePackItem] = useState<MaterialItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThemePack = async () => {
      if (!documentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await themePackV3Manager.getItem(documentId);
        setThemePackItem(res);
      } catch (error) {
        console.error('Failed to load theme pack:', error);
        setThemePackItem(null);
      } finally {
        setLoading(false);
      }
    };

    loadThemePack();
  }, [documentId]);

  if (loading) {
    return (
      <div
        className={`flex-shrink-0 mx-2 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 ${className}`}
      >
        <div className='animate-pulse'>
          {/* 第一行骨架 */}
          <div className='flex items-center justify-between mb-1'>
            <div className='flex items-center gap-1.5'>
              <div className='w-3.5 h-3.5 bg-gray-300 rounded'></div>
              <div className='h-3.5 bg-gray-300 rounded w-24'></div>
            </div>
            <div className='flex items-center gap-1'>
              <div className='w-3 h-3 bg-gray-300 rounded'></div>
              <div className='h-3 bg-gray-300 rounded w-16'></div>
            </div>
          </div>
          {/* 第二行骨架 */}
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 bg-gray-300 rounded'></div>
            <div className='flex gap-1'>
              <div className='h-4 bg-gray-300 rounded w-12'></div>
              <div className='h-4 bg-gray-300 rounded w-8'></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!themePackItem) {
    return null;
  }

  return (
    <div
      className={`flex-shrink-0 mx-2 mt-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 ${className}`}
    >
      {/* 第一行：主题包名称和作者 */}
      <div className='flex items-center justify-between mb-1'>
        <div className='flex items-center gap-1.5'>
          <Package className='w-3.5 h-3.5 text-blue-600' />
          <span className='text-sm font-medium text-gray-900'>
            {themePackItem.name}
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <User className='w-3 h-3 text-gray-500' />
          <span className='text-xs text-gray-600'>
            {themePackItem.author || '未知作者'}
          </span>
        </div>
      </div>

      {/* 第二行：分类标签 */}
      {themePackItem.material_tags &&
        themePackItem.material_tags.length > 0 && (
          <div className='flex items-center gap-1'>
            <Tag className='w-3 h-3 text-gray-500' />
            <div className='flex flex-wrap gap-1'>
              {themePackItem.material_tags.map(tag => (
                <span
                  key={tag.documentId}
                  className='px-1.5 py-0.5 text-xs bg-white text-blue-700 rounded-full border border-blue-200'
                >
                  {tag.name}
                </span>
              ))}

              <span className='px-1.5 py-0.5 text-xs bg-white text-blue-700 rounded-full border border-blue-200'>
                {version || 'v2'} 主题包
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
