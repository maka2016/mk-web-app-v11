/**
 * DialogManager: 全局管理所有 Dialog 的打开/关闭和事件订阅
 *
 * @deprecated 此文件已废弃，请使用 @workspace/ui/components/ShowDrawerV2 的 Context API
 * - 使用 useModals() Hook 在组件中管理 Modal
 * - 使用 GetOpenModalIds() 和 CloseAllModals() 作为命令式 API
 */

export type DialogState = {
  id: string;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

type DialogListener = (id: string, isOpen: boolean) => void;

class DialogManagerClass {
  private dialogs = new Map<string, DialogState>();
  private listeners = new Set<DialogListener>();

  register(id: string, state: DialogState) {
    this.dialogs.set(id, state);
    this.notify(id, state.isOpen);
  }

  unregister(id: string) {
    this.dialogs.delete(id);
  }

  openDialog(id: string) {
    const dialog = this.dialogs.get(id);
    if (dialog && !dialog.isOpen) {
      dialog.open();
      this.notify(id, true);
    }
  }

  closeDialog(id: string) {
    const dialog = this.dialogs.get(id);
    if (dialog && dialog.isOpen) {
      dialog.close();
      this.notify(id, false);
    }
  }

  subscribe(listener: DialogListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getDialogIds() {
    return Array.from(this.dialogs.keys());
  }

  getOpenDialogIds() {
    return Array.from(this.dialogs.entries())
      .filter(([_, state]) => state.isOpen)
      .map(([id, _]) => id);
  }

  getAllDialogIds() {
    return Array.from(this.dialogs.keys());
  }

  getDialogState(id: string) {
    return this.dialogs.get(id);
  }

  private notify(id: string, isOpen: boolean) {
    this.listeners.forEach(listener => listener(id, isOpen));
  }
}

const DialogManager = new DialogManagerClass();
export default DialogManager;
