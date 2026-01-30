import { getAppId } from '@/services';
import APPBridge from '@/store/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { useEffect, useRef, useState } from 'react';
import { getTemplatesByFilterId } from '../../api/channel';
import HotwordMetaTab, { HotWord } from '../HotwordMetaTab';
import TemplateCard, { TemplateCardData } from '../TemplateCard';
import styles from './index.module.scss';
interface Props {
  floorId: number;
  hotword: HotWord;
  site?: any;
  tabType?: string;
  padding?: number;
  color: string;
}

const PAGE_SIZE = 6;

const TemplateFlatFloor = (props: Props) => {
  const { hotword, floorId, site, padding = 12, tabType } = props;
  const [filterId, setFilterId] = useState(hotword.hot_word_meta[0].filter_id);
  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [columnWidth, setColumnWidth] = useState(117);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<any>(null);
  const showBottomMore = tabType === 'preschool';

  const _calculateColumnCount = () => {
    const width = document.body.clientWidth;
    setColumnWidth(Math.floor((width - 2 * padding - 16) / 3));
  };

  useEffect(() => {
    _calculateColumnCount();
  }, []);

  useEffect(() => {

    /**
     * 热词楼层模版
     */
    const getTemplates = async () => {
      setLoading(true);

      const res = await getTemplatesByFilterId(floorId, filterId, {
        p: 1,
        n: PAGE_SIZE,
        with_top_template: 1,
      });

      if (res?.data?.rows) {
        const templateList = res.data.rows.filter(
          (item: TemplateCardData) => item.template_id
        );
        setTemplates(templateList);
        setLoading(false);
        scrollRef.current.scrollTo({
          left: 0,
        });
      }
    };
    getTemplates();
  }, [filterId]);

  const onChangeFilterId = (id: number) => {
    setFilterId(id);
  };

  const toTopic = (item: HotWord, word: string) => {
    const url = `/maka/mobile/channel/topic?parent_page_type=${site?.click_content}&ref_page_id=${item.hot_word_tag
      }&hotword_floor_word_btn=${word}&id=${item.id}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      window.location.assign(url + `&appid=${getAppId()}`);
    }
  };

  const renderLoading = () => {
    if (!templates.length) {
      return null;
    }

    const meta = hotword.hot_word_meta.find(
      item => item.filter_id === filterId
    );

    return (
      <div className={styles.bottomMore}>
        <span onClick={() => toTopic(hotword, meta?.hot_word || '')}>
          更多【{meta?.hot_word}】{'>'}
        </span>
      </div>
    );
  };
  const meta = hotword.hot_word_meta.find(item => item.filter_id === filterId);
  return (
    <div
      className={styles.templateFloor}
      id={`gallery_floor_${hotword.id}`}
      style={{
        paddingLeft: padding,
        paddingRight: padding,
      }}
    >
      <div className={styles.floorTitle}>
        <div className={styles.title}>
          {hotword.hot_word_tag_title || hotword.hot_word_tag}
        </div>

        {!showBottomMore && (
          <div className={styles.more}>
            <span onClick={() => toTopic(hotword, meta?.hot_word || '')}>
              查看更多{' '}
            </span>
            <Icon name='right-bold' size={20} />
          </div>
        )}
      </div>
      {hotword.hot_word_meta?.length > 1 && (
        <HotwordMetaTab
          hotWord={hotword}
          filterId={filterId}
          onChangeFilterId={onChangeFilterId}
          track={site}
          type={tabType}
          style={{
            paddingTop: 0,
          }}
        />
      )}

      <div className={styles.templateList}>
        <div className={styles.scrollList} ref={scrollRef}>
          {templates.map(item => (
            <div key={item.template_id} className={styles.templateItem}>
              <TemplateCard
                key={item.template_id}
                objectFit={
                  item.height > templates[0].width / 2 ? 'contain' : 'cover'
                }
                template={{
                  ...item,
                  width: templates[0].width,
                  height: Math.max(templates[0].height, templates[0].width / 2),
                }}
                columnWidth={columnWidth}
              />
            </div>
          ))}
          {showBottomMore && renderLoading()}
        </div>

        {loading && (
          <div className={styles.loading}>
            <Loading />
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateFlatFloor;
