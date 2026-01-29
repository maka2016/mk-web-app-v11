import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import React from 'react';

interface CommunityTermsProps {
  show: boolean;
  onClose: () => void;
}

const CommunityTerms: React.FC<CommunityTermsProps> = ({ show, onClose }) => {
  return (
    <ResponsiveDialog
      title='音乐社区共享协议'
      isOpen={show}
      onOpenChange={open => !open && onClose()}
      contentProps={{
        className: 'max-w-2xl max-h-[80vh]',
      }}
    >
      {({ close }) => (
        <div className='p-6 overflow-y-auto max-h-[70vh] text-sm leading-relaxed'>
          <div className='space-y-4'>
            <div>
              <h4 className='font-semibold text-base mb-2'>1. 协议概述</h4>
              <p className='text-gray-700'>
                当您选择将音乐文件共享到平台社区时，即表示您同意遵守以下条款和条件。本协议旨在保护所有用户的权益，营造良好的社区环境。
              </p>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>2. 内容授权</h4>
              <p className='text-gray-700 mb-2'>您确认并保证：</p>
              <ul className='list-disc list-inside space-y-1 text-gray-700 ml-4'>
                <li>您拥有所上传音乐的合法版权或已获得相应授权</li>
                <li>您的音乐内容不违反任何法律法规</li>
                <li>
                  您授予平台非排他性、免费的使用权，用于在社区中展示和分享
                </li>
              </ul>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>3. 内容规范</h4>
              <p className='text-gray-700 mb-2'>共享的音乐内容不得包含：</p>
              <ul className='list-disc list-inside space-y-1 text-gray-700 ml-4'>
                <li>违法、暴力、色情或其他不当内容</li>
                <li>侵犯他人版权的音乐作品</li>
                <li>恶意代码或病毒</li>
                <li>虚假、误导性信息</li>
              </ul>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>4. 平台权利</h4>
              <p className='text-gray-700 mb-2'>平台有权：</p>
              <ul className='list-disc list-inside space-y-1 text-gray-700 ml-4'>
                <li>审核所有共享内容</li>
                <li>移除违反规定的音乐文件</li>
                <li>暂停或终止违规用户的共享权限</li>
                <li>根据需要更新本协议条款</li>
              </ul>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>5. 用户责任</h4>
              <p className='text-gray-700'>
                用户需对自己上传的内容承担全部法律责任。如因用户上传的内容引起任何法律纠纷或损失，均由用户承担相应责任。
              </p>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>6. 隐私保护</h4>
              <p className='text-gray-700'>
                我们承诺保护您的个人信息安全，仅在必要时使用您的信息来改善服务质量。您的音乐作品将在社区中公开展示。
              </p>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>7. 免责声明</h4>
              <p className='text-gray-700'>
                平台仅提供技术服务，不对用户上传内容的准确性、完整性或合法性承担责任。用户之间的纠纷应自行协商解决。
              </p>
            </div>

            <div>
              <h4 className='font-semibold text-base mb-2'>8. 协议生效</h4>
              <p className='text-gray-700'>
                本协议自您勾选同意并上传音乐时生效。平台保留随时修改本协议的权利，修改后的协议将在平台上公布。
              </p>
            </div>

            <div className='bg-yellow-50 p-3 rounded border-l-4 border-yellow-400 mt-6'>
              <p className='text-sm text-gray-800'>
                <strong>重要提醒：</strong>
                本协议的最终解释权归平台所有。如有疑问，请联系客服获取更多信息。
              </p>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
};

export default CommunityTerms;
