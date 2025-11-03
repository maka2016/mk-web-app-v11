import React, { useEffect, useState } from 'react';
import { MkPinTuanProps } from '../shared';

import './index.scss';
import { API, formReceiverServiceApi, request } from '@mk/services';
import { createPortal } from 'react-dom';
import { avatars } from '../shared/const';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { getCookie, queryToObj, setCookieExpire } from '@mk/utils';
import { Icon } from '@workspace/ui/components/Icon';
import toast from 'react-hot-toast';

function onceSubmitCookiesKey(formID: string) {
  return `${formID}_submited`;
}

const fields = [
  {
    label: '姓名',
    id: 'name',
    type: 'text',
  },

  {
    label: '联系电话',
    id: 'phone',
    type: 'tel',
  },
  {
    label: '课程',
    id: 'course',
    type: 'radio',
  },
  {
    label: '孩子年龄',
    id: 'age',
    type: 'number',
  },
  {
    label: '备注',
    id: 'remarks',
    type: 'text',
  },
];

const BaoMing = (props: {
  controledValues: MkPinTuanProps;
  viewerSDK: any;
}) => {
  const { controledValues, viewerSDK } = props;
  const {
    formRefId,
    collectFields = ['name', 'phone'],
    feedback = '感谢您的报名！',
    courseOptions = '',
  } = controledValues;
  const [showForm, setShowForm] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [overOnceSubmit, setOverOnceSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({
    phone: '',
    name: '',
    age: '',
    remarks: '',
    course: '',
  });

  useEffect(() => {
    if (getCookie(onceSubmitCookiesKey(formRefId))) {
      setOverOnceSubmit(true);
    }

    return () => {};
  }, []);

  const sendEvent = async () => {
    const uid = viewerSDK?.workInfo?.getUID?.();
    const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';

    const appid = queryToObj().appid || 'jiantie';
    const url = `${API('apiv10')}/notify-proxy/v1/events/trigger`;
    await request.post(url, {
      name: 'event-lead-received',
      payload: {
        details_url: `${location.origin}/mobile/data-visible/pintuan?works_id=${worksId}&is_full_screen=1`,
      },
      to: [
        {
          subscriberId: `${appid}_${uid}`,
        },
      ],
    });
  };

  const onSubmit = async () => {
    if (controledValues.isTemplate) {
      toast('请分享后使用此功能');
      return;
    }

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

    if (!formData.name) {
      toast.error('请填写姓名');
      return;
    }

    if (!formData.phone) {
      toast.error('请填写联系电话');
      return;
    }

    setSubmitting(true);

    const submitData = {
      scope: viewerSDK?.workInfo?.getWorksID?.(),
      formData,
      wx_avatar: viewerSDK?.wechatInfo?.getWxAvatarThumb?.(),
      wx_nickname: viewerSDK?.wechatInfo?.getNickname?.(),
      openId: viewerSDK?.wechatInfo?.getOpenID?.() || '',
    };

    await formReceiverServiceApi.formSubmit(formRefId, submitData);
    sendEvent();
    setSubmitting(false);
    setCookieExpire(onceSubmitCookiesKey(formRefId), 'true');
    setOverOnceSubmit(true);
  };

  return (
    <div className=''>
      {createPortal(
        <div
          id='mk-pintuan-screen-portal'
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
            className='mk_pintuan_footer'
            onClick={() => {
              setShowForm(true);
            }}
          >
            <div className='mk_pintuan_btn'>
              <div className='show_avatar'>
                <img src={avatars[0]} alt='' className='show_avatar_item' />
                <img src={avatars[1]} alt='' className='show_avatar_item' />
                <img src={avatars[2]} alt='' className='show_avatar_item' />
              </div>
              <div className='btn_content'>
                <span className='tit'>限时拼课</span>
                <span className='desc'>人满截止，到期恢复原价</span>
              </div>
            </div>
            <div className='mk_pintuan_btn_right'>
              <img
                src='https://img2.maka.im/cdn/webstore10/xueji/mk_pintuan_btn_right.png'
                className='mk_pintuan_btn_c'
              />

              <span>立即报名</span>
              <Icon name='right-bold' />
            </div>
          </div>
        </div>,
        document.body
      )}
      <ResponsiveDialog
        isOpen={showForm}
        onOpenChange={setShowForm}
        contentProps={{
          style: {
            borderRadius: '30px 30px 0 0',
          },
        }}
      >
        {!overOnceSubmit ? (
          <div className='mk_pintuan_form'>
            <div className='title'>
              <img src='https://img2.maka.im/cdn/webstore10/xueji/pintuan_title_icon.png' />
              填写报名信息
            </div>
            <div className='desc'>
              *请务必填写真实信息，以便我们及时与您确认课程信息.
            </div>
            <Icon
              name='close'
              size={20}
              className='close'
              onClick={() => setShowForm(false)}
            />
            <div className='content'>
              {fields.map(item => {
                if (collectFields?.includes(item.id)) {
                  return (
                    <div className='form_item' key={item.id}>
                      <div className='form_item_title'>{item.label}</div>
                      {item.id !== 'course' ? (
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
                      ) : (
                        <div className='flex flex-col gap-4'>
                          {courseOptions
                            ?.split(/[，,\s]+/)
                            .filter(Boolean)
                            .map((item, index) => (
                              <div
                                key={index}
                                className='course_item'
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    course: item,
                                  });
                                }}
                              >
                                {formData.course === item ? (
                                  <Icon
                                    name='check-one'
                                    size={20}
                                    color='#FF2B69'
                                  />
                                ) : (
                                  <Icon name='danxuan3' size={20} />
                                )}
                                <span>{item}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
            <div className='mk_pintuan_form_submit' onClick={() => onSubmit()}>
              {submitting ? '提交中...' : '提交报名'}
            </div>
            <div className='desc text-center'>学迹 APP 提供技术支持</div>
          </div>
        ) : (
          <div className='mk_pintuan_form'>
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
                    '感谢您的报名！请添加教务老师微信，我们会尽快与您联系安排课程。'}
                </span>
              </div>
            </div>
            <div className='resubmit' onClick={() => setOverOnceSubmit(false)}>
              再次提交
            </div>
          </div>
        )}
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showContactsDialog}
        onOpenChange={setShowContactsDialog}
      >
        <div className='mk_pintuan_form'>
          <div className='title'>联系老师</div>
          <Icon
            name='close'
            size={20}
            className='close'
            onClick={() => setShowContactsDialog(false)}
          />
          <div className='success_content'>
            <div className='submit_success'>
              <span>长按添加教务老师微信</span>
            </div>
            <img src='https://img2.maka.im/cdn/webstore10/xueji/mk_pintuan_bg.png' />
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default BaoMing;
