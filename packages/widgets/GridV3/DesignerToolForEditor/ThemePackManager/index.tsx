import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { queryToObj } from '@mk/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import ThemePackSelector from './ThemePackSelector';
import { useThemePackContext } from './ThemeProvider';
import { Plus } from 'lucide-react';
import ThemeManager2 from './ThemeManager2';
import LayoutTemplate2 from './LayoutTemplate2';
import {
  createThemePack,
  getThemePack,
  saveThemePack,
  ThemePack,
} from './services';
import { Icon } from '@workspace/ui/components/Icon';

const ThemeFormRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #fff;
  /* padding: 4px 0; */
  .tabs {
    display: flex;
    border-bottom: 1px solid #0000000f;
    padding: 8px 16px;
    .tab_item {
      color: #000000;
      font-family: PingFang SC;
      font-weight: 600;
      font-size: 16px;
      line-height: 24px;
    }
  }
  .theme_selector_container {
    display: flex;
    flex-direction: column;
    padding: 0 12px 0;
    max-height: 240px;
    overflow-y: auto;
    .main_title {
      display: flex;
      flex-direction: column;
    }
    .btn_group {
      display: flex;
      align-items: center;
    }
    .theme_pack_selector {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      background-color: #eee;
      &:hover {
        background-color: #f0f0f0;
      }
      &.selected {
        background-color: #eee;
      }
    }
    .theme_pack_info {
      display: flex;
      align-items: center;
      margin-left: 8px;
      .theme_pack_info_item {
        margin-right: 8px;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        font-size: 12px;
        color: #666;
        &:hover {
          color: #333;
        }
      }
    }
    .theme_item {
      padding: 4px;
      background-color: #f9f9f9;
      margin-bottom: 8px;
      &:hover {
        background-color: #f0f0f0;
      }
      &.selected {
        background-color: #eee;
      }
    }
  }
  .row_and_cell_editor {
    border-bottom: 1px solid #e5e5e5;
  }
  .designer_widget_content_container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    .selectedThemeDetail {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px 4px;
      gap: 8px;
      .name {
        font-family: PingFang SC;
        font-weight: 600;
        font-size: 14px;
        line-height: 22px;
        letter-spacing: 0px;
        vertical-align: middle;
        color: #000;
      }
      .id {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 13px;
        line-height: 20px;
        letter-spacing: 0%;
        vertical-align: middle;
        color: rgba(0, 0, 0, 0.6);
      }
    }
  }
  .designer_widget_content {
    padding: 8px 16px;

    .main_title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
    }
    .content {
      display: grid;
      gap: 4px;
      grid-template-columns: 1fr 1fr 1fr;
      overflow-y: auto;
      .widget_item {
        background-color: #fff;
        border-radius: 4px;
        border: 1px solid #e5e5e5;
        padding: 4px;
      }
    }
  }
`;

function ThemeWidgetSelector() {
  const openDefault = queryToObj().open_default;
  const [showThemePackSelector, setShowThemePackSelector] =
    useState(openDefault);
  const [showEditBaseInfo, setShowEditBaseInfo] = useState(false);
  const [showCreateThemePack, setShowCreateThemePack] = useState(false);
  const {
    selectedThemePack,
    selectedTemplateApp,
    templateApps,
    initThemePackInfo,
    setSelectedThemePack,
  } = useThemePackContext();

  const _setSelectedThemePack = (themePack?: ThemePack) => {
    // 设置url的themeDocumentId
    const url = new URL(window.location.href);
    url.searchParams.set('themeDocumentId', themePack?.documentId || '');
    window.history.replaceState({}, '', url.toString());
    setSelectedThemePack(themePack);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    const themeDocumentId = url.searchParams.get('themeDocumentId');
    if (themeDocumentId) {
      getThemePack(themeDocumentId).then(res => {
        _setSelectedThemePack(res);
      });
    }
  }, []);

  const templateAppDocumentId = selectedTemplateApp?.documentId;

  return (
    <>
      <ThemeFormRoot key={selectedThemePack?.documentId}>
        <div className='theme_selector_container'>
          <div className='btn_group'>
            <Button
              variant='outline'
              size='sm'
              style={{ marginRight: 4 }}
              onClick={() => {
                setShowThemePackSelector(true);
              }}
            >
              选择主题包
            </Button>
            <Button
              variant='outline'
              size='sm'
              style={{ marginRight: 4 }}
              onClick={() => {
                setShowCreateThemePack(true);
              }}
            >
              新增主题包
            </Button>

            <span className='flex-1'></span>
          </div>
        </div>
        <div className='designer_widget_content_container'>
          {selectedThemePack && (
            <>
              <div className='selectedThemeDetail'>
                <Icon
                  name='left'
                  className='pointer-cursor'
                  onClick={() => _setSelectedThemePack(undefined)}
                />
                <div className='flex-1'>
                  <p className='name'>{selectedThemePack.name}</p>
                </div>
                <Icon
                  name='setting2'
                  className='pointer-cursor'
                  size={16}
                  onClick={() => setShowEditBaseInfo(true)}
                />
              </div>
              <LayoutTemplate2 selectedThemePack={selectedThemePack} />
            </>
          )}
        </div>
      </ThemeFormRoot>
      <ResponsiveDialog
        isOpen={showThemePackSelector}
        onOpenChange={isOpen => {
          setShowThemePackSelector(isOpen);
        }}
        title='选择主题包'
        className='theme_pack_selector_drawer'
      >
        <ThemePackSelector
          selectedThemePack={selectedThemePack}
          onSelected={item => {
            _setSelectedThemePack(item);
            setShowThemePackSelector(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        contentProps={{
          className: 'w-[400px]',
        }}
        isOpen={showEditBaseInfo}
        onOpenChange={nextState => {
          setShowEditBaseInfo(nextState);
        }}
        title='管理主题'
      >
        <ThemeManager2
          templateApps={templateApps}
          onClose={() => setShowEditBaseInfo(false)}
          defaultSelectedTemplateApp={selectedTemplateApp}
          defaultThemePackName={selectedThemePack?.name}
          defaultThemePackAuthor={selectedThemePack?.author}
          onSubmit={async data => {
            await saveThemePack({
              // ...(selectedThemePack || {}),
              documentId: selectedThemePack?.documentId,
              name: data.name,
              content: {},
              author: data.author,
              desc: selectedThemePack?.desc || '',
              ...(data.templateApp.documentId
                ? {
                    template_app: {
                      set: [data.templateApp.documentId],
                    },
                  }
                : {}),
            });
            await initThemePackInfo();
            setShowEditBaseInfo(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        contentProps={{
          className: 'w-[400px]',
        }}
        isOpen={showCreateThemePack}
        onOpenChange={nextState => {
          setShowCreateThemePack(nextState);
        }}
        title='新建主题包'
      >
        <ThemeManager2
          templateApps={templateApps}
          onClose={async () => {
            setShowCreateThemePack(false);
            await initThemePackInfo();
          }}
          defaultSelectedTemplateApp={selectedTemplateApp}
          onSubmit={async data => {
            const res = await createThemePack({
              name: data.name,
              content: {},
              author: data.author,
              ...(templateAppDocumentId
                ? {
                    template_app: {
                      set: [templateAppDocumentId],
                    },
                  }
                : {}),
            });
            _setSelectedThemePack(res.data);
            await initThemePackInfo();
            setShowCreateThemePack(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
}

export default ThemeWidgetSelector;
