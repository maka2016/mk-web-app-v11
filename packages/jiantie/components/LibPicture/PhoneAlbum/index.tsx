import { compressImg } from '@/utils/compressImg';
import appBridge from '@mk/app-bridge';
import { uploadFile } from '@mk/services';
import { getCookie } from '@mk/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import React from 'react';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';

interface Props {
  preUpload: boolean;
  onSelectItem: (url: string) => void;
  multiple: boolean;
  t: any;
}

interface State {
  photoList: Photo[];
  albumList: Album[];
  currentAlbum: Album;
  hasAlbumAuth: boolean;
  isShowAlbumList: boolean;
  start: number;
  loading: boolean;
  hasMore: boolean;
  filesSelection: string[];
  uploading: boolean;
}

interface Photo {
  image: string;
  assetId: string;
}

interface Album {
  name: string;
  albumId: string;
  count: string;
  image: string;
}

const pageSize = 40;

const messages: any = {
  en: {
    noAuthText1: 'Allow access to your photos to import images. ',
    noAuthText2: 'Go to device settings to enable permission.',
    openAuth: 'Open Settings',
    complete: 'Done',
    uploading: 'Uploading...',
  },
  'zh-CN': {
    noAuthText1: '需要访问您的系统相册，您才可以导入',
    noAuthText2: '自己的照片，请前往设置中开启权限。',
    openAuth: '开启权限',
    complete: '完成',
    uploading: '图片上传中...',
  },
};

function withTranslations<P>(
  WrappedComponent: React.ComponentType<P & { t: (key: string) => string }>
) {
  return function TranslatedComponent(props: P) {
    const locale = getCookie('NEXT_LOCALE') || 'zh-CN';
    const t = (key: string) => messages[locale][key];
    return <WrappedComponent {...props} t={t} />;
  };
}

class NativePhotoCollection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasAlbumAuth: false,
      start: 0,
      photoList: [],
      currentAlbum: {
        name: props.t('recentAlbum'),
        albumId: '',
        count: '',
        image: '',
      },
      albumList: [],
      isShowAlbumList: false,
      loading: false,
      hasMore: true,
      filesSelection: [],
      uploading: false,
    };
  }

  async componentDidMount() {
    await this.initAlbum();
  }

  async initAlbum() {
    const auth = await this.getAlbumAuth();
    if (auth) {
      this.getNativePhoto();
    }
  }

  /** 加载下一页相册图片 */
  onNextData = () => {
    const { hasMore, loading } = this.state;

    if (!hasMore || loading) {
      return;
    }
    this.setState(
      {
        start: this.state.start + pageSize,
        loading: true,
      },
      () => {
        appBridge.appCall(
          {
            type: 'MKPhotoList',
            params: {
              albumId: this.state.currentAlbum.albumId,
              start: String(this.state.start),
              limit: String(pageSize),
              width: '100',
            },
            jsCbFnName: 'appBridgeOnAppPhotoCb',
          },
          cbParams => {
            this.setState({
              photoList: this.state.photoList.concat(cbParams),
              loading: false,
              hasMore: cbParams?.length >= pageSize,
            });
          },
          60000
        );
      }
    );
  };

  // base64 -> Blob
  convertBase64ToBlob = (base64: string): Promise<Blob> => {
    return new Promise(resolve => {
      fetch(base64).then(res => {
        resolve(res.blob());
      });
    });
  };

  uploadAction = async (file: File, len = 1) => {
    const fileCompress = await compressImg(file);
    if (!fileCompress) {
      toast.error('不支持的图片格式');
      return;
    }

    try {
      const res = await uploadFile({
        file: fileCompress,
      });
      return res;
    } catch (error: any) {
      this.setState({
        uploading: false,
      });
      toast.error(error?.message || '请求超时，请重试');
    }
  };

  onChange = async (file: any, len = 1) => {
    if (this.props.preUpload) {
      const { onSelectItem } = this.props;
      this.uploadAction(file, len).then(res => {
        if (res) {
          toast.dismiss();
          onSelectItem(res?.url);
          this.setState({
            uploading: false,
          });
        }
      });
    } else {
      const fileCompress = await compressImg(file);
      if (!fileCompress) {
        toast.error('不支持的图片格式');
        return;
      }

      const { onSelectItem } = this.props;
      const url = URL.createObjectURL(file);
      onSelectItem(url);
      this.setState({
        uploading: false,
      });
    }
  };

  // 点击选中图片
  handleSelectPhoto = (assetId: string) => {
    const { uploading } = this.state;
    if (uploading) {
      return;
    }
    this.setState({
      uploading: true,
    });
    // if (this.props.preUpload) {
    // toast.loading(this.props.t('uploading'))
    // }
    const { filesSelection } = this.state;

    appBridge.appCall(
      {
        type: 'MKPhotoSelected',
        params: {
          albumId: this.state.currentAlbum.albumId,
          assetId,
        },
        jsCbFnName: 'appBridgeOnAppPicSelectCb',
      },
      cbParams => {
        const { originData } = cbParams;
        this.convertBase64ToBlob(originData).then(imgBlob => {
          this.onChange(imgBlob as File, filesSelection.length);
        });
      },
      60000
    );
  };

  onComplete = () => {
    const { filesSelection } = this.state;
    for (let i = 0; i < filesSelection.length; i++) {
      this.handleSelectPhoto(filesSelection[i]);
    }
  };

  /** 开启手机相册权限 */
  openAuth = () => {
    appBridge.appCall(
      {
        type: 'MKAlbumAuthSetting',
        params: {},
        jsCbFnName: 'appBridgeOnAppSetAuthCb',
      },
      cbParams => {
        if (cbParams?.authorized && cbParams?.authorized === '0') {
          this.setState({
            hasAlbumAuth: false,
          });
        } else if (cbParams?.authorized && cbParams?.authorized === '1') {
          this.getNativePhoto();
          this.setState({
            hasAlbumAuth: true,
          });
        }
      },
      60000
    );
  };

  /** 询问访问相册权限 */
  getAlbumAuth = () => {
    return new Promise(resolve => {
      appBridge
        .appCall(
          {
            type: 'MKAlbumAuthStatus',
            params: {},
            jsCbFnName: 'appBridgeOnAppAlbumStatusCb',
          },
          cbParams => {
            console.log('访问手机相册权限', cbParams);
            if (cbParams?.authorized && cbParams?.authorized === '0') {
              this.setState({
                hasAlbumAuth: false,
              });
              resolve(false);
            } else if (cbParams?.authorized && cbParams?.authorized === '1') {
              this.setState({
                hasAlbumAuth: true,
              });
              resolve(true);
            }
          },
          60000
        )
        .then(r => {
          if (r === false) {
            this.setState({
              hasAlbumAuth: false,
            });
          }
        });
    });
  };

  /** 获取相册和相册图片 */
  getNativePhoto = async () => {
    this.setState({
      loading: true,
    });
    let firstAlbum: Album = {
      name: '',
      albumId: '',
      count: '',
      image: '',
    };
    let albumList: Album[] = [];

    await appBridge.appCall(
      {
        type: 'MKAlbumList',
        params: {},
        jsCbFnName: 'appBridgeOnAppAlbumCb',
      },
      cbParams => {
        const [f] = cbParams;
        firstAlbum = f;
        albumList = cbParams;
      },
      60000
    );
    appBridge.appCall(
      {
        type: 'MKPhotoList',
        params: {
          albumId: firstAlbum.albumId,
          start: String(this.state.start),
          limit: String(pageSize),
          width: '100',
        },
        jsCbFnName: 'appBridgeOnAppPhotoCb',
      },
      cbParams => {
        this.setState({
          photoList: cbParams,
          currentAlbum: firstAlbum,
          albumList,
          loading: false,
          hasMore: cbParams?.length >= pageSize,
        });
      },
      60000
    );
  };

  /** 点击选中相册 */
  handleSelectAlbum = (albumObj: Album) => {
    this.setState(
      {
        start: 0,
        filesSelection: [],
      },
      () => {
        const { name, albumId } = albumObj;
        appBridge.appCall(
          {
            type: 'MKPhotoList',
            params: {
              albumId,
              start: String(this.state.start),
              limit: String(pageSize),
              width: '100',
            },
            jsCbFnName: 'appBridgeOnAppPhotoCb',
          },
          cbParams => {
            this.setState({
              photoList: cbParams,
              currentAlbum: albumObj,
              isShowAlbumList: false,
              start: 0,
              loading: false,
              hasMore: cbParams?.length >= pageSize,
            });
          },
          60000
        );
      }
    );
  };

  /** 切换显示相册列表 */
  toggleAlbumList = (isShow: boolean) => {
    this.setState({
      isShowAlbumList: isShow,
    });
  };

  // 拍照
  handleCallCamara = () => {
    appBridge.appCall(
      {
        type: 'MKCamera',
        params: {},
        jsCbFnName: 'appBridgeOnAppCameraCb',
      },
      cbParams => {
        if (!cbParams?.originData) {
          return;
        }
        const { originData } = cbParams;

        this.convertBase64ToBlob(originData).then(imgBlob => {
          this.onChange(imgBlob as File);
        });
      },
      300000
    );
  };

  onSelectFiles(id: string) {
    let { filesSelection } = this.state;

    if (filesSelection.includes(id)) {
      filesSelection = filesSelection.filter(item => item !== id);
    } else {
      filesSelection.push(id);
    }

    this.setState({ filesSelection });
  }

  renderListArea = () => {
    const { multiple } = this.props;
    const { photoList = [], filesSelection } = this.state;
    const hasCameraItem = photoList.find(item => item.image === 'camera');
    if (!hasCameraItem) {
      photoList.unshift({
        image: 'camera',
        assetId: '',
      });
    }
    return (
      <div className={styles.materialListContainer}>
        {photoList.map((obj, key) => {
          if (obj.assetId) {
            return (
              <div
                className={styles.itemContent}
                key={key}
                onClick={() => this.handleSelectPhoto(obj.assetId)}
              >
                {multiple && (
                  <div
                    className={`${styles.controlMask} ${filesSelection.includes(obj.assetId) && styles.check}`}
                    onClick={e => {
                      e.stopPropagation();
                      this.onSelectFiles(obj.assetId);
                    }}
                  >
                    <div className={styles.controlItemContent}>
                      <div className={styles.controlRadio}>
                        <div className={styles.checkBox}></div>
                      </div>
                    </div>
                  </div>
                )}
                <img
                  alt=''
                  loading='lazy'
                  src={obj.image}
                  className={styles.imgItem}
                ></img>
              </div>
            );
          } else {
            return (
              <div
                onClick={this.handleCallCamara}
                className={`${styles.itemContent} ${styles.btnAlbum}`}
                key={key}
              >
                <Icon name='camera' color='#fff' size={32} />
              </div>
            );
          }
        })}
      </div>
    );
  };

  renderAlbumList = () => {
    const { albumList } = this.state;
    return albumList.map((album, aIdx) => {
      return (
        <div
          className={styles.albumItem}
          key={aIdx}
          onClick={() => this.handleSelectAlbum(album)}
        >
          <img src={album.image} alt='error'></img>
          <div className={styles.albumName}>{album.name}</div>
          <div className={styles.albumCount}>({album.count})</div>
        </div>
      );
    });
  };

  renderNoAuth = () => {
    const { t } = this.props;
    return (
      <div className={styles.noAuthWrap}>
        <div className={styles.text}>
          <p>{t('noAuthText1')}</p>
          <p>{t('noAuthText2')}</p>
        </div>
        <div className={styles.btn} onClick={this.openAuth}>
          {t('openAuth')}
        </div>
      </div>
    );
  };

  renderContent = () => {
    const list = this.renderAlbumList();
    const { hasAlbumAuth, isShowAlbumList, loading, hasMore } = this.state;
    if (!hasAlbumAuth) {
      return this.renderNoAuth();
    }

    return (
      <div className={styles.phoneAlbumLib}>
        {isShowAlbumList ? (
          <InfiniteScroll
            initialLoad={false}
            pageStart={0}
            loadMore={() => {}}
            hasMore={false}
            useWindow={false}
            className={styles.phoneAlbumLib}
          >
            {list}
          </InfiniteScroll>
        ) : (
          <InfiniteScroll
            initialLoad={false}
            pageStart={0}
            loadMore={this.onNextData}
            hasMore={hasMore}
            useWindow={false}
          >
            {this.renderListArea()}
            {loading && <Loading className='flex justify-center' />}
          </InfiniteScroll>
        )}
      </div>
    );
  };

  render() {
    const {
      isShowAlbumList,
      currentAlbum,
      filesSelection,
      hasAlbumAuth,
      uploading,
    } = this.state;
    const { multiple, t } = this.props;

    return (
      <>
        <div className={styles.phoneAlbumContainer}>
          {this.renderContent()}
          {!isShowAlbumList && (
            <div className={styles.phoneAlbumFooter}>
              {hasAlbumAuth && (
                <>
                  <div
                    className={styles.entryWrap}
                    onClick={() => this.toggleAlbumList(true)}
                  >
                    <div className={styles.albumEntryBtn}>
                      <p>{currentAlbum.name}</p>
                      <Icon size={16} name='down' />
                    </div>
                  </div>
                  {multiple && (
                    <Button
                      className={styles.completeBtn}
                      size='lg'
                      onClick={() => this.onComplete()}
                    >{`${t('complete')}(${filesSelection.length})`}</Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {uploading && (
          <div
            className={styles.uploadLoading}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Loading size={30} />
          </div>
        )}
      </>
    );
  }
}

export default withTranslations(NativePhotoCollection);
