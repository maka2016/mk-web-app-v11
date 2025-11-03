import React, { useEffect, useRef, useState } from 'react';
import { ThemeSchema2 } from './const';
import {
  getTemplateApps,
  TemplateApp,
  getMaterialChannels,
  MaterialChannel,
  ThemePack,
} from './services';

const useThemePack = () => {
  const templateApps = useRef<TemplateApp[]>([]);
  const [selectedTemplateApp, setSelectedTemplateApp] = useState<TemplateApp>();
  const [materialChannelList, setMaterialChannelList] = useState<
    MaterialChannel[]
  >([]);
  const [selectedMaterialChannel, setSelectedMaterialChannel] =
    useState<MaterialChannel>();
  const [selectedThemePack, setSelectedThemePack] = useState<ThemePack>();
  const [_, focusUpdate] = useState(0);

  const onSelectTemplateApp = (templateApp: TemplateApp) => {
    const url = new URL(window.location.href);
    url.searchParams.set('templateAppId', templateApp.appid);
    window.history.replaceState({}, '', url.toString());
    setSelectedTemplateApp(templateApp);
    getMaterialChannels(templateApp.appid).then(list => {
      setMaterialChannelList(list);
    });
  };

  const onSelectMaterialChannel = (materialChannel: MaterialChannel) => {
    const url = new URL(window.location.href);
    url.searchParams.set('materialChannelId', materialChannel.documentId);
    window.history.replaceState({}, '', url.toString());
    setSelectedMaterialChannel(materialChannel);
  };

  /** 初始化获取全部的主题包信息 */
  const initThemePackInfo = async () => {
    const url = new URL(window.location.href);
    /** 应用id */
    const templateAppId = url.searchParams.get('templateAppId');
    /** 素材频道id */
    const materialChannelId = url.searchParams.get('materialChannelId');

    if (templateAppId) {
      const templateApp = templateApps.current.find(
        (item: TemplateApp) => item.appid === templateAppId
      );
      if (templateApp) {
        onSelectTemplateApp(templateApp);
        /** 3. 获取模版应用下的全部的素材频道 */
        const _materialChannelList = await getMaterialChannels(
          templateAppId || ''
        );
        setMaterialChannelList(_materialChannelList);

        if (materialChannelId) {
          const materialChannel = _materialChannelList.find(
            (item: MaterialChannel) => item.documentId === materialChannelId
          );
          if (materialChannel) {
            onSelectMaterialChannel(materialChannel);
          }
        }
      }
    }
  };

  useEffect(() => {
    /** 1. 获取全部的模板应用 */
    getTemplateApps().then(templateAppsRes => {
      templateApps.current = templateAppsRes.data;
      initThemePackInfo();
      focusUpdate(1);
    });
  }, []);

  return {
    templateApps: templateApps.current,
    selectedTemplateApp,
    materialChannelList,
    selectedMaterialChannel,
    selectedThemePack,
    onSelectTemplateApp,
    onSelectMaterialChannel,
    initThemePackInfo,
    setSelectedThemePack,
  };
};

const ThemeProviderContext = React.createContext<ReturnType<
  typeof useThemePack
> | null>(null);

export const useThemePackContext = () => {
  const context = React.useContext(ThemeProviderContext);
  if (context === null) {
    console.trace('useThemePackContextErr');
    throw new Error('useThemePackContext must be used within a ThemeProvider');
  }
  return context;
};

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const themePackHelper = useThemePack();
  return (
    <ThemeProviderContext.Provider value={themePackHelper}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
