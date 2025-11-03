import React, { useEffect, useState } from 'react';
import {
  Folder,
  FolderPlus,
  MoreVertical,
  Trash,
  Search,
  Upload,
  ChevronRight,
  Home,
  RefreshCw,
  Plus,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  createFolder,
  deleteFolder,
  getFolders,
  updateFolder,
  getFiles,
  deleteFile,
  uploadFile,
  type FolderItem,
  type FileItem,
  type UploadFileParams,
} from '@mk/services';
import { toast } from 'react-hot-toast';
import { cdnApi } from '@mk/services';
import styled from '@emotion/styled';
import cls from 'classnames';

interface CreateFolderData {
  name: string;
  parentId?: number;
}

// 主容器样式
export const FolderManagerRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 70vh;
  max-height: 70vh;
  overflow: hidden;
`;

// 文件网格样式
export const FileGridRoot = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 12px;
  overflow-y: auto;
  max-height: 100%;

  .file_item {
    position: relative;
    max-width: 100%;
    min-height: 100px;
    width: 100%;
    overflow: hidden;
    border-radius: 4px;
    aspect-ratio: 1/1;
    cursor: pointer;
    border: 1px solid #01070d0a;
    background-image: url('https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png');
    background-repeat: repeat;

    &:hover {
      background-color: #f5f5f5;
      .action_btns {
        opacity: 1;
      }
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .name {
      position: absolute;
      bottom: 8px;
      left: 8px;
      padding: 0 2px;
      background: #01070d66;
      color: #fff;
      font-size: 11px;
      font-weight: 400;
      text-align: center;
      height: 16px;
      border-radius: 2.5px;
      max-width: calc(100% - 16px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .action_btns {
      opacity: 0;
      position: absolute;
      top: 0;
      right: 0;
      background-color: rgba(0, 0, 0, 0.6);
      border-radius: 2.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #fff;
    }
  }
`;

export default function FolderManager() {
  const [parentFolders, setParentFolders] = useState<FolderItem[]>([]);
  const [childFolders, setChildFolders] = useState<FolderItem[]>([]);
  const [selectedParent, setSelectedParent] = useState<FolderItem | null>(null);
  const [selectedChild, setSelectedChild] = useState<FolderItem | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFolderForEdit, setSelectedFolderForEdit] =
    useState<FolderItem | null>(null);
  const [formData, setFormData] = useState<CreateFolderData>({
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingParent, setIsCreatingParent] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadFiles(selectedChild.id);
    } else {
      setFiles([]);
    }
  }, [selectedChild]);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      await loadParentFolders();
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error('加载文件夹失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取父级文件夹列表
  const loadParentFolders = async () => {
    try {
      const response = await getFolders(0); // 获取根目录文件夹
      const parentList = response || [];
      setParentFolders(parentList);

      // 如果当前选中的父级不在新的父级列表中，清空选择
      if (selectedParent && !parentList.find(p => p.id === selectedParent.id)) {
        setSelectedParent(null);
        setChildFolders([]);
        setSelectedChild(null);
      }
    } catch (error) {
      console.error('Failed to load parent folders:', error);
      toast.error('加载父级文件夹失败');
    }
  };

  // 获取指定父级下的子级文件夹
  const loadChildFolders = async (parentId: number) => {
    try {
      const response = await getFolders(parentId);
      const childList = response || [];
      setChildFolders(childList);
    } catch (error) {
      console.error('Failed to load child folders:', error);
      toast.error('加载子级文件夹失败');
    }
  };

  const handleParentSelect = (parent: FolderItem) => {
    setSelectedParent(parent);
    setSelectedChild(null);
    loadChildFolders(parent.id);
  };

  const handleChildSelect = (child: FolderItem) => {
    setSelectedChild(child);
  };

  const handleCreateFolder = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }

    setIsLoading(true);
    try {
      const parentId = isCreatingParent ? 0 : selectedParent?.id || 0;
      await createFolder(formData.name, parentId);
      setFormData({ name: '' });
      setIsCreateDialogOpen(false);

      // 根据创建的类型刷新相应的数据
      if (isCreatingParent) {
        await loadParentFolders();
      } else if (selectedParent) {
        await loadChildFolders(selectedParent.id);
      }

      toast.success('创建文件夹成功');
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('创建文件夹失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFolder = async () => {
    if (!selectedFolderForEdit || !formData.name.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }

    setIsLoading(true);
    try {
      await updateFolder(selectedFolderForEdit.id, formData.name);
      setFormData({ name: '' });
      setIsEditDialogOpen(false);
      setSelectedFolderForEdit(null);

      // 根据编辑的文件夹类型刷新相应的数据
      const isParentFolder = selectedFolderForEdit.parentId === 0;
      if (isParentFolder) {
        await loadParentFolders();
      } else if (selectedParent) {
        await loadChildFolders(selectedParent.id);
      }

      toast.success('更新文件夹成功');
    } catch (error) {
      console.error('Failed to update folder:', error);
      toast.error('更新文件夹失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!confirm(`确定要删除文件夹 "${folder.name}" 吗？`)) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteFolder(folder.id);

      // 根据删除的文件夹类型刷新相应的数据
      const isParentFolder = folder.parentId === 0;
      if (isParentFolder) {
        await loadParentFolders();
        // 如果删除的是当前选中的父级，清空选择
        if (selectedParent?.id === folder.id) {
          setSelectedParent(null);
          setChildFolders([]);
          setSelectedChild(null);
        }
      } else if (selectedParent) {
        await loadChildFolders(selectedParent.id);
        // 如果删除的是当前选中的子级，清空选择
        if (selectedChild?.id === folder.id) {
          setSelectedChild(null);
        }
      }

      toast.success('删除文件夹成功');
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('删除文件夹失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async (folderId: number) => {
    try {
      const response = await getFiles({
        folderId,
        page: 1,
        pageSize: 100,
      });
      setFiles(response.data || []);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error('加载文件失败');
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || !selectedChild) return;

    try {
      const uploadTasks = Array.from(files).map(file => {
        const params: UploadFileParams = {
          originName: file.name,
          file,
          folderId: selectedChild.id,
          type: 'picture',
        };
        return uploadFile(params);
      });

      await Promise.all(uploadTasks);
      event.target.value = '';
      await loadFiles(selectedChild.id);
      toast.success('文件上传成功');
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('文件上传失败');
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!selectedChild) return;

    if (!confirm('确定要删除这个文件吗？')) {
      return;
    }

    try {
      await deleteFile(fileId, selectedChild.id);
      await loadFiles(selectedChild.id);
      toast.success('文件删除成功');
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('文件删除失败');
    }
  };

  const openEditDialog = (folder: FolderItem) => {
    setSelectedFolderForEdit(folder);
    setFormData({
      name: folder.name,
    });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = (isParent: boolean) => {
    setIsCreatingParent(isParent);
    setFormData({ name: '' });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setSelectedFolderForEdit(null);
  };

  return (
    <FolderManagerRoot>
      {/* Header */}
      <div className='flex items-center justify-between p-2 border-b gap-2 flex-shrink-0 bg-white'>
        <div className='flex items-center gap-1'>
          <Button
            onClick={loadFolders}
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            onClick={() => openCreateDialog(true)}
            variant='outline'
            size='sm'
            className='h-7 text-sm px-2'
          >
            <Plus />
            新建父级
          </Button>
          {selectedParent && (
            <Button
              onClick={() => openCreateDialog(false)}
              variant='outline'
              size='sm'
              className='h-7 text-sm px-2'
            >
              <Plus />
              新建子级
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='flex-1 flex min-h-0'>
        {/* Left Column - Parent Folders */}
        <div className='w-1/2 border-r bg-gray-50 flex flex-col'>
          <div className='p-2 border-b bg-white'>
            <h3 className='text-sm font-medium text-gray-700'>父级文件夹</h3>
          </div>
          <div className='flex-1 p-2 overflow-y-auto min-h-0'>
            {isLoading ? (
              <div className='flex items-center justify-center h-full'>
                <div className='flex flex-col items-center gap-1 text-gray-400'>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  <span className='text-sm'>加载中...</span>
                </div>
              </div>
            ) : parentFolders.length > 0 ? (
              <div className='space-y-2'>
                {parentFolders.map(folder => (
                  <div
                    key={folder.id}
                    className={`group flex items-center gap-2 p-1 bg-white border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedParent?.id === folder.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50 hover:shadow-md'
                    }`}
                    onClick={() => handleParentSelect(folder)}
                  >
                    <Folder className='h-4 w-4 text-gray-400 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-sm truncate'>
                        {folder.name}
                      </div>
                    </div>
                    <div className='flex opacity-0 group-hover:opacity-100 transition-opacity gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={e => {
                          e.stopPropagation();
                          openEditDialog(folder);
                        }}
                        className='h-6 w-6 p-0'
                      >
                        编辑
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        className='h-6 w-6 p-0 text-red-600'
                      >
                        删除
                      </Button>
                    </div>
                    <ChevronRight className='h-4 w-4 text-gray-400 flex-shrink-0' />
                  </div>
                ))}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-2'>
                <Folder className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-0.5 text-base'>
                    暂无父级文件夹
                  </p>
                  <p className='text-sm text-gray-400'>
                    点击上方按钮创建第一个父级文件夹
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Child Folders and Files */}
        <div className='w-1/2 flex flex-col'>
          <div className='p-2 border-b bg-white'>
            <h3 className='text-sm font-medium text-gray-700'>
              子级文件夹
              {selectedParent && (
                <span className='text-gray-500 ml-1'>
                  ({selectedParent.name})
                </span>
              )}
            </h3>
          </div>
          <div className='flex-1 p-2 overflow-y-auto min-h-0 bg-gray-50'>
            {!selectedParent ? (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-2'>
                <Folder className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-0.5 text-base'>
                    请选择父级文件夹
                  </p>
                  <p className='text-sm text-gray-400'>
                    在左侧选择一个父级文件夹查看其子级文件夹
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className='flex items-center justify-center h-full'>
                <div className='flex flex-col items-center gap-1 text-gray-400'>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  <span className='text-sm'>加载中...</span>
                </div>
              </div>
            ) : childFolders.length > 0 ? (
              <div className='space-y-2'>
                {childFolders.map(folder => (
                  <div
                    key={folder.id}
                    className={`group flex items-center gap-2 p-1 bg-white border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedChild?.id === folder.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50 hover:shadow-md'
                    }`}
                    onClick={() => handleChildSelect(folder)}
                  >
                    <Folder className='h-4 w-4 text-gray-400 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-sm truncate'>
                        {folder.name}
                      </div>
                    </div>
                    <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={e => {
                          e.stopPropagation();
                          openEditDialog(folder);
                        }}
                        className=''
                      >
                        编辑
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        className='text-red-600'
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-2'>
                <Folder className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-0.5 text-base'>
                    暂无子级文件夹
                  </p>
                  <p className='text-sm text-gray-400'>
                    点击上方按钮为当前父级创建子级文件夹
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Files Section */}
      {selectedChild && (
        <div className='border-t bg-white flex-shrink-0'>
          <div className='p-2 border-b bg-gray-50'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium text-gray-700'>
                文件列表 ({selectedChild.name})
              </h3>
              <div className='flex items-center gap-2'>
                <Input
                  type='file'
                  className='hidden'
                  id='file-upload'
                  onChange={handleFileUpload}
                  accept='image/*'
                  multiple
                />
                <label htmlFor='file-upload' className='cursor-pointer'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-sm'
                    type='button'
                  >
                    <Upload className='h-4 w-4 mr-1' />
                    上传文件
                  </Button>
                </label>
              </div>
            </div>
          </div>
          <div className='h-48 overflow-y-auto'>
            {files.length > 0 ? (
              <FileGridRoot>
                {files.map(file => (
                  <div key={file.id} className='file_item'>
                    <div className='h-full w-full overflow-hidden'>
                      {file.url ? (
                        <img
                          width={300}
                          height={300}
                          src={cdnApi(file.url, {
                            resizeWidth: 300,
                            format: 'webp',
                          })}
                          alt={file.originName}
                        />
                      ) : (
                        <div className='flex items-center justify-center w-full h-full'>
                          <ImageIcon />
                        </div>
                      )}
                    </div>
                    <div className='name'>{file.originName}</div>
                    <div className='action_btns'>
                      <Button
                        variant='destructive'
                        size='icon'
                        className='h-7 w-7'
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                      >
                        <Trash className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                ))}
              </FileGridRoot>
            ) : (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-2'>
                <Upload className='h-8 w-8' />
                <p>当前文件夹暂无文件</p>
                <label htmlFor='file-upload' className='cursor-pointer'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-sm'
                    type='button'
                  >
                    <Upload className='h-4 w-4 mr-1' />
                    上传文件
                  </Button>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <ResponsiveDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={open => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}
        title={isCreatingParent ? '新建父级文件夹' : '新建子级文件夹'}
        contentProps={{
          className: 'max-w-[400px] w-full',
        }}
      >
        <div className='space-y-3 p-4'>
          {!isCreatingParent && selectedParent && (
            <div className='p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700'>
              将在父级文件夹 &quot;{selectedParent.name}&quot; 下创建子级文件夹
            </div>
          )}
          <div>
            <label className='block text-sm font-medium mb-1'>名称 *</label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入名称'
              className='w-full h-8 text-sm'
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-sm px-3'
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              size='sm'
              className='h-7 text-sm px-3'
              onClick={handleCreateFolder}
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Edit Dialog */}
      <ResponsiveDialog
        isOpen={isEditDialogOpen}
        onOpenChange={open => {
          setIsEditDialogOpen(open);
          if (!open) resetForm();
        }}
        title='编辑文件夹'
        contentProps={{
          className: 'max-w-[400px] w-full',
        }}
      >
        <div className='space-y-3 p-4'>
          <div>
            <label className='block text-sm font-medium mb-1'>名称 *</label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入名称'
              className='w-full h-8 text-sm'
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleUpdateFolder();
                }
              }}
            />
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-sm px-3'
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              size='sm'
              className='h-7 text-sm px-3'
              onClick={handleUpdateFolder}
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? '更新中...' : '更新'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </FolderManagerRoot>
  );
}
