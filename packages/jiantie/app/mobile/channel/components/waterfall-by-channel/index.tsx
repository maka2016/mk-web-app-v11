import { BehaviorBox } from '@/components/BehaviorTracker';
import { cdnApi, getCmsApiHost, getUid, requestCMS } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import { useTranslations } from 'next-intl';
import qs from 'qs';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import TemplateCard, { Template } from '../template-card';
import styles from './index.module.scss';

interface Facets {
  alias: string;
  displayName: string;
  choices: Array<{
    name: string;
    count: string;
  }>;
}
interface Channel {
  documentId: string;
  id: number;

  name: string;
  filters: any;

  icon?: {
    url: string;
  };
  children: Channel[];
}

interface Props {
  channel?: Channel;
  fixed?: boolean;
  appid: string;
}

interface SelectedChoices {
  [key: string]: string[];
}

const limit = 8;

const WaterfallFloor2 = (props: Props) => {
  const { channel, fixed, appid } = props;
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [xsTemplateDocIdsArr, setXsTemplateDocIdsArr] = useState<string[]>([]);
  const [filterShow, setFilterShow] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<SelectedChoices>({});
  const [applyFilters, setApplyFilters] = useState<SelectedChoices>({});
  const [empty, setEmpty] = useState(false);
  const [secondLevelId, setSecondLevelId] = useState<string>();
  const [threeLevelId, setThreeLevelId] = useState<string>();
  const [activeChannel, setActiveChannel] = useState<Channel>();
  const t = useTranslations('HomePage');

  const getSortOrder = () => {
    const uid = getUid();
    if (!uid) {
      return ['sort_score:desc'];
    }
    const lastDigit = parseInt(uid.slice(-1));

    return lastDigit >= 0 && lastDigit <= 4
      ? ['sort_score:desc']
      : ['scrore_ab:desc'];
  };

  useEffect(() => {
    if (channel?.children?.length) {
      // Filter online children and sort by sort field in ascending order
      const onlineChildren = channel.children.filter(
        (child: any) => child.online === true
      );
      if (onlineChildren.length > 0) {
        const sortedChildren = [...onlineChildren].sort(
          (a: any, b: any) => (a.sort || 0) - (b.sort || 0)
        );
        setSecondLevelId(sortedChildren[0].documentId);
        if (sortedChildren[0].children?.length) {
          // Filter and sort third level children too
          const onlineThirdLevel = sortedChildren[0].children.filter(
            (child: any) => child.online === true
          );
          if (onlineThirdLevel.length > 0) {
            const sortedThirdLevel = [...onlineThirdLevel].sort(
              (a: any, b: any) => (a.sort || 0) - (b.sort || 0)
            );
            setThreeLevelId(sortedThirdLevel[0].documentId);
            setActiveChannel(sortedThirdLevel[0]);
          } else {
            setActiveChannel(sortedChildren[0]);
          }
        } else {
          setActiveChannel(sortedChildren[0]);
        }
      }
    }
  }, [channel]);

  const getFloorTemplates = async () => {
    if (!activeChannel) return;

    //新手保护模版
    let newTemplateDocIdsArr = [];
    let xsTemplates = [];
    if (page === 1) {
      xsTemplates = await getNewProtectTemplates(activeChannel.name, 2);
      newTemplateDocIdsArr = xsTemplates.map((item: any) => item.documentId);
      setXsTemplateDocIdsArr(newTemplateDocIdsArr);
    } else if (xsTemplateDocIdsArr.length > 0) {
      newTemplateDocIdsArr = xsTemplateDocIdsArr;
    }

    // Build filter conditions from selected choices
    const filterConditions = Object.entries(applyFilters).map(
      ([alias, choices]) => ({
        tags: {
          name: {
            $in: choices,
          },
          alias,
        },
      })
    );

    console.log(
      'activeChannel?.filter?.default?.$and',
      activeChannel?.filters?.default?.$and
    );

    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
        },
        filters: {
          $and: [
            ...(activeChannel?.filters?.default?.$and || []),
            ...filterConditions,
          ],
          $or: [
            {
              offline: {
                $ne: true,
              },
            },
            {
              offline: {
                $null: true,
              },
            },
          ],
          documentId: {
            $notIn: newTemplateDocIdsArr,
          },
        },
        pagination: {
          pageSize: limit,
          page,
        },
        sort: getSortOrder(),
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/template-items?${query}`)
    ).data.data;

    if (promptGroupRes.length > 0) {
      setTemplates(
        page === 1
          ? [...xsTemplates, ...promptGroupRes]
          : [...templates, ...promptGroupRes]
      );
      setFinished(promptGroupRes.length < limit);
      setLoading(false);
      setEmpty(false);
    } else if (xsTemplates.length > 0) {
      setTemplates(xsTemplates);
      setLoading(false);
      setEmpty(false);
      setFinished(true);
    } else if (page === 1 && filterConditions.length > 0) {
      setEmpty(true);
      const reducedFilterConditions = filterConditions.slice(0, 1);
      const retryQuery = qs.stringify(
        {
          populate: {
            cover: {
              populate: '*',
            },
          },
          filters: {
            $and: [
              ...(activeChannel?.filters?.default?.$and || []),
              ...reducedFilterConditions,
            ],
            $or: [
              {
                offline: {
                  $ne: true,
                },
              },
              {
                offline: {
                  $null: true,
                },
              },
            ],
            documentId: {
              $notIn: newTemplateDocIdsArr,
            },
          },
          pagination: {
            pageSize: limit,
            page,
          },
          sort: getSortOrder(),
        },
        { encodeValuesOnly: true }
      );

      const retryRes = (
        await requestCMS.get(
          `${getCmsApiHost()}/api/template-items?${retryQuery}`
        )
      ).data.data;

      if (retryRes.length > 0) {
        setTemplates([...xsTemplates, ...retryRes]);
        setFinished(retryRes.length < limit);
      } else {
        setFinished(true);
      }
      setLoading(false);
    } else {
      setFinished(true);
      setLoading(false);
    }
  };

  //新手推荐位置3个
  const getNewProtectTemplates = async (searchWord: any, TNum = 2) => {
    const filterConditions = Object.entries(selectedChoices).map(
      ([alias, choices]) => ({
        tags: {
          name: {
            $in: choices,
          },
          alias,
        },
      })
    );

    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
        },
        filters: {
          $and: [
            ...(activeChannel?.filters?.default?.$and || []),
            ...filterConditions,
          ],
          $or: [
            {
              offline: {
                $ne: true,
              },
            },
            {
              offline: {
                $null: true,
              },
            },
          ],
          name: {
            $contains: searchWord,
          },
          is_new: {
            $eq: 1,
          },
        },
        pagination: {
          pageSize: 30,
          page,
        },
        sort: getSortOrder(),
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/template-items?${query}`)
    ).data.data;
    //随机挑三个
    if (promptGroupRes.length > 0) {
      const new3TemplatesArr = promptGroupRes
        .sort(() => Math.random() - 0.5)
        .slice(0, TNum);
      return new3TemplatesArr;
    }
    return [];
  };

  useEffect(() => {
    if (activeChannel) {
      getFloorTemplates();
    }
  }, [activeChannel, page, applyFilters]);

  const loadMore = () => {
    if (loading || finished) return;
    setLoading(true);
    setPage(page + 1);
  };

  const onChangeSecondLevelChannel = (id: string) => {
    setSecondLevelId(id);

    const currentChannel = channel?.children.find(
      item => item.documentId === id
    );
    if (
      currentChannel?.children?.length &&
      currentChannel?.children?.length > 0
    ) {
      setThreeLevelId(currentChannel.children[0].documentId);
      setActiveChannel(currentChannel.children[0]);
    } else {
      setActiveChannel(currentChannel);
      setThreeLevelId('');
    }

    setPage(1);
    setTemplates([]);
    setLoading(true);
    setFinished(false);
    setEmpty(false);
    setApplyFilters({});
    setSelectedChoices({});
    const scrollDom = document.querySelector('#home-scroll-container');
    if (scrollDom) {
      scrollDom.scrollTo({
        top: 0,
      });
    }
  };

  const onChangeThreeLevelChannel = (id: string) => {
    setThreeLevelId(id);
    const secondChannel = channel?.children.find(
      item => item.documentId === secondLevelId
    );
    if (secondChannel) {
      setActiveChannel(
        secondChannel.children.find(item => item.documentId === id)
      );
    }
  };

  const onChangeFilterId = (id: string) => {
    setPage(1);
    setTemplates([]);
    setLoading(true);
    setFinished(false);
    setEmpty(false);
    setApplyFilters({});
    setSelectedChoices({});
    const scrollDom = document.querySelector('#home-scroll-container');
    if (scrollDom) {
      scrollDom.scrollTo({
        top: 0,
      });
    }
  };

  const handleChoiceSelect = (alias: string, choiceName: string) => {
    setSelectedChoices(prev => {
      const currentChoices = prev[alias] || [];
      const newChoices = currentChoices.includes(choiceName)
        ? currentChoices.filter(name => name !== choiceName)
        : [...currentChoices, choiceName];

      return {
        ...prev,
        [alias]: newChoices,
      };
    });
  };

  const handleClearFilters = () => {
    setSelectedChoices({});
    // setPage(1)
    // setTemplates([])
    // setLoading(true)
    // setFinished(false)
    // setApplyFilters({})
  };

  const handleApplyFilters = () => {
    setFilterShow(false);
    setPage(1);
    setTemplates([]);
    setLoading(true);
    setFinished(false);
    setEmpty(false);
    setApplyFilters(selectedChoices);
    const scrollDom = document.querySelector('#home-scroll-container');
    if (scrollDom && scrollDom.scrollTop > 88) {
      scrollDom.scrollTo({
        top: 88,
      });
    }
  };

  const renderTags = () => {
    if (!channel?.children || channel?.children.length <= 1) {
      return <></>;
    }
    return (
      <div className={cls([styles.secondLevelChannel])}>
        {[...channel.children]
          .filter((item: any) => item.online === true)
          .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
          .map(item => (
            <div
              key={item.id}
              className={cls([
                styles.tag,
                item.documentId === secondLevelId && styles.active,
              ])}
              onClick={() => onChangeSecondLevelChannel(item.documentId)}
            >
              {item.name}
            </div>
          ))}
      </div>
    );
  };

  const renderSecondTags = () => {
    const secondChannel = channel?.children.find(
      item => item.documentId === secondLevelId
    );

    if (!secondChannel?.children || secondChannel.children?.length <= 1) {
      return <></>;
    }
    return (
      <div className={cls([styles.threeLevelChannel])}>
        {[...secondChannel.children]
          .filter((item: any) => item.online === true)
          .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
          .map(item => (
            <div
              key={item.id}
              className={cls([
                styles.tag,
                item.documentId === threeLevelId && styles.active,
              ])}
              onClick={() => onChangeThreeLevelChannel(item.documentId)}
            >
              {item.name}
            </div>
          ))}
      </div>
    );
  };

  const countTotalSubItems = (data: SelectedChoices) => {
    let total = 0;
    for (const key in data) {
      if (Array.isArray(data[key])) {
        total += data[key].length;
      }
    }
    return total;
  };

  return (
    <div className='flex flex-col flex-1  bg-white relative rounded-t-xl'>
      <div
        className={cls([
          styles.channelContainer,
          fixed && styles.stickyTags,
          styles[appid],
        ])}
      >
        {renderTags()}
        {renderSecondTags()}
      </div>

      <div className={cls(styles.waterfall, 'flex-1')}>
        {empty && (
          <div className={styles.empty}>
            <img src={cdnApi('/cdn/webstore10/common/empty.png')} alt='' />
            <span>{t('noFilterResults')}</span>
            <div className={styles.recommend}>
              <div className={styles.line}></div>
              <span>{t('recommend')}</span>
              <div className={styles.line}></div>
            </div>
          </div>
        )}

        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          useWindow={false}
          getScrollParent={() =>
            document.querySelector('#home-scroll-container')
          }
          loadMore={loadMore}
          hasMore={!finished}
        >
          <div className={styles.templates}>
            {templates.map(item => (
              <TemplateCard template={item} key={item.template_id} />
            ))}
          </div>
        </InfiniteScroll>
        {loading && (
          <div className='p-2 flex items-center justify-center'>
            <Loading />
          </div>
        )}
      </div>
      {!!activeChannel?.filters?.facets?.length && (
        <BehaviorBox
          behavior={{
            object_type: 'filter_btn',
          }}
          className={cls([
            styles.filter,
            countTotalSubItems(applyFilters) > 0 && styles.active,
          ])}
          onClick={() => setFilterShow(true)}
        >
          <Icon name='hamberger-button' size={18} />
          <span>{t('filters')}</span>
          {countTotalSubItems(applyFilters) > 0 && (
            <div className={styles.count}>
              {countTotalSubItems(applyFilters)}
            </div>
          )}
        </BehaviorBox>
      )}
      <ResponsiveDialog
        isOpen={filterShow}
        onOpenChange={value => {
          setFilterShow(value);
          if (value) {
            setSelectedChoices(applyFilters);
          }
        }}
      >
        <div className={styles.filterPanel}>
          <div className={styles.title}>{t('allFilters')}</div>
          <Icon
            name='close'
            size={22}
            className={styles.close}
            onClick={() => {
              setFilterShow(false);
              setSelectedChoices(applyFilters);
            }}
          />
          {activeChannel?.filters?.facets?.map((item: any) => {
            return (
              <div key={item.alias} className={styles.facets}>
                <div className={styles.label}>{item.displayName}</div>
                <div className={styles.choices}>
                  {item.choices.map((choice: any) => (
                    <BehaviorBox
                      behavior={{
                        object_type: 'filter_choice_btn',
                        object_id: choice.name,
                      }}
                      key={choice.name}
                      className={cls(styles.choiceItem, styles[appid], {
                        [styles.active]: selectedChoices[item.alias]?.includes(
                          choice.name
                        ),
                      })}
                      onClick={() =>
                        handleChoiceSelect(item.alias, choice.name)
                      }
                    >
                      {choice.name}
                    </BehaviorBox>
                  ))}
                </div>
              </div>
            );
          })}
          <div className='flex items-center gap-2 p-4'>
            <BehaviorBox
              className='flex-1 flex-shrink-0'
              behavior={{
                object_type: 'filter_cancel_btn',
              }}
            >
              <Button
                size='lg'
                variant='outline'
                className='w-full'
                onClick={handleClearFilters}
              >
                {t('clearSelection')}
              </Button>
            </BehaviorBox>

            <BehaviorBox
              className='flex-1 flex-shrink-0'
              behavior={{
                object_type: 'filter_confirm_btn',
              }}
            >
              <Button size='lg' className='w-full' onClick={handleApplyFilters}>
                {t('confirm')}
              </Button>
            </BehaviorBox>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default WaterfallFloor2;
