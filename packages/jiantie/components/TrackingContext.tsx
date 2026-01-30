'use client';

import { createContext, useContext } from 'react';

// 打点业务相关的 Context
export interface TrackingContextValue {
  ref_page_id?: string;
  ref_page_type?: string;
  page_id?: string;
  page_type?: string;
  search_word?: string;
}

export const TrackingContext = createContext<TrackingContextValue>({
  ref_page_id: undefined,
  ref_page_type: undefined,
  page_id: undefined,
  page_type: undefined,
  search_word: undefined,
});

// Hook 用于在子组件中获取打点信息
export const useTracking = () => {
  return useContext(TrackingContext);
};
