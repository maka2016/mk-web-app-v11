import * as React from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import TemplateCard, { TemplateCardData } from '../TemplateCard';
import styles from './Waterfall.module.scss';

interface Props {
  id?: string;
  template: any[];
  loading: boolean;
  finished: boolean;
  // track: any;
  gutter?: number;
  onLoad: () => void;
  useWindow?: boolean;
  getScrollParent?: () => HTMLElement | null;
  onChange?: (template: TemplateCardData) => void;
}

interface State {
  list: any[];
  dataColumns: any[];
  columnWidth: number;
}

export default class Waterfall extends React.PureComponent<Props, State> {
  _columnCount = 3;
  scrollRef = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this.state = {
      dataColumns: [],
      list: props.template,
      columnWidth: 180,
    };
  }

  componentDidMount(): void {
    if (!this.state.dataColumns.length) {
      this._calculateColumnCount();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (this.props.template.length !== prevProps.template.length) {
      const { list, dataColumns } = this.state;
      // 如果新数据长度小于等于旧数据长度，说明是重新搜索，需要重新初始化
      const isReset = this.props.template.length <= prevProps.template.length;
      this.getColumns({
        list: isReset
          ? this.props.template
          : this.props.template.slice(list.length),
        dataColumns: isReset ? [] : dataColumns,
      });

      this.setState({
        list: this.props.template,
      });
    }
  }

  _calculateColumnCount = () => {
    const width = this.scrollRef.current?.offsetWidth || 0;
    const { gutter = 8, template } = this.props;
    this.setState(
      {
        columnWidth:
          (width - (this._columnCount - 1) * gutter) / this._columnCount,
      },
      () => {
        this.getColumns({
          list: template,
          dataColumns: [],
        });
      }
    );
  };

  getColumns = ({ list, dataColumns }: any) => {
    const { columnWidth } = this.state;
    const columnNum = this._columnCount;
    let columns: any[] = dataColumns;
    // 确保始终有3列，即使结果数小于3
    if (!columns?.length || columns.length !== columnNum) {
      columns = Array.from({ length: columnNum }).map(() => ({
        height: 0,
        data: [],
      }));
    }

    for (let i = 0; i < list.length; i++) {
      let minHeightItem = 0;
      columns.forEach((v, index) => {
        if (v.height < columns[minHeightItem].height) minHeightItem = index;
      });
      const page_height = +list[i].height || +list[i].page_height;
      const page_width = +list[i].width || +list[i].page_width;

      let height = (page_height / page_width) * columnWidth;
      if (height > 4 * columnWidth) {
        height = 4 * columnWidth;
      }
      if (isNaN(height) || height <= 0) {
        height = 0;
      }
      columns[minHeightItem].height += height;
      columns[minHeightItem]?.data.push(list[i]);
    }
    this.setState({
      dataColumns: columns,
    });
  };

  renderColumn = () => {
    const { dataColumns, columnWidth } = this.state;
    const { gutter = 8, onChange } = this.props;
    const columnNum = this._columnCount;

    // 确保始终渲染3列，即使某些列为空
    const columns =
      dataColumns?.length === columnNum
        ? dataColumns
        : Array.from({ length: columnNum }).map(() => ({
            height: 0,
            data: [],
          }));

    return (
      <div className={styles.waterfall} ref={this.scrollRef}>
        {columns.map((column, index) => (
          <div
            className={styles.column}
            key={index}
            style={{ width: columnWidth }}
          >
            {column.data?.map((item: any) => (
              <TemplateCard
                key={item.template_id || item.id}
                template={item}
                columnWidth={columnWidth}
                gutter={gutter}
                // track={track}
                onChange={onChange}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  render() {
    const { onLoad, finished, useWindow, getScrollParent } = this.props;
    return (
      <InfiniteScroll
        initialLoad={false}
        pageStart={0}
        useWindow={useWindow}
        loadMore={onLoad}
        hasMore={true}
        getScrollParent={getScrollParent}
      >
        {this.renderColumn()}
        {!finished && (
          <div
            className={styles.loading}
            style={{
              width: '100%',
            }}
          >
            <div className={styles.loadingCircle}>
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/icon_loading_v1.svg'
                width={40}
                height={40}
                alt=''
                className={styles.circle}
              />
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/icon_makalogo.svg'
                width={22}
                height={20}
                alt=''
              />
            </div>
          </div>
        )}
      </InfiniteScroll>
    );
  }
}
