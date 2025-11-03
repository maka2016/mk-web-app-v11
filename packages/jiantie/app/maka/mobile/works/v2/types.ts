import { WorksEntity2 } from '@/services/works2';

export interface WorksItem extends WorksEntity2 {
  editor_version: number;
  spec: {
    id: string;
    name: string;
    width: number;
    height: number;
  };
  analytics: Array<{
    data: string;
    text: string;
    url: string;
  }>;
  bulletScreenTotal?: number;
  huiZhiTotal?: number;
  thumb?: string;
}
