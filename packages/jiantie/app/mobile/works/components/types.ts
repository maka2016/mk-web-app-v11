import { WorksEntity2 } from '@/services/works2';

export interface WorksItem extends WorksEntity2 {
  spec_id: string;
  analytics: Array<{
    data: string;
    text: string;
    url: string;
  }>;
  isPurchased?: boolean;
  purchaseType?: 'valid' | 'invalid' | 'expired';
  isPublished?: boolean;
  publishedAt?: string;
  expiryDate?: string;
  bulletScreenTotal?: number;
  huiZhiTotal?: number;
  pintuanTotal?: number;
  MkBaoMingV2?: number;
  boostTotal?: number;
}
