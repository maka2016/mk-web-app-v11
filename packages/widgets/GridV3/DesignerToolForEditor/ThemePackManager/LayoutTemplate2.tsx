import React, { useEffect, useRef, useState } from 'react';
import qs from 'qs';
import styled from '@emotion/styled';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useThemePackContext } from './ThemeProvider';
import {
  getThemePackMaterialItems,
  MaterialItem,
  removeThemePackLayout,
  updateMaterialItem,
  createThemePackLayout,
  ThemePack,
} from './services';
import { useGridContext } from '../../comp/provider';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender';
import UpdateMaterialItemForm from '../MaterialResourceManager/UpdateMaterialItemForm';
import { scrollToActiveRow } from '../../shared';

export const UpdateFormDiv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 0 0;
  .settingItem {
    padding: 0 16px;
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

const limit = 50;

export default function LayoutTemplate2({
  selectedThemePack,
}: {
  selectedThemePack: ThemePack;
}) {
  const {
    addRowFromTemplate,
    addRowFromTemplateV2,
    getRowByDepth,
    editorSDK,
    useGridV2,
    widgetState,
    widgetStateV2,
    getCopyRowCodeV2,
  } = useGridContext();
  const { selectedMaterialChannel } = useThemePackContext();
  const [page, setPage] = useState(1);
  const [list, setList] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [editMaterialItem, setEditMaterialItem] = useState<MaterialItem>();
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [total, setTotal] = useState(0);

  // 素材列表
  const getMaterials = async () => {
    setLoading(true);
    if (!selectedThemePack?.documentId) {
      setList([]);
      setLoading(false);
      return;
    }

    const res = await getThemePackMaterialItems(
      selectedThemePack.documentId,
      activeFloorId,
      {
        page,
        pageSize: limit,
      }
    );
    if (res?.data) {
      setList(res.data);
      setTotal(res.meta.pagination.total);
      setLoading(false);
    }
  };

  const onChangeFloor = (id: string) => {
    setActiveFloorId(id);
    setPage(1);
  };

  useEffect(() => {
    getMaterials();
  }, [selectedThemePack, page, activeFloorId]);

  return (
    <>
      <LayoutTemplateRender
        onItemClick={materialItem => {
          if (useGridV2) {
            const { copiedRowDepth } = addRowFromTemplateV2(
              materialItem.content,
              {
                activeRowDepth: [widgetStateV2.activeRowDepth?.[0] || 0],
              }
            );
            if (copiedRowDepth) {
              const newRowId = getRowByDepth(copiedRowDepth);
              scrollToActiveRow(newRowId?.id);
            }
          } else {
            const newRowId = addRowFromTemplate(materialItem.content);
            editorSDK?.changeWidgetState({
              editingElemId: undefined,
              activeCellId: undefined,
              activeRowId: newRowId?.[0],
            });
            scrollToActiveRow(newRowId?.[0]);
          }
        }}
        onSettingMaterial={materialItem => {
          setEditMaterialItem(materialItem);
          setShowUpdateForm(true);
        }}
        onRemoveMaterial={materialItem => {
          removeThemePackLayout(materialItem.documentId);
        }}
        onChangeFloor={onChangeFloor}
        activeFloorId={activeFloorId}
        floors={selectedMaterialChannel?.material_tags || []}
        materials={list}
        loading={loading}
        currentPage={page}
        pageSize={limit}
        total={total}
        onPageChange={page => {
          setPage(page);
        }}
      />
      <ResponsiveDialog
        isOpen={showUpdateForm}
        onOpenChange={() => setShowUpdateForm(false)}
        title='设置'
      >
        <UpdateMaterialItemForm
          defaultContent={
            widgetStateV2.activeRowDepth?.[0]
              ? getCopyRowCodeV2({
                  activeRowDepth: [widgetStateV2.activeRowDepth?.[0]],
                })
              : undefined
          }
          materialItem={editMaterialItem}
          categories={selectedMaterialChannel?.material_tags || []}
          onClose={() => setShowUpdateForm(false)}
          onSubmit={async submitData => {
            if (editMaterialItem) {
              await updateMaterialItem(editMaterialItem.documentId, submitData);
            } else {
              await createThemePackLayout(submitData);
            }
            getMaterials();
            setShowUpdateForm(false);
          }}
          selectedCategory={activeFloorId}
        />
      </ResponsiveDialog>
    </>
  );
}
