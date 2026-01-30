import { BehaviorBox } from '@/components/BehaviorTracker';
import { hexToRgba } from '@/utils';
import { cn } from '@workspace/ui/lib/utils';
import { CSSProperties } from 'react';

export interface HotWordMeta {
  trackInstId: string;
  hot_word: string;
  filter_name: string;
  filter_id: number;
  id: string;
  show_title?: boolean;
}

export interface HotWord {
  hot_word_tag: string;
  id: number;
  hot_word_meta: HotWordMeta[];
  trackInstId: string;
  hot_word_tag_title: string;
  hot_word_tag_desc: string;
  hot_word_tag_bg_url: string;
}

interface Props {
  className?: string;
  hotWord: HotWord;
  filterId: number;
  track: any;
  type?: string;
  style?: CSSProperties;
  onChangeFilterId: (id: number) => void;
  color?: string;
}

const HotwordMetaTab = (props: Props) => {
  const {
    hotWord,
    filterId,
    track,
    className,
    type,
    style,
    onChangeFilterId,
    color,
  } = props;
  return (
    <div
      className={cn(['bg-white py-2 overflow-hidden', className, type && type])}
      style={style}
    >
      <div className='flex items-center overflow-x-auto overflow-y-hidden gap-2'>
        {hotWord.hot_word_meta.map((item, index) => {
          const isActive = filterId === item.filter_id;
          return (
            <BehaviorBox
              behavior={{
                object_type: 'hotword_floor_word_btn',
                object_id: `${item.id}`,
                object_inst_id: `${item.trackInstId}`,
                object_order: `${index}`,
                parent_type: 'hotword_floor_nav_btn',
                parent_id: `${hotWord.id}`,
                parent_inst_id: hotWord.trackInstId,
                // @ts-ignore
                word_cn: item.hot_word,
                ...track,
                // page_id: floorAlias,
                // page_type: floorAlias,
                // page_inst_id: siteName,
              }}
              key={index}
              className={cn([
                'relative shrink-0 text-[rgba(0,0,0,0.8)] py-1 px-2 text-sm leading-5 border border-[#0000000f] rounded-full font-semibold',
                isActive && 'pointer-events-none',
              ])}
              style={{
                color: isActive ? props.color : 'rgba(0, 0, 0, 0.88)',
                borderColor: isActive ? props.color : '#0000000F',
                backgroundColor: isActive
                  ? hexToRgba(props.color || '#fff', 0.1)
                  : '#fff',
              }}
              onClick={() => onChangeFilterId(item.filter_id)}
            >
              {item.hot_word}
            </BehaviorBox>
          );
        })}
      </div>
    </div>
  );
};

export default HotwordMetaTab;
