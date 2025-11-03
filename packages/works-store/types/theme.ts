export class WorksThemeConfig {
  worksBg = {
    top: {
      ossPath: '',
      materialId: '',
    },
    body: {
      ossPath: '',
      materialId: '',
    },
    footer: {
      ossPath: '',
      materialId: '',
    },
  };

  worksFg = {
    atmosphere: {
      url: '',
      materialId: '',
      name: '',
    },
  };

  title = {
    attrs: {
      color: '#000',
      fontSize: 24,
    },
  };

  subTitle = {
    attrs: {
      fontSize: 18,
      color: '#000',
      bg: {
        left: '',
        min: '',
        right: '',
      },
    } as any,
  };

  text = {
    attrs: {
      fontSize: 16,
      lineHeight: 1.8,
      color: '#000',
    },
  };

  picture = {
    attrs: {},
  };

  layer = {
    padding: '',
  };

  worksStyle = {
    padding: '',
  };
}

export interface ThemeSchema {
  head_title: Record<string, any>;
  main_title: Record<string, any>;
  sub_title: Record<string, any>;
  text: Record<string, any>;
  small_text: Record<string, any>;
  emphasize_text: Record<string, any>;
  card_title: Record<string, any>;
  default_picture: Record<string, any>;
  emphasize_picture: Record<string, any>;
  page: Record<string, any>;
}

export interface ThemeConfig {
  titleVisible: boolean;
  avatar: {
    alignment: 'left' | 'center';
    visible: boolean;
  };

  time: {
    type: 'create_time' | 'update_time' | 'custom';
    visible: boolean;
  };
  readCountVisible: boolean;
}
