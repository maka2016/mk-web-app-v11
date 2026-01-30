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

interface MusicListItemProps {
  item: MusicItem;
  onUseMusic?: (item: MusicItem) => void;
  showActionButton?: boolean;
  actionButtonText?: string;
  onActionClick?: (item: MusicItem) => void;
  className?: string;
  onClick?: (item: MusicItem) => void;
}

const MusicListItem: React.FC<MusicListItemProps> = ({
  item,
  onUseMusic,
  showActionButton = true,
  actionButtonText = '应用',
  onActionClick,
  className,
  onClick,
}) => {
  const { togglePlay, isPlaying } = useMusic();

  const handleTogglePlay = async (url: string) => {
    await togglePlay(url);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onActionClick) {
      onActionClick(item);
    } else if (onUseMusic) {
      onUseMusic(item);
    }
  };

  const handleItemClick = () => {
    if (onClick) {
      onClick(item);
    } else {
      handleTogglePlay(item.url.url);
    }
  };

  return (
    <BehaviorBox
      behavior={{
        object_type: 'template_click',
        object_id: `${item.id}`,
        parent_id: 'ai_works',
      }}
      className={cls([
        styles.templateItem,
        isPlaying(item.url.url) && styles.playing,
        className,
      ])}
      style={{
        // 确保播放状态样式生效
        ...(isPlaying(item.url.url) && {
          backgroundColor: 'rgba(0, 102, 204, 0.1) !important',
          outline: '1px solid #0066cc !important',
          color: '#0066cc !important',
        }),
      }}
      onClick={handleItemClick}
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
        <Button size='sm' onClick={handleActionClick}>
          {actionButtonText}
        </Button>
      )}
    </BehaviorBox>
  );
};

export default MusicListItem;
