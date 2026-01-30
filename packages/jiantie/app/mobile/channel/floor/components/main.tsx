'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import {
  cdnApi,
  getAppId,
  getCmsApiHost,
  getTopTemplates,
  getUid,
  requestCMS,
} from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import { useTranslations } from 'next-intl';
import qs from 'qs';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import TemplateCard, { Template } from '../../components/template-card';
import styles from './index.module.scss';

interface Props {
  channelId: string;
  tagId?: string;
}

interface Channel {
  documentId: string;
  id: number;

  name: string;
  filters: any;

  icon?: {
    url: string;
  };
  children?: Channel[];
}

interface SelectedChoices {
  [key: string]: string[];
}

const limit = 24;

const WaterfallFloor2 = (props: Props) => {
  const { channelId } = props;
  const [channel, setChannel] = useState<Channel>();
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [xsTemplateDocIdsArr, setXsTemplateDocIdsArr] = useState<string[]>([]);
  const [filterShow, setFilterShow] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<SelectedChoices>({});
  const [applyFilters, setApplyFilters] = useState<SelectedChoices>({});
  const [empty, setEmpty] = useState(false);
  const [tagId, setTagId] = useState<string>();
  const [activeChannel, setActiveChannel] = useState<Channel>();
  const t = useTranslations('HomePage');
  const appid = getAppId();

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

  const getStoreChannelV1 = async () => {
    const query = qs.stringify(
      {
        populate: {
          children: {
            populate: '*',
            fields: [
              'name',
              'id',
              'documentId',
              'type',
              'online',
              'filters',
              'config',
              'sort',
            ],
            filters: {
              online: {
                $eq: true,
              },
            },
          },
          icon: {
            fields: ['url'],
          },
        },
        fields: ['name', 'id', 'documentId', 'type', 'sort'],

        filters: {
          documentId: {
            $eq: channelId,
          },
        },

        pagination: {
          pageSize: 1000,
          page: 1,
        },
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/store-channel-v1s?${query}`)
    ).data.data;

    if (promptGroupRes.length > 0) {
      const channelData = promptGroupRes[0];
      // Filter online children and sort by sort field in ascending order
      if (channelData.children && channelData.children.length > 0) {
        // Filter online children first
        channelData.children = channelData.children.filter(
          (child: any) => child.online === true
        );
        if (channelData.children.length > 0) {
          channelData.children.sort(
            (a: any, b: any) => (a.sort || 0) - (b.sort || 0)
          );
        }
      }
      setChannel(channelData);
    }
  };

  useEffect(() => {
    getStoreChannelV1();
  }, [channelId]);

  useEffect(() => {
    if (channel?.children?.length) {
      if (props.tagId) {
        const channelItem = channel?.children?.find(
          item => item.documentId === props.tagId
        );
        setTagId(props.tagId);
        setActiveChannel(channelItem);
      } else {
        setTagId(channel.children[0].documentId);
        setActiveChannel(channel.children[0]);
      }
    } else {
      setTagId(channel?.documentId);
      setActiveChannel(channel);
    }
  }, [channel]);

  const getFloorTemplates = async () => {
    if (!activeChannel) return;

    //新手保护模版
    let newTemplateDocIdsArr = [];
    let topTemplateDocIdsArr = [];
    let xsTemplates = [];
    let topTemplates = [];

    let topAndXsTemplates: any = [];
    let topAndXsTemplatesIdArr = [];

    if (page === 1) {
      topTemplates = await getTopTemplates(activeChannel);
      xsTemplates = await getNewProtectTemplates(activeChannel.name, 3);
      newTemplateDocIdsArr = xsTemplates.map((item: any) => item.documentId);
      topTemplateDocIdsArr = topTemplates.map((item: any) => item.documentId);

      topAndXsTemplates = topTemplates.concat(xsTemplates);

      topAndXsTemplates = Array.from(
        new Map(topAndXsTemplates.map((item: any) => [item.id, item])).values()
      );

      topAndXsTemplatesIdArr = topAndXsTemplates.map(
        (item: any) => item.documentId
      );

      setXsTemplateDocIdsArr(topTemplateDocIdsArr.concat(newTemplateDocIdsArr));
    } else if (xsTemplateDocIdsArr.length > 0) {
      topAndXsTemplatesIdArr = xsTemplateDocIdsArr;
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

    // console.log("newTemplateDocIdsArr", newTemplateDocIdsArr);

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
            $notIn: topAndXsTemplatesIdArr,
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
          ? [...topAndXsTemplates, ...promptGroupRes]
          : [...templates, ...promptGroupRes]
      );
      setFinished(promptGroupRes.length < limit);
      setLoading(false);
      setEmpty(false);
    } else if (topAndXsTemplates.length > 0) {
      setTemplates(topAndXsTemplates);
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
  const getNewProtectTemplates = async (searchWord: any, TNum = 3) => {
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

  const onChangeThreeLevelChannel = (id: string) => {
    setTagId(id);
    setPage(1);
    setFinished(false);
    setLoading(true);

    setTemplates([]);
    setActiveChannel(channel?.children?.find(item => item.documentId === id));
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
    if (!channel?.children || channel.children?.length <= 1) {
      return <></>;
    }
    return (
      <div className={cls([styles.floorTags])}>
        {channel?.children?.map(item => (
          <div
            key={item.id}
            className={cls([
              styles.tag,
              item.documentId === tagId && styles.active,
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
    <div className={styles.container}>
      <MobileHeader className='flex-shrink-0' title={channel?.name || '频道'} />
      <div className='flex flex-col flex-1  bg-white pt-3 px-3 overflow-hidden'>
        {renderTags()}
        <div className={styles.waterfall}>
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
            // getScrollParent={() =>
            //   document.querySelector("#floor-scroll-container")
            // }
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
                          [styles.active]: selectedChoices[
                            item.alias
                          ]?.includes(choice.name),
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
                <Button
                  size='lg'
                  className='w-full'
                  onClick={handleApplyFilters}
                >
                  {t('confirm')}
                </Button>
              </BehaviorBox>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </div>
  );
};

export default WaterfallFloor2;
