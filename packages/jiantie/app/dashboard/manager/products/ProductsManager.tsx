'use client';

import { trpcReact } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Textarea } from '@workspace/ui/components/textarea';
import { cn } from '@workspace/ui/lib/utils';
import { Edit, Loader2, Plus, Settings2, Trash2 } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';

export interface ProductsManagerProps {
  className?: string;
}

type ProductPackageRow = {
  modulo: number;
  name: string | null;
  description: string | null;
  status: string;
  sort_order: number;
  appid: string;
  create_time: Date;
  update_time: Date;
  products: { id: string }[];
};

type ProductRow = {
  id: string;
  appid: string;
  name: string;
  alias: string;
  price: number;
  currency: string;
  status: string;
  sort_order: number;
  packages: { modulo: number; name: string | null }[];
  i18nInfo?: unknown;
  third_product_meta?: unknown;
  shipping_config?: unknown;
};

type PermissionRow = {
  id: number;
  action_url: string;
  alias: string | null;
  description: string | null;
  value: number | null;
};

type RolePermissionRow = {
  permission: PermissionRow;
};

type RoleRow = {
  id: number;
  appid: string;
  name: string | null;
  alias: string | null;
  description: string | null;
  create_time: Date;
  update_time: Date;
  rolePermissions: RolePermissionRow[];
  userRoles: { uid: number }[];
};

/** 发货配置快捷模版：VIP（角色+有效期，含 duration/privileges 供前端展示） */
const SHIPPING_TEMPLATE_VIP = {
  duration: '365',
  privileges: '[]',
  validity: { type: 'days' as const, value: 365 },
  roles: [1],
};

/** 发货配置快捷模版：作品（资源类型 works，从订单 trace_metadata 取作品 id 发货） */
const SHIPPING_TEMPLATE_WORKS = {
  resource: [{ resource_type: 'works' }],
  validity: { type: 'forever' as const, value: 0 },
};

const APPIDS = ['jiantie', 'maka', 'avite'] as const;
const CURRENCIES = [
  { value: 'CNY', label: 'CNY（人民币）' },
  { value: 'USD', label: 'USD（美元）' },
] as const;
const STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
  { value: 'deleted', label: '已删除' },
] as const;

export function ProductsManager(props: ProductsManagerProps) {
  const { className } = props;
  const [activeTab, setActiveTab] = React.useState<'package' | 'product' | 'role' | 'rolePermissionConfig'>(
    'package'
  );
  const [filterAppid, setFilterAppid] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');

  const pkgListQuery = trpcReact.adminProduct.productPackageList.useQuery({
    appid: filterAppid === 'all' ? undefined : filterAppid,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });
  const productListQuery = trpcReact.adminProduct.productList.useQuery({
    appid: filterAppid === 'all' ? undefined : filterAppid,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const pkgList = (pkgListQuery.data ?? []) as ProductPackageRow[];
  const productList = (productListQuery.data ?? []) as ProductRow[];

  // 角色 & 权限
  const roleListQuery = trpcReact.rolePermission.roleFindMany.useQuery(
    {
      appid: filterAppid === 'all' ? undefined : filterAppid,
    },
    {
      enabled: activeTab === 'role',
    }
  );
  const permissionListQuery = trpcReact.rolePermission.permissionFindMany.useQuery(
    {
      keyword: undefined,
    },
    {
      enabled: activeTab === 'role',
    }
  );
  const roles = (roleListQuery.data ?? []) as RoleRow[];
  const permissions = (permissionListQuery.data ?? []) as PermissionRow[];

  // 商品包编辑/新建
  const [pkgDialogOpen, setPkgDialogOpen] = React.useState(false);
  const [editingPkg, setEditingPkg] = React.useState<ProductPackageRow | null>(
    null
  );
  const [pkgForm, setPkgForm] = React.useState({
    modulo: 0,
    name: '',
    description: '',
    status: 'active',
    sort_order: 0,
    appid: 'jiantie',
  });

  const createPkgMut = trpcReact.adminProduct.productPackageCreate.useMutation({
    onSuccess: () => {
      toast.success('创建成功');
      setPkgDialogOpen(false);
      pkgListQuery.refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? '创建失败';
      toast.error(msg);
    },
  });
  const updatePkgMut = trpcReact.adminProduct.productPackageUpdate.useMutation({
    onSuccess: () => {
      toast.success('更新成功');
      setPkgDialogOpen(false);
      pkgListQuery.refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? '更新失败';
      toast.error(msg);
    },
  });

  const openCreatePkg = () => {
    setEditingPkg(null);
    setPkgForm({
      modulo: 0,
      name: '',
      description: '',
      status: 'active',
      sort_order: 0,
      appid: 'jiantie',
    });
    setPkgDialogOpen(true);
  };
  const openEditPkg = (row: ProductPackageRow) => {
    setEditingPkg(row);
    setPkgForm({
      modulo: row.modulo,
      name: row.name ?? '',
      description: row.description ?? '',
      status: row.status,
      sort_order: row.sort_order,
      appid: row.appid,
    });
    setPkgDialogOpen(true);
  };
  const savePkg = () => {
    if (editingPkg) {
      updatePkgMut.mutate({
        modulo: editingPkg.modulo,
        name: pkgForm.name || null,
        description: pkgForm.description || null,
        status: pkgForm.status,
        sort_order: pkgForm.sort_order,
        appid: pkgForm.appid,
      });
    } else {
      if (pkgForm.modulo <= 0) {
        toast.error('请输入有效的 modulo');
        return;
      }
      createPkgMut.mutate({
        modulo: pkgForm.modulo,
        name: pkgForm.name || null,
        description: pkgForm.description || null,
        status: pkgForm.status,
        sort_order: pkgForm.sort_order,
        appid: pkgForm.appid,
      });
    }
  };

  // 商品包 - 配置商品
  const [configProductsPkgModulo, setConfigProductsPkgModulo] = React.useState<
    number | null
  >(null);
  const pkgDetailQuery = trpcReact.adminProduct.productPackageGetByModulo.useQuery(
    { modulo: configProductsPkgModulo! },
    { enabled: configProductsPkgModulo != null }
  );
  const setProductsMut =
    trpcReact.adminProduct.productPackageSetProducts.useMutation({
      onSuccess: () => {
        toast.success('保存成功');
        setConfigProductsPkgModulo(null);
        pkgListQuery.refetch();
      },
      onError: (e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : (e as { message?: string } | null)?.message ?? '保存失败';
        toast.error(msg);
      },
    });
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>(
    []
  );
  React.useEffect(() => {
    if (!pkgDetailQuery.data?.products) return;
    setSelectedProductIds(pkgDetailQuery.data.products.map((p) => p.id));
  }, [pkgDetailQuery.data?.products]);
  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const savePackageProducts = () => {
    if (configProductsPkgModulo == null) return;
    setProductsMut.mutate({
      modulo: configProductsPkgModulo,
      productIds: selectedProductIds,
    });
  };

  // 商品编辑/新建
  const [productDialogOpen, setProductDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductRow | null>(
    null
  );
  const [productForm, setProductForm] = React.useState({
    appid: 'jiantie',
    name: '',
    alias: '',
    price: 0,
    currency: 'CNY',
    is_subscription: false,
    is_trial: false,
    trial_days: null as number | null,
    status: 'active',
    sort_order: 0,
    i18nInfoJson: '{}',
    thirdProductMetaJson: '{}',
    shippingConfigJson: '{}',
  });

  const createProductMut = trpcReact.adminProduct.productCreate.useMutation({
    onSuccess: () => {
      toast.success('创建成功');
      setProductDialogOpen(false);
      productListQuery.refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? '创建失败';
      toast.error(msg);
    },
  });
  const updateProductMut =
    trpcReact.adminProduct.productUpdate.useMutation({
      onSuccess: () => {
        toast.success('更新成功');
        setProductDialogOpen(false);
        productListQuery.refetch();
      },
      onError: (e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : (e as { message?: string } | null)?.message ?? '更新失败';
        toast.error(msg);
      },
    });

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      appid: 'jiantie',
      name: '',
      alias: '',
      price: 0,
      currency: 'CNY',
      is_subscription: false,
      is_trial: false,
      trial_days: null,
      status: 'active',
      sort_order: 0,
      i18nInfoJson: '{}',
      thirdProductMetaJson: '{}',
      shippingConfigJson: '{}',
    });
    setProductDialogOpen(true);
  };
  const openEditProduct = (row: ProductRow) => {
    setEditingProduct(row);
    setProductForm({
      appid: row.appid,
      name: row.name,
      alias: row.alias,
      price: row.price,
      currency: row.currency || 'CNY',
      is_subscription: false,
      is_trial: false,
      trial_days: null,
      status: row.status,
      sort_order: row.sort_order,
      i18nInfoJson:
        row.i18nInfo != null && typeof row.i18nInfo === 'object'
          ? JSON.stringify(row.i18nInfo, null, 2)
          : '{}',
      thirdProductMetaJson:
        row.third_product_meta != null &&
          typeof row.third_product_meta === 'object'
          ? JSON.stringify(row.third_product_meta, null, 2)
          : '{}',
      shippingConfigJson:
        row.shipping_config != null && typeof row.shipping_config === 'object'
          ? JSON.stringify(row.shipping_config, null, 2)
          : '{}',
    });
    setProductDialogOpen(true);
  };
  const applyShippingTemplate = (name: 'vip' | 'works') => {
    const obj =
      name === 'vip'
        ? SHIPPING_TEMPLATE_VIP
        : SHIPPING_TEMPLATE_WORKS;
    setProductForm((f) => ({
      ...f,
      shippingConfigJson: JSON.stringify(obj, null, 2),
    }));
  };
  const saveProduct = () => {
    if (!productForm.name.trim() || !productForm.alias.trim()) {
      toast.error('请填写名称和别名');
      return;
    }
    if (productForm.price < 0) {
      toast.error('价格不能为负');
      return;
    }
    let i18nInfo: Record<string, unknown>;
    let thirdProductMeta: Record<string, unknown> | null = null;
    let shippingConfig: Record<string, unknown>;
    try {
      i18nInfo = JSON.parse(productForm.i18nInfoJson || '{}') as Record<
        string,
        unknown
      >;
    } catch {
      toast.error('i18n JSON 格式无效');
      return;
    }
    try {
      const raw = productForm.thirdProductMetaJson?.trim();
      thirdProductMeta = raw
        ? (JSON.parse(raw) as Record<string, unknown>)
        : null;
    } catch {
      toast.error('三方 meta JSON 格式无效');
      return;
    }
    try {
      const raw = productForm.shippingConfigJson?.trim();
      shippingConfig = raw
        ? (JSON.parse(raw) as Record<string, unknown>)
        : {};
    } catch {
      toast.error('发货配置 JSON 格式无效');
      return;
    }
    if (editingProduct) {
      updateProductMut.mutate({
        id: editingProduct.id,
        appid: productForm.appid,
        name: productForm.name,
        alias: productForm.alias,
        price: productForm.price,
        currency: productForm.currency,
        status: productForm.status,
        sort_order: productForm.sort_order,
        i18nInfo,
        third_product_meta: thirdProductMeta,
        shipping_config: shippingConfig,
      });
    } else {
      createProductMut.mutate({
        appid: productForm.appid,
        name: productForm.name,
        alias: productForm.alias,
        price: productForm.price,
        currency: productForm.currency,
        is_subscription: productForm.is_subscription,
        is_trial: productForm.is_trial,
        trial_days: productForm.trial_days,
        status: productForm.status,
        sort_order: productForm.sort_order,
        i18nInfo,
        third_product_meta: thirdProductMeta,
        shipping_config: shippingConfig,
      });
    }
  };

  const isLoading =
    pkgListQuery.isLoading || productListQuery.isLoading;

  // 角色表单
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleRow | null>(null);
  const [roleForm, setRoleForm] = React.useState({
    appid: 'jiantie',
    name: '',
    alias: '',
    description: '',
  });

  const createRoleMut = trpcReact.rolePermission.roleCreate.useMutation({
    onSuccess: () => {
      toast.success('创建角色成功');
      setRoleDialogOpen(false);
      roleListQuery.refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? '创建失败';
      toast.error(msg);
    },
  });
  const updateRoleMut = trpcReact.rolePermission.roleUpdate.useMutation({
    onSuccess: () => {
      toast.success('更新角色成功');
      setRoleDialogOpen(false);
      roleListQuery.refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? '更新失败';
      toast.error(msg);
    },
  });
  const deleteRoleMut = trpcReact.rolePermission.roleDelete.useMutation({
    onSuccess: () => {
      toast.success('删除角色成功');
      roleListQuery.refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? '删除失败';
      toast.error(msg);
    },
  });

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      appid: filterAppid === 'all' ? 'jiantie' : filterAppid,
      name: '',
      alias: '',
      description: '',
    });
    setRoleDialogOpen(true);
  };

  const openEditRole = (row: RoleRow) => {
    setEditingRole(row);
    setRoleForm({
      appid: row.appid,
      name: row.name ?? '',
      alias: row.alias ?? '',
      description: row.description ?? '',
    });
    setRoleDialogOpen(true);
  };

  const saveRole = () => {
    if (!roleForm.appid || !roleForm.alias) {
      toast.error('请填写应用和别名');
      return;
    }
    if (editingRole) {
      updateRoleMut.mutate({
        id: editingRole.id,
        name: roleForm.name || null,
        alias: roleForm.alias || null,
        description: roleForm.description || null,
      });
    } else {
      createRoleMut.mutate({
        appid: roleForm.appid,
        name: roleForm.name || null,
        alias: roleForm.alias || null,
        description: roleForm.description || null,
      });
    }
  };

  const deleteRole = (row: RoleRow) => {
    if (!window.confirm('确定要删除该角色吗？若已被用户使用将无法删除。')) {
      return;
    }
    deleteRoleMut.mutate({ id: row.id });
  };

  // 权限表单
  const [permissionDialogOpen, setPermissionDialogOpen] = React.useState(false);
  const [editingPermission, setEditingPermission] =
    React.useState<PermissionRow | null>(null);
  const [permissionForm, setPermissionForm] = React.useState({
    action_url: '',
    alias: '',
    description: '',
    value: '' as string | '',
  });

  const createPermissionMut =
    trpcReact.rolePermission.permissionCreate.useMutation({
      onSuccess: () => {
        toast.success('创建权限成功');
        setPermissionDialogOpen(false);
        permissionListQuery.refetch();
      },
      onError: (e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : (e as { message?: string } | null)?.message ?? '创建失败';
        toast.error(msg);
      },
    });
  const updatePermissionMut =
    trpcReact.rolePermission.permissionUpdate.useMutation({
      onSuccess: () => {
        toast.success('更新权限成功');
        setPermissionDialogOpen(false);
        permissionListQuery.refetch();
      },
      onError: (e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : (e as { message?: string } | null)?.message ?? '更新失败';
        toast.error(msg);
      },
    });
  const deletePermissionMut =
    trpcReact.rolePermission.permissionDelete.useMutation({
      onSuccess: () => {
        toast.success('删除权限成功');
        permissionListQuery.refetch();
      },
      onError: (e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : (e as { message?: string } | null)?.message ?? '删除失败';
        toast.error(msg);
      },
    });

  const openCreatePermission = () => {
    setEditingPermission(null);
    setPermissionForm({
      action_url: '',
      alias: '',
      description: '',
      value: '',
    });
    setPermissionDialogOpen(true);
  };

  const openEditPermission = (row: PermissionRow) => {
    setEditingPermission(row);
    setPermissionForm({
      action_url: row.action_url,
      alias: row.alias ?? '',
      description: row.description ?? '',
      value: row.value != null ? String(row.value) : '',
    });
    setPermissionDialogOpen(true);
  };

  const savePermission = () => {
    if (!permissionForm.action_url) {
      toast.error('请填写权限动作URL');
      return;
    }
    const valueNumber =
      permissionForm.value === '' ? null : Number(permissionForm.value);
    if (Number.isNaN(valueNumber as number)) {
      toast.error('权限值必须是数字');
      return;
    }
    if (editingPermission) {
      updatePermissionMut.mutate({
        id: editingPermission.id,
        action_url: permissionForm.action_url,
        alias: permissionForm.alias || null,
        description: permissionForm.description || null,
        value: valueNumber,
      });
    } else {
      createPermissionMut.mutate({
        action_url: permissionForm.action_url,
        alias: permissionForm.alias || null,
        description: permissionForm.description || null,
        value: valueNumber,
      });
    }
  };

  const deletePermission = (row: PermissionRow) => {
    if (!window.confirm('确定要删除该权限吗？若已被使用将无法删除。')) {
      return;
    }
    deletePermissionMut.mutate({ id: row.id });
  };

  // 为角色分配权限
  const [assignRole, setAssignRole] = React.useState<RoleRow | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<
    number[]
  >([]);
  const assignRolePermissionsMut =
    trpcReact.rolePermission.assignRolePermissions.useMutation({
      onSuccess: () => {
        toast.success('角色权限保存成功');
        setAssignRole(null);
        roleListQuery.refetch();
      },
      onError: (e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : (e as { message?: string } | null)?.message ?? '保存失败';
        toast.error(msg);
      },
    });

  const openAssignPermissions = (row: RoleRow) => {
    setAssignRole(row);
    const ids =
      row.rolePermissions?.map(rp => rp.permission.id).filter(id => id != null) ??
      [];
    setSelectedPermissionIds(ids);
  };

  const togglePermissionForRole = (id: number) => {
    setSelectedPermissionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveAssignPermissions = () => {
    if (!assignRole) return;
    assignRolePermissionsMut.mutate({
      roleId: assignRole.id,
      permissionIds: selectedPermissionIds,
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Tabs
        value={activeTab}
        onValueChange={v =>
          setActiveTab(v as 'package' | 'product' | 'role')
        }
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
          <TabsList>
            <TabsTrigger value="package">商品包</TabsTrigger>
            <TabsTrigger value="product">商品</TabsTrigger>
            <TabsTrigger value="role">角色权限</TabsTrigger>
            <TabsTrigger value="rolePermissionConfig">权限配置总览</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Select
              value={filterAppid}
              onValueChange={setFilterAppid}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="应用" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部应用</SelectItem>
                {APPIDS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent
          value="package"
          className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
        >
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle>商品包列表</CardTitle>
              <Button variant="black" size="sm" onClick={openCreatePkg}>
                <Plus className="h-4 w-4 mr-2" />
                新建商品包
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {isLoading && pkgList.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : pkgList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无商品包
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>modulo</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>应用</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>商品数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pkgList.map((row) => (
                      <TableRow key={row.modulo}>
                        <TableCell className="font-mono">{row.modulo}</TableCell>
                        <TableCell>{row.name ?? '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {row.description ?? '-'}
                        </TableCell>
                        <TableCell>{row.appid}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === 'active'
                                ? 'success'
                                : row.status === 'deleted'
                                  ? 'secondary'
                                  : 'warning'
                            }
                          >
                            {STATUS_OPTIONS.find((s) => s.value === row.status)
                              ?.label ?? row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.products.length}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditPkg(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setConfigProductsPkgModulo(row.modulo)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="product"
          className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
        >
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle>商品列表</CardTitle>
              <Button variant="black" size="sm" onClick={openCreateProduct}>
                <Plus className="h-4 w-4 mr-2" />
                新建商品
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {isLoading && productList.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : productList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无商品
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>别名</TableHead>
                      <TableHead>价格</TableHead>
                      <TableHead>应用</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>所属包</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productList.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.alias}
                        </TableCell>
                        <TableCell>
                          {row.price / 100} {row.currency}
                        </TableCell>
                        <TableCell>{row.appid}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === 'active'
                                ? 'success'
                                : row.status === 'deleted'
                                  ? 'secondary'
                                  : 'warning'
                            }
                          >
                            {STATUS_OPTIONS.find((s) => s.value === row.status)
                              ?.label ?? row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.packages.length > 0
                            ? row.packages
                              .map((p) => p.name ?? p.modulo)
                              .join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditProduct(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="role"
          className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <Card className="flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
                <CardTitle>角色管理（用户角色 Role）</CardTitle>
                <Button variant="black" size="sm" onClick={openCreateRole}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建角色
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {roleListQuery.isLoading && roles.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无角色
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>应用</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>别名</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>用户数</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>{row.appid}</TableCell>
                          <TableCell>{row.name ?? '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.alias ?? '-'}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {row.description ?? '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {row.userRoles.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openAssignPermissions(row)}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditRole(row)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deleteRole(row)}
                                disabled={deleteRoleMut.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
                <CardTitle>权限管理（Permission）</CardTitle>
                <Button
                  variant="black"
                  size="sm"
                  onClick={openCreatePermission}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新建权限
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {permissionListQuery.isLoading && permissions.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无权限
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>动作URL</TableHead>
                        <TableHead>别名</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>值</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">
                            {row.id}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.action_url}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.alias ?? '-'}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {row.description ?? '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.value != null ? row.value : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditPermission(row)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deletePermission(row)}
                                disabled={deletePermissionMut.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="rolePermissionConfig"
          className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
        >
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle>角色权限配置总览</CardTitle>
              <p className="text-sm text-muted-foreground">
                查看所有角色及其对应的权限配置，可以快速了解系统的权限分配情况
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {roleListQuery.isLoading && roles.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无角色，请先在&quot;角色权限&quot;Tab 中创建角色
                </div>
              ) : (
                <div className="space-y-6">
                  {roles.map(role => {
                    const rolePermissions = role.rolePermissions || [];
                    const permissionCount = rolePermissions.length;

                    return (
                      <Card key={role.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {role.name || role.alias || `角色 #${role.id}`}
                                </CardTitle>
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {role.appid}
                                </Badge>
                                <Badge variant="info" className="text-xs">
                                  {permissionCount} 个权限
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {role.userRoles.length} 用户
                                </Badge>
                              </div>
                              {role.description && (
                                <p className="text-sm text-muted-foreground">
                                  {role.description}
                                </p>
                              )}
                              {role.alias && role.name !== role.alias && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  别名: {role.alias}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignPermissions(role)}
                            >
                              <Settings2 className="h-4 w-4 mr-2" />
                              配置权限
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {permissionCount === 0 ? (
                            <div className="text-sm text-muted-foreground italic py-4 text-center border-2 border-dashed rounded-md">
                              该角色暂未配置任何权限
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {rolePermissions.map(rp => {
                                const perm = rp.permission;
                                return (
                                  <div
                                    key={perm.id}
                                    className="flex items-start gap-2 p-3 border rounded-md bg-muted/30"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs text-primary font-medium">
                                          {perm.id}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-mono text-xs font-medium truncate">
                                        {perm.action_url}
                                      </p>
                                      {perm.alias && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {perm.alias}
                                        </p>
                                      )}
                                      {perm.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                          {perm.description}
                                        </p>
                                      )}
                                      {perm.value != null && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          值: {perm.value}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 商品包 新建/编辑 */}
      <ResponsiveDialog
        isOpen={pkgDialogOpen}
        onOpenChange={setPkgDialogOpen}
        title={editingPkg ? '编辑商品包' : '新建商品包'}
        contentProps={{ className: 'max-w-md' }}
      >
        <div className="space-y-4 p-4">
          <div>
            <Label>modulo（数字 ID）</Label>
            <Input
              type="number"
              value={pkgForm.modulo || ''}
              onChange={(e) =>
                setPkgForm((f) => ({ ...f, modulo: Number(e.target.value) || 0 }))
              }
              placeholder="如 1、2、3"
              disabled={!!editingPkg}
            />
            {editingPkg && (
              <p className="text-xs text-muted-foreground mt-1">
                创建后不可修改 modulo
              </p>
            )}
          </div>
          <div>
            <Label>名称</Label>
            <Input
              value={pkgForm.name}
              onChange={(e) =>
                setPkgForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="商品包名称"
            />
          </div>
          <div>
            <Label>描述</Label>
            <Input
              value={pkgForm.description}
              onChange={(e) =>
                setPkgForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="商品包描述"
            />
          </div>
          <div>
            <Label>应用</Label>
            <Select
              value={pkgForm.appid}
              onValueChange={(v) => setPkgForm((f) => ({ ...f, appid: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPIDS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>状态</Label>
            <Select
              value={pkgForm.status}
              onValueChange={(v) => setPkgForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>排序</Label>
            <Input
              type="number"
              value={pkgForm.sort_order}
              onChange={(e) =>
                setPkgForm((f) => ({
                  ...f,
                  sort_order: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPkgDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="black"
              onClick={savePkg}
              disabled={createPkgMut.isPending || updatePkgMut.isPending}
            >
              {(createPkgMut.isPending || updatePkgMut.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              保存
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 商品包 - 配置商品 */}
      <ResponsiveDialog
        isOpen={configProductsPkgModulo != null}
        onOpenChange={(open) => !open && setConfigProductsPkgModulo(null)}
        title="配置商品包内商品"
        contentProps={{ className: 'max-w-xl max-h-[80vh]' }}
      >
        <div className="p-4 space-y-4">
          {pkgDetailQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                勾选该商品包包含的商品（可选自当前筛选条件下的商品列表）
              </p>
              <div className="border rounded-md max-h-[320px] overflow-y-auto">
                {productList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    暂无商品，请先在「商品」Tab 下新建
                  </div>
                ) : (
                  <div className="divide-y">
                    {productList.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => toggleProduct(p.id)}
                          className="rounded"
                        />
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {p.alias}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfigProductsPkgModulo(null)}
                >
                  取消
                </Button>
                <Button
                  variant="black"
                  onClick={savePackageProducts}
                  disabled={setProductsMut.isPending}
                >
                  {setProductsMut.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  保存
                </Button>
              </div>
            </>
          )}
        </div>
      </ResponsiveDialog>

      {/* 商品 新建/编辑 */}
      <ResponsiveDialog
        isOpen={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        title={editingProduct ? '编辑商品' : '新建商品'}
        contentProps={{ className: 'max-w-2xl max-h-[90vh] overflow-y-auto' }}
      >
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>应用</Label>
              <Select
                value={productForm.appid}
                onValueChange={(v) =>
                  setProductForm((f) => ({ ...f, appid: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPIDS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>货币</Label>
              <Select
                value={productForm.currency}
                onValueChange={(v) =>
                  setProductForm((f) => ({ ...f, currency: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>名称 *</Label>
            <Input
              value={productForm.name}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="商品名称"
            />
          </div>
          <div>
            <Label>别名 *（唯一）</Label>
            <Input
              value={productForm.alias}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, alias: e.target.value }))
              }
              placeholder="如 vip_monthly"
              disabled={!!editingProduct}
            />
          </div>
          <div>
            <Label>价格（分） *</Label>
            <Input
              type="number"
              value={productForm.price || ''}
              onChange={(e) =>
                setProductForm((f) => ({
                  ...f,
                  price: Number(e.target.value) || 0,
                }))
              }
              placeholder="如 2800 表示 28 元（CNY）或 2.99 美元（USD）"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>状态</Label>
              <Select
                value={productForm.status}
                onValueChange={(v) =>
                  setProductForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>排序</Label>
              <Input
                type="number"
                value={productForm.sort_order}
                onChange={(e) =>
                  setProductForm((f) => ({
                    ...f,
                    sort_order: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <div>
            <Label>i18n（多语言 JSON）</Label>
            <p className="text-xs text-muted-foreground mb-1">
              格式：{`{ "zh-CN": { "name": "商品名", "description": "描述" }, "en-US": { ... } }`}
            </p>
            <Textarea
              value={productForm.i18nInfoJson}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, i18nInfoJson: e.target.value }))
              }
              placeholder='{"zh-CN":{"name":"","description":""},"en-US":{}}'
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
          <div>
            <Label>三方 meta（JSON）</Label>
            <p className="text-xs text-muted-foreground mb-1">
              如苹果/谷歌支付样式等，格式：{`{ "style": { ... } }`}
            </p>
            <Textarea
              value={productForm.thirdProductMetaJson}
              onChange={(e) =>
                setProductForm((f) => ({
                  ...f,
                  thirdProductMetaJson: e.target.value,
                }))
              }
              placeholder='{"style":{}}'
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <Label>发货配置（JSON）</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => applyShippingTemplate('vip')}
                >
                  VIP 快捷模版
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => applyShippingTemplate('works')}
                >
                  作品 快捷模版
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              角色 roles、有效期 validity、资源 resource 等，下单后据此发货（VIP 用 roles+validity，作品用 resource+works_id）
            </p>
            <Textarea
              value={productForm.shippingConfigJson}
              onChange={(e) =>
                setProductForm((f) => ({
                  ...f,
                  shippingConfigJson: e.target.value,
                }))
              }
              placeholder='{"roles":[],"validity":{},"resource":[]}'
              className="min-h-[140px] font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="black"
              onClick={saveProduct}
              disabled={
                createProductMut.isPending || updateProductMut.isPending
              }
            >
              {(createProductMut.isPending || updateProductMut.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              保存
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 角色 新建/编辑 */}
      <ResponsiveDialog
        isOpen={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        title={editingRole ? '编辑角色' : '新建角色'}
        contentProps={{ className: 'max-w-md' }}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <div>
              <Label>应用</Label>
              <Select
                value={roleForm.appid}
                onValueChange={v =>
                  setRoleForm(f => ({
                    ...f,
                    appid: v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPIDS.map(a => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>名称</Label>
              <Input
                value={roleForm.name}
                onChange={e =>
                  setRoleForm(f => ({ ...f, name: e.target.value }))
                }
                placeholder="角色名称（可选）"
              />
            </div>
            <div>
              <Label>别名 *</Label>
              <Input
                value={roleForm.alias}
                onChange={e =>
                  setRoleForm(f => ({ ...f, alias: e.target.value }))
                }
                placeholder="角色别名（如 jiantie_vip_year）"
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={roleForm.description}
                onChange={e =>
                  setRoleForm(f => ({ ...f, description: e.target.value }))
                }
                placeholder="角色说明，便于运营同学理解"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="black"
              onClick={saveRole}
              disabled={createRoleMut.isPending || updateRoleMut.isPending}
            >
              {(createRoleMut.isPending || updateRoleMut.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              保存
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 权限 新建/编辑 */}
      <ResponsiveDialog
        isOpen={permissionDialogOpen}
        onOpenChange={setPermissionDialogOpen}
        title={editingPermission ? '编辑权限' : '新建权限'}
        contentProps={{ className: 'max-w-md' }}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <div>
              <Label>动作URL *</Label>
              <Input
                value={permissionForm.action_url}
                onChange={e =>
                  setPermissionForm(f => ({
                    ...f,
                    action_url: e.target.value,
                  }))
                }
                placeholder="如 /api/xxx 或 自定义标识"
              />
            </div>
            <div>
              <Label>别名</Label>
              <Input
                value={permissionForm.alias}
                onChange={e =>
                  setPermissionForm(f => ({ ...f, alias: e.target.value }))
                }
                placeholder="可读性更好的标识（可选）"
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={permissionForm.description}
                onChange={e =>
                  setPermissionForm(f => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="权限说明（可选）"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>权限值</Label>
              <Input
                type="number"
                value={permissionForm.value}
                onChange={e =>
                  setPermissionForm(f => ({
                    ...f,
                    value: e.target.value,
                  }))
                }
                placeholder="可选，用于位运算等高级场景"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setPermissionDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="black"
              onClick={savePermission}
              disabled={
                createPermissionMut.isPending || updatePermissionMut.isPending
              }
            >
              {(createPermissionMut.isPending ||
                updatePermissionMut.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
              保存
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 角色分配权限 */}
      <ResponsiveDialog
        isOpen={assignRole != null}
        onOpenChange={open => {
          if (!open) {
            setAssignRole(null);
          }
        }}
        title="配置角色权限"
        contentProps={{ className: 'max-w-xl max-h-[80vh]' }}
      >
        <div className="p-4 space-y-4">
          {assignRole && (
            <>
              <div className="text-sm text-muted-foreground">
                为角色{' '}
                <span className="font-medium">
                  {assignRole.name || assignRole.alias || assignRole.id}
                </span>{' '}
                配置权限
              </div>
              <div className="border rounded-md max-h-[320px] overflow-y-auto">
                {permissions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    暂无权限，请先在右侧「权限管理」中新建
                  </div>
                ) : (
                  <div className="divide-y">
                    {permissions.map(p => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissionIds.includes(p.id)}
                          onChange={() => togglePermissionForRole(p.id)}
                          className="rounded"
                        />
                        <span className="font-mono text-xs">
                          #{p.id} {p.action_url}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {p.alias ?? p.description ?? ''}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignRole(null)}>
                  取消
                </Button>
                <Button
                  variant="black"
                  onClick={saveAssignPermissions}
                  disabled={assignRolePermissionsMut.isPending}
                >
                  {assignRolePermissionsMut.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  保存
                </Button>
              </div>
            </>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
