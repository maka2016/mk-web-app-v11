import { defaultGridStyle } from '../../provider/utils';
import { GridRow, ThemeConfigV2 } from '../../types';

interface TemplateItem {
  title: string;
  elementRef: string;
  attrs: GridRow;
  displayStyle: any;
  link: {
    tag: string;
  };
}

// 网格模板可视化组件
export const GridTemplateRender = (props: TemplateItem) => {
  const { attrs, displayStyle, title } = props;

  // 渲染网格行指示器
  const renderRowIndicator = (row: GridRow, index: number) => {
    return (
      <div
        key={index}
        style={{
          ...row.style,
          border: '1px solid #e0e0e0',
          padding: '2px',
          margin: '2px',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          gap: 0,
          minHeight: 24,
        }}
      >
        {row.children &&
          row.children.length > 0 &&
          row.children.map((child: GridRow, childIndex: number) =>
            renderRowIndicator(child, childIndex)
          )}
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
      className='grid_template_render_root'
    >
      <div>{title}</div>
      {renderRowIndicator(attrs, 0)}
    </div>
  );
};

export default function GridTemplateFactory(
  themeConfig: ThemeConfigV2,
  {
    isRepeatList = false,
    labelPrefix = '容器',
  }: {
    isRepeatList?: boolean;
    labelPrefix?: string;
  }
) {
  return [
    {
      title: `${labelPrefix}（1x1）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList,
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          ...defaultGridStyle,
        },
        childrenIds: [],
        alias: 'Grid',
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
    {
      title: `${labelPrefix}（1x2）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList,
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          ...defaultGridStyle,
        },
        childrenIds: [],
        alias: 'Grid',
        children: [
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
    {
      title: `${labelPrefix}（1x3）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList,
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          ...defaultGridStyle,
        },
        childrenIds: [],
        alias: 'Grid',
        children: [
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
    {
      title: `${labelPrefix}（上1x下2）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList,
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          ...defaultGridStyle,
        },
        alias: 'Grid',
        children: [
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
            },
            children: [
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  ...defaultGridStyle,
                },
              },
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  ...defaultGridStyle,
                },
              },
            ],
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
    {
      title: `${labelPrefix}（左1x右2）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList,
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          ...defaultGridStyle,
        },
        childrenIds: [],
        alias: 'Grid',
        children: [
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            },
            children: [
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  ...defaultGridStyle,
                },
              },
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  ...defaultGridStyle,
                },
              },
            ],
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
    {
      title: `列表（1x1）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList: true,
        tag: 'grid_root',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr',
          flex: 1,
          ...defaultGridStyle,
        },
        childrenIds: [],
        children: [
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
    {
      title: `表格（2x2）`,
      elementRef: 'Grid',
      attrs: {
        isRepeatList: true,
        isTableView: true,
        tag: 'grid_root',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          flex: 1,
          ...defaultGridStyle,
        },
        childrenIds: [],
        children: [
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              ...defaultGridStyle,
            },
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
      Component: GridTemplateRender,
    },
  ];
}
