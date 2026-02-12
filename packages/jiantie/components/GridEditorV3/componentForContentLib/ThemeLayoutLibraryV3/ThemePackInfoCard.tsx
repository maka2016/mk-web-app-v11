import { Package, Tag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MaterialItem } from '../MaterialResourceManager/services';
import { themePackV3Manager } from './services';

interface ThemePackInfoCardProps {
  version?: 'v2' | 'v3';
  materialId: string;
  className?: string;
}

export default function ThemePackInfoCard({
  materialId = '',
  className = '',
}: ThemePackInfoCardProps) {
  const [materialItem, setCurrentThemePackItem] =
    useState<MaterialItem | null>(null);


  // 加载当前作品的主题包信息
  useEffect(() => {
    const loadCurrentThemePack = async () => {
      const documentId = materialId;
      if (!documentId) {
        setCurrentThemePackItem(null);
        return;
      }

      try {
        const item = await themePackV3Manager.getItem(documentId);
        setCurrentThemePackItem(item);
      } catch (error) {
        console.error('Failed to load current theme pack:', error);
        setCurrentThemePackItem(null);
      }
    };

    loadCurrentThemePack();
  }, [materialId]);

  if (!materialItem) {
    return null;
  }

  return (
    <div
      className={`flex-shrink-0 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 ${className}`}
    >
      {/* 第一行：主题包名称和作者 */}
      <div className='flex items-center justify-between mb-1'>
        <div className='flex items-center gap-1.5'>
          <Package className='w-3.5 h-3.5 text-blue-600' />
          <span className='text-sm font-medium text-gray-900'>
            {materialItem.name}
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <User className='w-3 h-3 text-gray-500' />
          <span className='text-xs text-gray-600'>
            {materialItem.author || '未知作者'}
          </span>
        </div>
      </div>

      {/* 第二行：分类标签 */}
      {materialItem.material_tags && materialItem.material_tags.length > 0 && (
        <div className='flex items-center gap-1'>
          <Tag className='w-3 h-3 text-gray-500' />
          <div className='flex flex-wrap gap-1'>
            {materialItem.material_tags.map(tag => (
              <span
                key={tag.documentId}
                className='px-1.5 py-0.5 text-xs bg-white text-blue-700 rounded-full border border-blue-200'
              >
                {tag.name}
              </span>
            ))}

            <span className='px-1.5 py-0.5 text-xs bg-white text-blue-700 rounded-full border border-blue-200'>
              v3 主题包
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
