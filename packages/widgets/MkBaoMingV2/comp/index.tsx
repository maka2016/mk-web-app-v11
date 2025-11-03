import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import React, { useEffect, useState } from 'react';
import { MkBaoMingV2Props } from '../shared';

import {
  formEntityServiceApi,
  formReceiverServiceApi,
  getPageId,
  getUid,
} from '@mk/services';
import { getCookie, queryToObj, setCookieExpire } from '@mk/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import './index.scss';

function onceSubmitCookiesKey(formID: string) {
  return `${formID}_submited`;
}

const MkBaoMingV2: React.FC<PlatformCompProps<MkBaoMingV2Props>> = props => {
  const {
    lifecycle: { didMount, didLoaded },
    controledValues,
    editorSDK,
    viewerSDK,
  } = props;
  const {
    formRefId,
    collectFields = ['name', 'phone'],
    feedback,
    customFields = [],
    show = true,
  } = controledValues;

  const [showForm, setShowForm] = useState(false);
  const [overOnceSubmit, setOverOnceSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({
    phone: '',
    name: '',
    organization: '',
    position: '',
    remarks: '',
  });

  const isScreenshot = !!queryToObj().screenshot;

  const initFormData = async () => {
    const worksId = getPageId();
    if (!editorSDK) {
      return;
    }

    if (!formRefId) {
      const res = await formEntityServiceApi.create({
        type: 'MkPinTuan',
        content: {
          fields: [
            {
              label: '姓名',
              id: 'name',
            },
            {
              label: '联系电话',
              id: 'phone',
            },
            {
              label: '孩子年龄',
              id: 'age',
            },
            {
              label: '备注',
              id: 'remarks',
            },
          ],
        },
        uid: +getUid(),
        works_id: worksId,
      });

      if (res.data.formId) {
        editorSDK?.changeCompAttr(props.id, {
          formRefId: res.data.formId,
          collectFields: ['name', 'phone', 'age', 'remarks'],
        });
      }
    }
  };

  useEffect(() => {
    initFormData();
    /** 用于在编辑器内挂载完成的回调 */
    didMount({
      boxInfo: {
        width: 100,
        height: 100,
      },
      data: {
        ...controledValues,
      },
    });

    /** 用于在 viewer 广播的组件加载完成事件 */
    didLoaded();
    if (getCookie(onceSubmitCookiesKey(formRefId))) {
      setOverOnceSubmit(true);
    }

    return () => {};
  }, []);

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

    if (!formRefId) {
      return;
    }

    if (submitting) {
      return;
    }

    // if (!formData.name) {
    //   toast.error("请填写姓名");
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

    await formReceiverServiceApi.formSubmit(formRefId, submitData);
    setSubmitting(false);
    setCookieExpire(onceSubmitCookiesKey(formRefId), 'true');
    setOverOnceSubmit(true);
  };

  if (isScreenshot) {
    return <></>;
  }

  if (!show) {
    return <></>;
  }

  return (
    <div className=''>
      {createPortal(
        <div
          id='mk-baoming-screen-portal'
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            bottom: 0,
            right: 0,
            zIndex: '11',
            overflow: 'hidden',
            pointerEvents: 'none', // Allow clicking through the container
          }}
        >
          <div
            className='mk_baoming_v2_footer'
            onClick={() => {
              setShowForm(true);
            }}
          >
            <Icon name='form' />
            <span>报名参加</span>
          </div>
        </div>,
        document.body
      )}
      <ResponsiveDialog
        isOpen={showForm}
        onOpenChange={setShowForm}
        contentProps={{
          style: {
            maxHeight: '95vh',
            borderRadius: '30px 30px 0 0',
          },
        }}
      >
        {!overOnceSubmit ? (
          <div className='mk_baoming_form'>
            <div className='title'>填写报名信息</div>
            <div className='desc'>
              *请务必填写真实信息，以便我们及时与您确认报名信息..
            </div>
            <Icon
              name='close'
              size={20}
              className='close'
              onClick={() => setShowForm(false)}
            />
            <div className='content'>
              {/* {fields.map((item) => {
                if (collectFields?.includes(item.id)) {
                  return (
                    <div className="form_item" key={item.id}>
                      <div className="form_item_title">
                        {item.required && <span className="required">*</span>}
                        {item.label}
                      </div>
                      <input
                        type={item.type}
                        className="form_item_input"
                        placeholder="请输入"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [item.id]: e.target.value,
                          })
                        }
                      />
                    </div>
                  );
                }

                return null;
              })} */}
              {customFields.map(item => {
                return (
                  <div className='form_item' key={item.id}>
                    <div className='form_item_title'>
                      {item.required && <span className='required'>*</span>}
                      {item.label}
                    </div>
                    {item.type === 'text' && (
                      <input
                        type={item.type}
                        className='form_item_input'
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
                              className='course_item'
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
                                  color='#3358D4'
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
                              <span>{opt}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {item.type === 'radio' && (
                      <div className='flex flex-col gap-4'>
                        {item.options
                          ?.split(/[，,\s]+/)
                          .filter(Boolean)
                          .map((opt, index) => (
                            <div
                              key={index}
                              className='course_item'
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
                                  color='#3358D4'
                                  stroke='#fff'
                                />
                              ) : (
                                <Icon
                                  name='danxuan-weixuan'
                                  size={20}
                                  color='#E4E4E7'
                                />
                              )}
                              <span>{opt}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className='mk_baoming_form_submit' onClick={() => onSubmit()}>
              {submitting ? '提交中...' : '提交报名'}
            </div>
          </div>
        ) : (
          <div className='mk_baoming_form'>
            <Icon
              name='close'
              size={20}
              className='close'
              onClick={() => setShowForm(false)}
            />

            <div className='success_content'>
              <div className='submit_success'>
                <img
                  src='https://img2.maka.im/cdn/mk-widgets/assets/submit_success.png'
                  alt=''
                />
                <span>
                  {controledValues.feedback ||
                    '报名成功！会议信息将发送到您的邮箱。请保持手机畅通，我们会在会议前一天确认参会信息。'}
                </span>
              </div>
            </div>
            <div className='resubmit' onClick={() => setOverOnceSubmit(false)}>
              再次提交
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
};

export default MkBaoMingV2;
