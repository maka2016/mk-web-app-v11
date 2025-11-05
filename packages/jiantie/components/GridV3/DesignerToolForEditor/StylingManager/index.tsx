import React, { useState } from 'react';
import StylingList from './StylingList';
import { MaterialItem } from '../ThemePackManager/services';
import { useGridContext } from '../../comp/provider';

interface StylingManagerProps {
  onClose?: () => void;
}

export default function StylingManager({ onClose }: StylingManagerProps) {
  return (
    <div className='flex flex-col h-full'>
      {/* 风格列表区域 */}
      <div className='flex-1 min-h-0'>
        <StylingList />
      </div>
    </div>
  );
}
