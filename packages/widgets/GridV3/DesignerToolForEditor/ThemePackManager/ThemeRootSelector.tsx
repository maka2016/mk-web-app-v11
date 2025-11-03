import { queryToObj } from '@mk/utils';
import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import cls from 'classnames';
import { Icon } from '@workspace/ui/components/Icon';
import { useThemePackContext } from './ThemeProvider';
import { useGridContext } from '../../comp/provider';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';

export interface ThemeFormProps {
  onClose: () => void;
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
        gap: 8px;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: flex-start;
        .radioGroupItem {
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
          /* 不换行 */
          white-space: nowrap;

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

const ThemeRootSelector = (props: ThemeFormProps) => {
  const { onClose } = props;
  const {
    materialChannelList,
    selectedTemplateApp,
    templateApps,
    selectedMaterialChannel,
    onSelectTemplateApp,
    onSelectMaterialChannel,
  } = useThemePackContext();
  return (
    <FormContainer>
      <div className='edit_form_header'>
        <div className='settingItem'>
          <div className='label'>产品</div>

          <div className='radioGroup'>
            {templateApps?.map(app => (
              <div
                className={cls([
                  'radioGroupItem',
                  selectedTemplateApp?.documentId === app.documentId &&
                    'active',
                ])}
                key={app.documentId}
                onClick={() => {
                  onSelectTemplateApp(app);
                }}
              >
                {app.name}
                {selectedTemplateApp?.documentId === app.documentId && (
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
          <div className='label'>场景类目</div>
          <div className='radioGroup'>
            {materialChannelList?.map(app => (
              <div
                className={cls([
                  'radioGroupItem',
                  selectedMaterialChannel?.documentId === app.documentId &&
                    'active',
                ])}
                key={app.documentId}
                onClick={() => {
                  onSelectMaterialChannel(app);
                }}
              >
                {app.name}
                {selectedMaterialChannel?.documentId === app.documentId && (
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
          <div className='label'>内容分类</div>
          <div className='radioGroup'>
            {selectedMaterialChannel?.material_tags?.map(channel => (
              <div
                className={cls(['radioGroupItem2 text-xs'])}
                key={channel.documentId}
              >
                {channel.name}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className='footer'>
        <Button
          size='sm'
          disabled={!selectedTemplateApp || !selectedMaterialChannel}
          onClick={async () => {
            // await initThemePackInfo();
            onClose();
          }}
        >
          确定
        </Button>
      </div>
    </FormContainer>
  );
};

const ThemeRootSelectorWrapper = () => {
  const { editorSDK, widgetState } = useGridContext();
  const { showThemeChannelSelector } = widgetState;

  // useEffect(() => {
  //   if (!queryToObj().templateAppId) {
  //     editorSDK?.changeWidgetState({
  //       showThemeChannelSelector: true,
  //     });
  //   }
  // }, []);

  return (
    <ResponsiveDialog
      contentProps={{
        className: 'w-[400px]',
      }}
      isOpen={showThemeChannelSelector}
      onOpenChange={nextVal => {
        editorSDK?.changeWidgetState({
          showThemeChannelSelector: nextVal,
        });
      }}
      title='1. 选择模版类目'
    >
      <ThemeRootSelector
        onClose={() => {
          editorSDK?.changeWidgetState({
            showThemeChannelSelector: false,
          });
        }}
      />
    </ResponsiveDialog>
  );
};

export default ThemeRootSelectorWrapper;
