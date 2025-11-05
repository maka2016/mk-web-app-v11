import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import cls from 'classnames';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { TemplateApp } from './services';

export interface ThemeFormProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    author: string;
    templateApp: TemplateApp;
  }) => void;
  templateApps?: TemplateApp[];
  defaultSelectedTemplateApp?: TemplateApp;
  defaultThemePackName?: string;
  defaultThemePackAuthor?: string;
}

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow-y: auto;
  .edit_form_header {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px;
    .settingItem {
      display: flex;
      flex-direction: column;
      gap: 6px;
      .label {
        font-family: PingFang SC;
        font-weight: 600;
        font-size: 14px;
        line-height: 22px;
        color: #000;
      }
      .radioGroup {
        display: flex;
        align-items: center;
        gap: 8px;
        .radioGroupItem {
          flex: 1;
          position: relative;
          padding: 4px 16px;
          border: 1px solid #0000000f;
          border-radius: 6px;
          font-family: PingFang SC;
          font-weight: 400;
          font-size: 14px;
          line-height: 22px;
          text-align: center;
          cursor: pointer;
          color: rgba(0, 0, 0, 0.88);
          .selected {
            position: absolute;
            bottom: -1px;
            right: -1px;
          }

          &.active {
            border-color: #1a87ff;
            color: #1a87ff;
            background-color: #e6f4ff;
          }
        }
      }
      .value {
        font-size: 14px;
        color: #333;
      }
    }
  }
  .content_2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .group_container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #f0f0f0;
    .content {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      .bg_group_item {
        position: relative;
      }
    }
  }
  .footer {
    position: sticky;
    background-color: #fff;
    bottom: 0;
    padding: 8px 16px 16px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    box-shadow: 0px 1px 0px 0px #eceef0 inset;
  }
`;

const ThemeManager2 = (props: ThemeFormProps) => {
  const {
    onClose,
    onSubmit,
    templateApps,
    defaultSelectedTemplateApp,
    defaultThemePackName,
    defaultThemePackAuthor,
  } = props;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [themePackName, setThemePackName] = useState<string>(
    defaultThemePackName || ''
  );
  const [themePackAuthor, setThemePackAuthor] = useState<string>(
    defaultThemePackAuthor || ''
  );
  const [templateApp, setSelectedTemplateApp] = useState<
    TemplateApp | undefined
  >(defaultSelectedTemplateApp);

  return (
    <FormContainer>
      <div className='edit_form_header'>
        <div className='settingItem'>
          <div className='label'>主题</div>
          <Input
            variantSize='sm'
            value={themePackName}
            title='主题'
            placeholder='请输入主题名称'
            onChange={e => {
              setThemePackName(e.target.value);
            }}
          ></Input>
        </div>

        <div className='settingItem'>
          <div className='label'>类型</div>

          <div className='radioGroup'>
            {templateApps?.map(app => (
              <div
                className={cls([
                  'radioGroupItem',
                  templateApp?.documentId === app.documentId && 'active',
                ])}
                key={app.documentId}
                onClick={() => {
                  setSelectedTemplateApp(app);
                }}
              >
                {app.name}
                {templateApp?.documentId === app.documentId && (
                  <Icon
                    className='selected'
                    name='selected'
                    size={20}
                    color='#1A87FF'
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className='settingItem'>
          <div className='label'>作者</div>
          <Input
            variantSize='sm'
            value={themePackAuthor}
            title='作者'
            placeholder='请输入主题作者'
            onChange={e => {
              setThemePackAuthor(e.target.value);
            }}
          ></Input>
        </div>
      </div>
      <div className='footer'>
        <Button
          size='sm'
          variant={'outline'}
          onClick={async () => {
            onClose();
          }}
        >
          取消
        </Button>
        <Button
          size='sm'
          disabled={isSaving || !themePackName || !themePackAuthor}
          onClick={() => {
            if (!templateApp) {
              toast.error('请选择模板应用');
              return;
            }
            setIsSaving(true);
            onSubmit({
              name: themePackName,
              author: themePackAuthor,
              templateApp,
            });
          }}
        >
          保存
        </Button>
      </div>
    </FormContainer>
  );
};

export default ThemeManager2;
