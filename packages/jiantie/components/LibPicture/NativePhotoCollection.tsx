import { uploadFile } from '@/services';
import appBridge from '@/store/app-bridge';
import { compressImg } from '@/utils/compressImg';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import React from 'react';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import { getCookie } from '../../utils';

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
      <div className='w-full grid grid-cols-4 gap-1 pb-[98px]'>
        {photoList.map((obj, key) => {
          if (obj.assetId) {
            return (
              <div
                className='flex-1 flex-shrink-0 relative rounded-sm flex items-center justify-center overflow-hidden aspect-square bg-[#f5f5f5]'
                key={key}
                onClick={() => this.handleSelectPhoto(obj.assetId)}
              >
                {multiple && (
                  <div
                    className={`absolute left-0 top-0 w-full h-full ${filesSelection.includes(obj.assetId) ? 'bg-black/40' : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      this.onSelectFiles(obj.assetId);
                    }}
                  >
                    <div className='flex w-full h-full relative'>
                      <div className='top-1 right-1 p-0.5 absolute'>
                        <div
                          className={`w-[18px] h-[18px] rounded-full relative ${filesSelection.includes(obj.assetId) ? 'border-none' : 'border-2 border-white bg-black/8'}`}
                          style={
                            filesSelection.includes(obj.assetId)
                              ? {
                                  backgroundImage:
                                    'url(https://img2.maka.im/assets/editor7/success_vector.svg)',
                                  backgroundSize: 'contain',
                                }
                              : undefined
                          }
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <img
                  alt=''
                  loading='lazy'
                  src={obj.image}
                  className='object-contain max-w-full w-full h-full'
                ></img>
              </div>
            );
          } else {
            return (
              <div
                onClick={this.handleCallCamara}
                className='flex-1 flex-shrink-0 relative rounded-sm flex items-center justify-center overflow-hidden aspect-square bg-[#1a87ff]'
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
          className='w-full h-14 flex text-sm mb-2 items-center flex-shrink-0 last:mb-0'
          key={aIdx}
          onClick={() => this.handleSelectAlbum(album)}
        >
          <img
            src={album.image}
            alt='error'
            className='w-14 h-14 flex-shrink-0 rounded-sm border border-black/20 object-cover'
          ></img>
          <div className='ml-2 text-[var(--text-normal-color)]'>
            {album.name}
          </div>
          <div className='w-[46px] flex items-center justify-center text-[var(--text-normal-color)]'>
            ({album.count})
          </div>
        </div>
      );
    });
  };

  renderNoAuth = () => {
    const { t } = this.props;
    return (
      <div className='my-10 mx-auto'>
        <div className='text-sm text-black/88 [&_p]:text-center'>
          <p>{t('noAuthText1')}</p>
          <p>{t('noAuthText2')}</p>
        </div>
        <div
          className='text-white h-10 w-[123px] text-sm leading-[38px] rounded-lg text-center mt-6 mx-auto bg-[#1a87ff] border border-white/10'
          onClick={this.openAuth}
        >
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
      <div className='relative flex-1 py-3 px-2 pb-4 overflow-y-auto'>
        {isShowAlbumList ? (
          <InfiniteScroll
            initialLoad={false}
            pageStart={0}
            loadMore={() => {}}
            hasMore={false}
            useWindow={false}
            className='relative flex-1 py-3 px-2 pb-4 overflow-y-auto'
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
        <div className='relative max-h-[60vh] overflow-hidden flex flex-col h-full'>
          {this.renderContent()}
          {!isShowAlbumList && (
            <div className='absolute bottom-0 left-0 right-0 h-[98px] flex items-center justify-center py-3 px-4 pb-[calc(var(--safe-area-inset-bottom))] pointer-events-none gap-1'>
              {hasAlbumAuth && (
                <>
                  <div
                    className='text-black/88 pointer-events-auto'
                    onClick={() => this.toggleAlbumList(true)}
                  >
                    <div className='w-[114px] h-10 leading-10 rounded-md flex items-center py-2 px-3 bg-[#f5f5f5]'>
                      <p className='w-16 overflow-hidden text-ellipsis whitespace-nowrap text-sm mr-[10px]'>
                        {currentAlbum.name}
                      </p>
                      <Icon size={16} name='down' />
                    </div>
                  </div>
                  {multiple && (
                    <Button
                      className='pointer-events-auto h-10'
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
            className='fixed top-0 right-0 bottom-0 left-0 z-10 bg-black/45 flex items-center justify-center [&_iconpark-icon]:text-white/80'
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
