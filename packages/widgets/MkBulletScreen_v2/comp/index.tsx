import React from 'react';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk/types';
import './index.scss';
import { createPortal } from 'react-dom';
import {
  request,
  formReceiverServiceApi,
  API,
  formEntityServiceApi,
  getUid,
  getPageId,
} from '@mk/services';
import StyledBullet from './BulletScreen/bullet';
import { MkBulletScreenProps, Bullet } from '../shared/types';
import { defaultBullets, originBoxInfo } from '../shared';
import i18nModule from '../shared/i18n';
import { EventEmitter, queryToObj } from '@mk/utils';

const defaultBulletList = [{ id: '1' }, { id: '2' }, { id: '3' }];
const pageSize = 20;

interface State {
  // 显示输入框
  showInput: boolean;
  // 输入弹幕内容
  inputVal: string;
  inputName: string;
  // 显示/隐藏弹幕
  // 弹幕数据
  bullets: Bullet[];
  // 上屏弹幕
  bulletList: Bullet[];
  queue: Bullet[];
  page: number;
  total: number;
  finished: boolean;
  loading: boolean;
  showGif: boolean;
  initialized: boolean;
}

const delayTime = 3000;

class MkBulletScreen extends React.Component<
  PlatformCompProps<MkBulletScreenProps>,
  State
> {
  scrollList = React.createRef<HTMLDivElement>();

  timer: any = null;

  private inputRef = React.createRef<HTMLTextAreaElement>();

  constructor(props: any) {
    super(props);
    this.state = {
      inputVal: '',
      inputName: '',
      showInput: false,
      bullets: [],
      bulletList: defaultBulletList,
      queue: [],
      page: 0,
      total: 0,
      finished: false,
      loading: false,
      showGif: false,
      initialized: false,
    };
  }

  get isTemplate() {
    const { viewerSDK } = this.props;
    if (!viewerSDK) {
      return false;
    }
    const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';
    return /^T_/.test(worksId);
  }

  initFormData = async () => {
    const { id, controledValues, editorSDK } = this.props;
    if (!editorSDK) {
      return;
    }

    if (controledValues.formRefId) {
      editorSDK?.changeCompAttr(id, {
        show:
          controledValues.show !== undefined
            ? controledValues.show
            : controledValues.showStyle !== 'none',
        showStyle:
          controledValues.showStyle !== 'none'
            ? controledValues.showStyle || 'vertical'
            : 'vertical',
      });
      return;
    }

    const res = await formEntityServiceApi.create({
      uid: +getUid(),
      works_id: getPageId(),
      type: 'MkBulletScreen_v2',
      content: {
        formName: '弹幕',
        fields: [
          {
            id: 'content',
            label: '弹幕内容',
          },
          {
            id: 'headImg',
            label: '微信头像',
          },
          {
            id: 'nickname',
            label: '微信昵称',
          },
        ],
      },
    });

    editorSDK?.changeCompAttr(id, {
      formRefId: res.data.formId,
      showStyle: 'vertical',
    });
  };

  initI18n = async () => {
    if (this.state.initialized) {
      return;
    }
    await i18nModule.init();
    this.setState({ initialized: true });
  };

  submitCallback = async (data: any) => {
    clearInterval(this.timer);
    const { bullets } = this.state;
    bullets.unshift({
      content: data.content,
      headImg: data.headImg,
      nickname: data.nickname,
    });
    this.pushBullet({
      isActive: true,
      ...data,
    });

    this.setState(
      {
        bullets,
        queue: this.state.queue.filter(item => item.content),
      },
      () => {
        this.initScreenBullet();
      }
    );
  };

  async componentDidMount() {
    const { lifecycle, controledValues, viewerSDK } = this.props;
    const { didLoaded, didMount } = lifecycle;

    EventEmitter.on('MkBulletScreen_v2_submit', this.submitCallback);

    this.initI18n();
    didMount?.({
      boxInfo: {
        height: originBoxInfo.height / 2,
        width: originBoxInfo.width / 2,
      },
      data: {
        ...controledValues,
        needWXAuth: true,
      },
    });
    didLoaded?.();

    // this.initFormData();
    this.renderBulletScreen();
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    EventEmitter.rm('MkBulletScreen_v2_submit', this.submitCallback);
  }

  renderBulletScreen = async () => {
    const { viewerSDK, controledValues } = this.props;
    if (viewerSDK) {
      await this.getFormData();
      this.initScreenBullet();
    }
  };

  getFormData = async () => {
    const { controledValues } = this.props;
    const { page, bullets, finished, queue, loading } = this.state;
    const { formRefId } = controledValues;
    if (this.isTemplate) {
      return;
    }
    if (!formRefId) {
      return;
    }

    if (loading) {
      return;
    }
    if (finished) {
      if (bullets.length) {
        queue.push(...[{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]);
        queue.push(...bullets);
        this.setState({
          queue,
        });
      }
      return;
    }
    this.setState({ loading: true });
    const res = await formReceiverServiceApi.getFormList(formRefId, {
      params: {
        page,
        limit: pageSize,
        order: 'desc',
      },
    });
    this.setState({ loading: false });

    // 获取表单key

    if (res?.data?.rows?.length) {
      const list: Bullet[] = [];
      res.data.rows.forEach((item: any) => {
        list.push({
          content: item.content,
          headImg: item.headImg,
          nickname: item.nickname,
        });
      });
      queue.push(...list);
      this.setState({
        bullets: page === 0 ? list : bullets.concat(list),
        queue,
        total: res.data.total,
        page: page + 1,
        finished: list.length < pageSize,
      });
    }
  };

  initScreenBullet = () => {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const { queue } = this.state;

    if (!queue.length) {
      clearInterval(this.timer);
      return;
    }

    this.timer = setInterval(async () => {
      const cur = queue.shift();
      if (cur) {
        this.pushBullet(cur);
      }

      this.setState({ queue });
      if (queue.length <= 0) {
        await this.getFormData();
      }
    }, delayTime);
  };

  pushBullet = (cur: Bullet) => {
    const { bulletList } = this.state;

    // 只有最新发送的高亮
    if (cur?.isActive) {
      bulletList.forEach(item => (item.isActive = false));
    }
    const id = Math.random().toString(36).substring(2);
    bulletList.push({ id, ...cur });
    this.setState({
      bulletList,
    });

    this.pageScroll();
  };

  pageScroll() {
    if (!this.scrollList.current) {
      return;
    }
    const interval = setInterval(() => {
      if (!this.scrollList.current) {
        return;
      }
      if (
        this.scrollList.current.scrollTop +
          this.scrollList.current.clientHeight ===
        this.scrollList.current.scrollHeight
      ) {
        clearInterval(interval);
        const { bulletList } = this.state;
        if (bulletList.length > 4) {
          bulletList.shift();
        }
        this.setState({
          bulletList,
        });
      } else {
        this.scrollList.current.scrollTop += 6;
      }
    }, 60);
  }

  render() {
    const { viewerSDK, controledValues, id } = this.props;
    const { bulletList } = this.state;
    const { show } = controledValues;
    if (show === false) return <></>;

    if (!viewerSDK) {
      return <></>;
    }

    return (
      <>
        {createPortal(
          <div
            id='bullet-screen-portal'
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              bottom: 0,
              right: 0,
              zIndex: '31',
              overflow: 'hidden',
              pointerEvents: 'none', // Allow clicking through the container
            }}
          >
            {viewerSDK && (
              <div className={`bullet_v2_scroll_view`}>
                <div className='bullet_comment_wrap' ref={this.scrollList}>
                  {bulletList.map(item => (
                    <StyledBullet
                      key={item.id}
                      className={`comment_bullet_item`}
                      name={item.nickname}
                      content={item.content}
                      head={item.headImg}
                      isActive={item.isActive}
                      color={controledValues.bulletColor}
                    ></StyledBullet>
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      </>
    );
  }
}

export default MkBulletScreen;
