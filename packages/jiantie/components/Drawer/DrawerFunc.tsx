/* eslint-disable prefer-const */
import React, { useEffect } from 'react';
import { setupModal } from './DrawerSetup';
import { ResponsiveDialogProps } from '@workspace/ui/components/responsive-dialog';

const GenerteID = () => String(Date.now());

export const CloseDrawer = (id: ModalID) => {
  setupModal().then(modalManagerEntity => {
    modalManagerEntity.close(id);
  });
};

export type ModalID = string | number;
export interface ShowModalParams extends ResponsiveDialogProps {
  id?: any;
}

export function initDrawer() {
  setupModal();
}

export function SetDrawer(id: ModalID, params: Partial<ShowModalParams>) {
  setupModal().then(modalManagerEntity => {
    modalManagerEntity.set(id, params as ShowModalParams);
  });
}

/**
 * Show Global Modal
 */
export function ShowDrawerV2(params: Partial<ShowModalParams>) {
  let options = { ...params } as ShowModalParams;
  const { id } = options;

  const entityId = (id || GenerteID()) as ModalID;
  options.id = entityId;

  options = {
    ...options,
    isOpen: true,
  };

  /** 用于检查是否已经渲染了最外层 div */
  setupModal().then(modalManagerEntity => {
    modalManagerEntity.show(entityId, options);
  });
}
