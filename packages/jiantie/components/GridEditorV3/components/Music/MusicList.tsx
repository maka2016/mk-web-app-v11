import { BehaviorBox } from '@/components/BehaviorTracker';
import { cdnApi } from '@/services';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import cls from 'classnames';
import React from 'react';
import { useMusic } from './MusicProvider';
import styles from './index.module.scss';

interface MusicItem {
  id: string | number;
  name: string;
  url: {
    url: string;
  };
  cover?: {
    url: string;
  };
  documentId?: string;
}

interface MusicListProps {
  list: MusicItem[];
  onUseMusic?: (item: MusicItem) => void;
  showActionButton?: boolean;
  actionButtonText?: string;
  onActionClick?: (item: MusicItem) => void;
  className?: string;
}

const MusicList: React.FC<MusicListProps> = ({
  list,
  onUseMusic,
  showActionButton = true,
  actionButtonText = '应用',
  onActionClick,
  className,
}) => {
  const { togglePlay, isPlaying } = useMusic();

  const handleTogglePlay = async (url: string) => {
    await togglePlay(url);
  };

  const handleActionClick = (item: MusicItem) => {
    if (onActionClick) {
      onActionClick(item);
    } else if (onUseMusic) {
      onUseMusic(item);
    }
  };

  return (
    <div className={cls(styles.materialList, className)}>
      {list.map(item => (
        <BehaviorBox
          behavior={{
            object_type: 'template_click',
            object_id: `${item.id}`,
            parent_id: 'ai_works',
          }}
          key={item.id}
          className={cls([
            styles.templateItem,
            isPlaying(item.url.url) && styles.playing,
          ])}
          style={{
            // 确保播放状态样式生效
            ...(isPlaying(item.url.url) && {
              backgroundColor: 'rgba(0, 102, 204, 0.1) !important',
              outline: '1px solid #0066cc !important',
              color: '#0066cc !important',
            }),
          }}
          onClick={() => {
            handleTogglePlay(item.url.url);
          }}
        >
          <div className={styles.cover}>
            <div
              className={styles.mask}
              style={{
                ...(isPlaying(item.url.url) && {
                  backgroundColor: 'rgba(0, 102, 204, 0.8) !important',
                }),
              }}
            >
              <Icon
                name={isPlaying(item.url.url) ? 'pause' : 'play'}
                color='#fff'
              />
            </div>
            <img
              src={cdnApi(item?.cover?.url, {
                resizeWidth: 120,
              })}
              alt=''
            />
          </div>
          <div
            className={styles.name}
            style={{
              ...(isPlaying(item.url.url) && {
                color: '#0066cc !important',
                fontWeight: '500 !important',
              }),
            }}
          >
            {item.name}
          </div>
          {showActionButton && (
            <Button
              size='sm'
              onClick={e => {
                e.stopPropagation();
                handleActionClick(item);
              }}
            >
              {actionButtonText}
            </Button>
          )}
        </BehaviorBox>
      ))}
    </div>
  );
};

export default MusicList;
