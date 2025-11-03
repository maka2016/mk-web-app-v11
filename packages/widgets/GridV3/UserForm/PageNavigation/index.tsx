import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import ThemePages from './themePages';
import { EditorSDK, IPositionLink } from '@mk/works-store/types';
import { useGridContext } from '../../comp/provider';
import { scrollToActiveRow } from '../../shared';

interface Props {
  onClose: () => void;
  onChange: () => void;
}

const PageNavigation = (props: Props) => {
  const { editorSDK, widgetState, addRowFromTemplate, cellsMap } =
    useGridContext();
  const { onClose, onChange } = props;

  if (!editorSDK || !widgetState) {
    return null;
  }

  return (
    <div className={styles.pageNavigation}>
      <ThemePages
        templateId={editorSDK.fullSDK.worksDetail.template_id}
        onChange={data => {
          const newRowId = addRowFromTemplate(data.content, {
            activeRowId: widgetState.activeRowId || cellsMap[0].id,
          });
          onChange();
          onClose();
          editorSDK.changeWidgetState({
            activeRowId: newRowId?.[0],
            activeCellId: undefined,
            editingElemId: undefined,
          });
          scrollToActiveRow(newRowId?.[0]);
        }}
      />
    </div>
  );
};

export default PageNavigation;
