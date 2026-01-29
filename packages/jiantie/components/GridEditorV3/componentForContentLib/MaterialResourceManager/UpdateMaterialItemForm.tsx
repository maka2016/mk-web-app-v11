import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as z from 'zod';
import { useWorksStore } from '../../works-store/store/hook';
import { MaterialCoverUploader } from './MaterialCoverUploader';
import MaterialFloorManager from './MaterialFloorManager';
import {
  MaterialFloor,
  MaterialItem,
  MaterialResourceManagerAPI,
} from './services';

// 表单验证 schema
const formSchema = z.object({
  name: z
    .string()
    .min(1, '请输入版式名称')
    .max(50, '版式名称不能超过50个字符')
    .trim(),
  author: z
    .string()
    .min(1, '请输入作者名称')
    .max(30, '作者名称不能超过30个字符')
    .trim(),
  cover_url: z.string().optional(),
  content: z
    .string()
    .min(1, '请输入版式内容')
    .refine((val: string) => {
      if (!val.trim()) return false;
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('内容必须是有效的JSON对象');
        }
        return true;
      } catch (error) {
        return false;
      }
    }, '版式内容格式错误，请检查JSON格式'),
  material_tags: z
    .array(z.string())
    .min(1, '请至少选择一个分类')
    .max(5, '最多只能选择5个分类'),
});

type FormData = z.infer<typeof formSchema>;

interface LayoutFormProps {
  materialItem?: MaterialItem | null;
  selectedCategory?: string;
  onClose: () => void;
  onSubmit: (submitData: any) => void;
  /** 默认填充的JSON内容 */
  defaultContent?: any;
  materialManager?: MaterialResourceManagerAPI;
  /** 提示信息 */
  msg?: string;
  activeBlockId?: string;
}

export default function UpdateMaterialItemForm({
  materialItem,
  selectedCategory,
  defaultContent,
  msg,
  onClose,
  onSubmit,
  materialManager,
}: LayoutFormProps) {
  const worksStore = useWorksStore();
  const { designerInfo } = worksStore;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedCategoryData, setSelectedCategoryData] =
    useState<MaterialFloor | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      author: designerInfo.fullName,
      cover_url: '',
      content: '',
      material_tags: [],
    },
    mode: 'onChange', // 改为 onChange 模式，更及时地更新验证状态
  });

  // 递归查找分类数据
  const findCategoryById = (
    categoryId: string,
    categoryList: MaterialFloor[]
  ): MaterialFloor | null => {
    for (const category of categoryList) {
      if (category.documentId === categoryId) {
        return category;
      }
      if (category.children_floor && category.children_floor.length > 0) {
        const found = findCategoryById(categoryId, category.children_floor);
        if (found) return found;
      }
    }
    return null;
  };

  // 根据分类ID加载并设置分类数据
  const loadAndSetCategory = async (categoryId: string | undefined) => {
    if (!categoryId || !materialManager) return;

    try {
      const categories = await materialManager.getAllFloorsRecursively();
      const category = findCategoryById(categoryId, categories);
      if (category) {
        setSelectedCategoryData(category);
      }
    } catch (error) {
      console.error('加载分类数据失败:', error);
    }
  };

  // 初始化表单数据
  useEffect(() => {
    if (materialItem) {
      const categoryId =
        materialItem.material_tags?.[0]?.documentId || selectedCategory;
      form.reset({
        name: materialItem.name || '',
        author: materialItem.author || designerInfo.fullName || '',
        cover_url: materialItem.cover_url || '',
        content: JSON.stringify(materialItem.content || {}, null, 2),
        material_tags: [categoryId],
      });
      // 加载并设置分类数据
      if (categoryId) {
        loadAndSetCategory(categoryId);
      }
    } else {
      let content = defaultContent;
      if (typeof content === 'object') {
        content = JSON.stringify(defaultContent, null, 2);
      }
      form.reset({
        name: '',
        author: designerInfo.fullName,
        cover_url: '',
        content: content,
        material_tags: selectedCategory ? [selectedCategory] : [],
      });
      // 加载并设置分类数据
      if (selectedCategory) {
        loadAndSetCategory(selectedCategory);
      }
    }
  }, []);

  // 监听 material_tags 变化，更新 selectedCategoryData
  const currentCategoryId = form.watch('material_tags')?.[0];
  useEffect(() => {
    if (
      currentCategoryId &&
      currentCategoryId !== selectedCategoryData?.documentId
    ) {
      loadAndSetCategory(currentCategoryId);
    }
  }, [currentCategoryId]);

  // 处理分类选择
  const handleCategoryChange = (
    categoryId: string,
    floor: MaterialFloor | null
  ) => {
    console.log('categoryId', categoryId, 'floor', floor);
    form.setValue('material_tags', [categoryId]);
    setSelectedCategoryData(floor);
    setIsCategoryDialogOpen(false);
  };

  // 获取当前选中的分类名称
  const getSelectedCategoryName = (): string => {
    return selectedCategoryData?.name || '请选择分类';
  };

  // 提交表单
  const handleSubmit = async (data: FormData) => {
    console.log('data', data);
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        name: data.name,
        author: data.author,
        cover_url: data.cover_url,
        content: JSON.parse(data.content),
        material_tags: {
          set: data.material_tags,
        },
      };

      // 等待 onSubmit 完成
      await onSubmit(submitData);

      // 显示成功提示
      toast.success(materialItem ? '保存成功' : '创建成功');
    } catch (error) {
      console.error('保存版式失败:', error);
      const errorMessage =
        error instanceof Error ? error.message : '保存失败，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 处理表单验证失败
  const handleSubmitError = (errors: any) => {
    console.log('表单验证失败:', errors);

    // 显示第一个错误信息
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(firstError.message);
    } else {
      toast.error('请检查表单填写是否正确');
    }

    // 滚动到第一个错误字段
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const errorElement = document.querySelector(
        `[name="${firstErrorField}"]`
      );
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
    }
  };

  // 检查表单是否有效
  const isFormValid = form.formState.isValid;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  if (error) {
    return <div className='p-4'>{error}</div>;
  }

  return (
    <div className='p-4 max-w-full max-h-[90vh] h-full overflow-y-auto'>
      {msg && (
        <Alert variant='default' className='mb-4 text-blue-500 py-2 font-bold'>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant='destructive' className='mb-4'>
          <AlertTitle>提交失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...(form as any)}>
        <form
          onSubmit={e => {
            e.stopPropagation();
            e.preventDefault();
            console.log('表单提交事件触发');
            // form.handleSubmit(handleSubmit, handleSubmitError)(e);
          }}
          className='flex flex-col relative h-full'
        >
          <div className='flex-1'>
            {/* 基本信息 */}
            <div className='grid grid-cols-1 gap-4'>
              <FormField
                control={form.control as any}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      名称 <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='请输入版式名称' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name='author'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      作者 <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='请输入作者名称' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 封面图片 */}
              <FormField
                control={form.control as any}
                name='cover_url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      封面图片 <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <MaterialCoverUploader
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 分类选择 */}
              <FormField
                control={form.control as any}
                name='material_tags'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      所属分类 <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Button
                        type='button'
                        variant='outline'
                        className='w-full justify-between'
                        onClick={() => setIsCategoryDialogOpen(true)}
                      >
                        <span
                          className={
                            selectedCategoryData ? '' : 'text-gray-400'
                          }
                        >
                          {getSelectedCategoryName()}
                        </span>
                        <ChevronDown className='h-4 w-4 opacity-50' />
                      </Button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 版式内容 */}
              <FormField
                control={form.control as any}
                name='content'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      内容 (JSON)
                      <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='请输入版式内容的JSON格式数据'
                        className='font-mono text-sm h-[120px]'
                        rows={12}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {/* 操作按钮 */}
          <div className='flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white'>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>

            <Button
              type='submit'
              disabled={hasErrors}
              title={!isFormValid ? '请完善表单信息' : ''}
              onClick={e => {
                form.handleSubmit(handleSubmit, handleSubmitError)(e);
              }}
            >
              {loading ? '保存中...' : materialItem ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </Form>

      {/* 分类选择弹窗 */}
      <ResponsiveDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        title='选择分类'
        contentProps={{
          className: 'max-w-[600px] w-full max-h-[90vh] h-full overflow-y-auto',
        }}
      >
        <div className='p-4'>
          <MaterialFloorManager
            materialManager={materialManager}
            mode='selector'
            selectedFloorId={form.watch('material_tags')?.[0]}
            onFloorSelect={handleCategoryChange}
            className='w-full'
            placeholder='搜索分类...'
            showSearch={true}
            showRefresh={false}
            showCreateEdit={false}
          />
        </div>
      </ResponsiveDialog>
    </div>
  );
}
