import { useTranslations } from 'next-intl';
import { IconInput2, IconInput2Size } from '../../components/icon-input2';
import { useWorksStore } from '../../works-store/store/hook';

export default function ListSettingForUser({
  size,
}: {
  size?: IconInput2Size;
}) {
  const t = useTranslations('GridEditor');
  const worksStore = useWorksStore();
  const {
    setRowAttrsV2,
    getActiveRow,
    handleChangeRepeatList,
    handleChangeTableView,
  } = worksStore.gridPropsOperator;
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
      {isTableView && (
        <div className='flex items-center flex-1'>
          <IconInput2
            placeholder={t('列')}
            size={size}
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
      )}
      {isTableView ? (
        <div className='flex items-center flex-1'>
          <IconInput2
            placeholder={t('行')}
            size={size}
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
          <IconInput2
            placeholder={t('项')}
            size={size}
            icon2={
              <div className='flex items-center justify-center gap-1'>
                <span>{t('项')}</span>
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
    </div>
  );
}
