import { Button } from '@workspace/ui/components/button';
import { IconInput } from '@workspace/ui/components/icon-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import clas from 'classnames';
import React from 'react';
import { useWorksStore } from '../../works-store/store/hook';

export default function ListSetting({
  useDesignerSetting = false,
}: {
  useDesignerSetting?: boolean;
}) {
  const worksStore = useWorksStore();
  const {
    setRowAttrsV2,
    getActiveRow,
    handleChangeRepeatList,
    handleChangeTableView,
  } = worksStore.gridPropsOperator;
  const fullStack = worksStore.fullStack;
  const currRow = getActiveRow();

  const itemCount = currRow?.children?.length || 1;
  const isTableView = !!currRow?.isTableView;

  const listColumnCount =
    currRow?.repeatColumnCount ||
    String(currRow?.style?.gridTemplateColumns)?.split(' ')?.length ||
    1;
  const listRowCount = Math.ceil(
    (currRow?.children?.length || 1) / listColumnCount
  );

  return (
    <div className='flex items-center text-xs gap-2 flex-1'>
      <div className='flex items-center flex-1'>
        <IconInput
          placeholder='列'
          className='h-8'
          icon2={
            <div className='flex items-center justify-center gap-1'>
              <span>列</span>
            </div>
          }
          type='number'
          value={listColumnCount}
          onChange={e => {
            const value = Number(e.target.value);
            if (!value) {
              return;
            }

            if (isTableView) {
              handleChangeTableView(value, listRowCount);
            }
            setRowAttrsV2({
              repeatColumnCount: value,
              style: {
                ...(currRow?.style || {}),
                gridTemplateColumns: Array(value).fill('1fr').join(' '),
              },
            });
          }}
        />
      </div>
      {isTableView ? (
        <div className='flex items-center flex-1'>
          <IconInput
            placeholder='行'
            className='h-8'
            icon2={
              <div className='flex items-center justify-center gap-1'>
                <span>行</span>
              </div>
            }
            type='number'
            value={listRowCount}
            onChange={e => {
              const value = Number(e.target.value);
              console.log('value', value);
              if (!value) {
                return;
              }

              handleChangeTableView(listColumnCount, value);
            }}
          />
        </div>
      ) : (
        <div className='flex items-center flex-1'>
          <IconInput
            placeholder='项'
            className='h-8'
            icon2={
              <div className='flex items-center justify-center gap-1'>
                <span>项</span>
              </div>
            }
            type='number'
            value={itemCount}
            onChange={e => {
              const value = Number(e.target.value);
              if (!value) {
                return;
              }

              handleChangeRepeatList(value);
            }}
          />
        </div>
      )}
      {useDesignerSetting && fullStack && (
        <>
          <Button
            className={clas('text-xs', currRow?.listReverse && 'text-primary')}
            size={'sm'}
            variant='secondary'
            onClick={e => {
              setRowAttrsV2({
                listReverse: !currRow?.listReverse,
              });
            }}
          >
            偶数翻转
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className='flex items-center justify-center gap-2'
                variant='secondary'
                size='sm'
              >
                <span className='text-xs text-gray-500'>设置比例</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-4' side='bottom' align='center'>
              <div className='space-y-3'>
                <div className='text-sm font-medium text-gray-700'>
                  设置分栏比例
                </div>
                <div className='flex gap-2'>
                  {(() => {
                    const columnCount = listColumnCount;
                    const inputs: React.ReactElement[] = [];

                    // 解析当前选择的比例作为默认值
                    let defaultValues: number[] = [];

                    // 从 currRow?.style?.gridTemplateColumns 解析当前的比例值
                    if (currRow?.style?.gridTemplateColumns) {
                      const gridCols = String(
                        currRow.style.gridTemplateColumns
                      ).split(' ');
                      defaultValues = gridCols.map((col: string) => {
                        // 解析 "1fr", "2fr" 等格式，提取数字部分
                        const match = col.match(/^(\d+)fr$/);
                        return match ? parseInt(match[1]) : 1;
                      });
                    }

                    // 如果解析失败或没有值，使用默认值
                    if (defaultValues.length === 0) {
                      defaultValues = Array(columnCount).fill(1);
                    }

                    // 确保默认值数组长度与栏数匹配
                    while (defaultValues.length < columnCount) {
                      defaultValues.push(1);
                    }
                    defaultValues = defaultValues.slice(0, columnCount);

                    for (let i = 0; i < columnCount; i++) {
                      inputs.push(
                        <div key={i} className='flex-1'>
                          <label className='block text-xs text-gray-500 mb-1'>
                            第{i + 1}栏
                          </label>
                          <input
                            type='number'
                            min='1'
                            max='10'
                            className='w-full px-2 text-sm border border-gray-300 rounded bg-white'
                            placeholder={`${i + 1}`}
                            defaultValue={defaultValues[i]}
                            onChange={e => {
                              const values: number[] = [];
                              const currentInputs =
                                document.querySelectorAll(`input[data-column]`);

                              // 收集所有输入框的值
                              currentInputs.forEach((input, index) => {
                                const value =
                                  parseInt((input as HTMLInputElement).value) ||
                                  1;
                                values[index] = value;
                              });

                              // 生成 gridTemplateColumns
                              const gridTemplateColumns = values
                                .map(v => `${v}fr`)
                                .join(' ');

                              if (values.every(v => v > 0)) {
                                setRowAttrsV2({
                                  style: {
                                    ...(currRow?.style || {}),
                                    gridTemplateColumns,
                                  },
                                });
                              }
                            }}
                            data-column={i}
                          />
                        </div>
                      );
                    }
                    return inputs;
                  })()}
                </div>
                <div className='flex gap-2 pt-2'>
                  <button
                    className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50'
                    onClick={() => {
                      // 重置为等比例
                      const columnCount = listColumnCount;
                      const gridTemplateColumns = Array(columnCount)
                        .fill('1fr')
                        .join(' ');
                      setRowAttrsV2({
                        style: {
                          ...(currRow?.style || {}),
                          gridTemplateColumns,
                        },
                      });
                    }}
                  >
                    重置
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
