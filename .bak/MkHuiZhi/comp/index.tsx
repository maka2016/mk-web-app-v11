'use client';
import { useViewerSDK } from '@/components/GridViewer/utils/ViewerSDKContext';
import { formReceiverServiceApi } from '@/services';
import { getCookie, setCookieExpire } from '@/utils';
import { PlatformCompProps } from '@/widgets';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MkHuiZhiProps } from '../shared/types';
import styles from './index.module.scss';

function onceSubmitCookiesKey(formID: string) {
  return `${formID}_submited`;
}

const HuizhiComp = (props: PlatformCompProps<MkHuiZhiProps>) => {
  const { controledValues } = props;
  const viewerSDK = useViewerSDK();
  const { customFields = [] } = controledValues;
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    guestCount: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [overOnceSubmit, setOverOnceSubmit] = useState(false);

  useEffect(() => {
    if (
      viewerSDK &&
      getCookie(onceSubmitCookiesKey(controledValues.formRefId))
    ) {
      setOverOnceSubmit(true);
    }
  }, [viewerSDK, controledValues.formRefId]);

  const onSubmit = async () => {
    if (!viewerSDK) {
      return;
    }

    const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';
    // 模板不允许提交
    if (/^T_/.test(worksId)) {
      toast('请分享后使用此功能');
      return;
    }

    if (submitting) {
      return;
    }

    // if (!formData.name) {
    //   toast.error('请填写姓名');
    //   return;
    // }
    setSubmitting(true);

    const checkbox = customFields.filter(item => item.type === 'checkbox');

    if (checkbox.length) {
      checkbox.forEach(item => {
        formData[item.id] = formData[item.id]?.join('###');
      });
    }

    const submitData = {
      scope: viewerSDK?.workInfo?.getWorksID?.(),
      formData,
      wx_avatar: viewerSDK?.wechatInfo?.getWxAvatarThumb?.(),
      wx_nickname: viewerSDK?.wechatInfo?.getNickname?.(),
      openId: viewerSDK?.wechatInfo?.getOpenID?.() || '',
    };

    await formReceiverServiceApi.formSubmit(
      controledValues.formRefId,
      submitData
    );

    setCookieExpire(onceSubmitCookiesKey(controledValues.formRefId), 'true');
    setOverOnceSubmit(true);

    setSubmitting(false);
  };

  if (controledValues.show === false) {
    return <></>;
  }

  const labelStyle = {
    color: controledValues?.style?.labelColor,
  };

  const valueStyle = {
    color: controledValues?.style?.valueColor,
    placeholderColor: controledValues?.style?.valueColor,
  };

  const borderStyle = {
    borderColor: controledValues?.style?.borderColor,
  };

  const backgroundColorStyle = {
    backgroundColor: controledValues?.style?.backgroundColor,
  };

  const borderRadiusStyle = {
    borderRadius: controledValues?.style?.borderRadius,
  };

  return (
    <div
      className={styles.dialog}
      style={{
        pointerEvents: viewerSDK ? 'auto' : 'none',
      }}
    >
      {overOnceSubmit ? (
        <div className={styles.success_content}>
          <div className={styles.submit_success}>
            <div className={styles.tit} style={valueStyle}>
              提交成功
            </div>
            <div className={styles.desc}>
              {controledValues.feedback ||
                '感谢您的回复！我们期待与您共同分享这个美好时刻。'}
            </div>
            {controledValues.feedbackPicture && (
              <img src={controledValues.feedbackPicture} alt='' />
            )}
          </div>
          <div
            className={styles.resubmit}
            style={{
              borderRadius: controledValues.style?.buttonBorderRadius,
            }}
            onClick={() => setOverOnceSubmit(false)}
          >
            再次提交
          </div>
        </div>
      ) : (
        <>
          <div className={styles.contentV2}>
            {/* 没有设置过的情况下的默认值 */}
            {customFields.length === 0 && (
              <>
                <div className={styles.fieldItem}>
                  <div className={styles.label} style={labelStyle}>
                    <span>姓名</span>
                    <span className={styles.required}>*</span>
                  </div>
                  <input
                    type='text'
                    className={styles.input}
                    style={{
                      ...valueStyle,
                      ...borderStyle,
                      ...backgroundColorStyle,
                      ...borderRadiusStyle,
                    }}
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                    }}
                    placeholder='请输入'
                  />
                </div>
                <div className={styles.fieldItem}>
                  <div className={styles.label} style={labelStyle}>
                    <span>出席人数</span>
                    <span className={styles.required}>*</span>
                  </div>
                  <input
                    style={{
                      ...valueStyle,
                      ...borderStyle,
                      ...backgroundColorStyle,
                      ...borderRadiusStyle,
                    }}
                    type='text'
                    className={styles.input}
                    value={formData.guestCount}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        guestCount: Number(e.target.value),
                      });
                    }}
                    placeholder='请输入'
                  />
                </div>
              </>
            )}
            {customFields.map(item => {
              return (
                <div className={styles.fieldItem} key={item.id}>
                  <div className={styles.label} style={labelStyle}>
                    <span>{item.label}</span>
                    {item.required && (
                      <span className={styles.required}>*</span>
                    )}
                  </div>
                  {(item.type === 'text' || item.type === 'tel') && (
                    <input
                      style={{
                        ...valueStyle,
                        ...borderStyle,
                        ...backgroundColorStyle,
                        ...borderRadiusStyle,
                      }}
                      type={item.type}
                      className={styles.input}
                      placeholder='请输入'
                      onChange={e =>
                        setFormData({
                          ...formData,
                          [item.id]: e.target.value,
                        })
                      }
                    />
                  )}
                  {item.type === 'checkbox' && (
                    <div className='flex flex-col gap-4'>
                      {item.options
                        ?.split(/[，,\s]+/)
                        .filter(Boolean)
                        .map((opt, index) => (
                          <div
                            key={index}
                            className={styles.course_item}
                            onClick={() => {
                              const nextVal = formData[item.id]?.includes(opt)
                                ? formData[item.id]?.filter(
                                    (item: string) => item !== opt
                                  )
                                : [...(formData[item.id] || []), opt];
                              setFormData({
                                ...formData,
                                [item.id]: nextVal,
                              });
                            }}
                          >
                            {formData[item.id]?.includes(opt) ? (
                              <Icon
                                name='duoxuan'
                                size={20}
                                color={valueStyle.color || 'var(--theme-color)'}
                                stroke='#fff'
                              />
                            ) : (
                              <Icon
                                name='duoxuan1'
                                size={20}
                                stroke='#000'
                                color='#fff'
                              />
                            )}
                            <span style={valueStyle}>{opt}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {item.type === 'radio' && (
                    <div className='flex  flex-col gap-4'>
                      {item.options
                        ?.split(/[，,\s]+/)
                        .filter(Boolean)
                        .map((opt, index) => (
                          <div
                            key={index}
                            className={styles.course_item}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                [item.id]: opt,
                              });
                            }}
                          >
                            {formData[item.id] === opt ? (
                              <Icon
                                name='danxuan-yixuan'
                                size={20}
                                color={valueStyle.color || 'var(--theme-color)'}
                                stroke='#fff'
                              />
                            ) : (
                              <div className='size-5 flex items-center justify-center'>
                                <Icon
                                  name='danxuan3'
                                  size={18}
                                  color='#fff'
                                  stroke='#E4E4E7'
                                />
                              </div>
                            )}
                            <span style={valueStyle}>{opt}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              className='rounded-full w-full border border-solid'
              onClick={() => onSubmit()}
              style={{
                background: controledValues?.style?.buttonBackgroundColor,
                color: controledValues?.style?.buttonColor,
                border: controledValues?.style?.buttonBorderColor
                  ? `1px solid ${controledValues?.style?.buttonBorderColor}`
                  : '',
                borderRadius: controledValues?.style?.buttonBorderRadius || 6,
              }}
            >
              提交
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default HuizhiComp;
