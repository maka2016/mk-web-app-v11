# RSVP专属链接分享功能设计文档

## 概述

本设计文档描述了如何在RSVP组件中实现专属链接分享功能。该功能通过扩展`RsvpContactEntity`数据结构，添加嘉宾管理功能，并在配置面板中新增分享设置界面，支持为不同访客生成包含专属信息的分享链接。

## 架构设计

### 数据结构设计

#### 扩展 RsvpContactEntity

现有的`RsvpContactEntity`用于存储提交表单时自动创建的联系人。我们扩展它以支持嘉宾功能：

```prisma
model RsvpContactEntity {
  id    String  @id @default(cuid()) @db.Text
  name  String  @db.VarChar /// 联系人姓名
  email String? @db.VarChar /// 邮箱
  phone String? @db.VarChar /// 电话

  /// 嘉宾相关字段（新增）
  form_config_id String? @map("form_config_id") @db.Text /// 关联的表单配置ID（如果为null，则为普通联系人；如果存在，则为该表单的嘉宾）

  /// 状态管理
  deleted     Boolean  @default(false)
  create_time DateTime @default(now()) @map("create_time") @db.Timestamptz
  update_time DateTime @default(now()) @updatedAt @map("update_time") @db.Timestamptz

  /// 关联关系
  submissions RsvpSubmissionEntity[]
  form_config RsvpFormConfigEntity? @relation(fields: [form_config_id], references: [id])

  @@unique([email], map: "UQ_rsvp_contact_email")
  @@unique([phone], map: "UQ_rsvp_contact_phone")
  @@index([form_config_id], map: "IDX_rsvp_contact_form_config_id")
  @@index([name], map: "IDX_rsvp_contact_name")
  @@index([email], map: "IDX_rsvp_contact_email")
  @@index([phone], map: "IDX_rsvp_contact_phone")
  @@index([deleted], map: "IDX_rsvp_contact_deleted")
  @@index([id], map: "IDX_rsvp_contact_id")
  @@map("rsvp_contact_entity")
}
```

**设计说明：**

- `form_config_id`: 用于区分普通联系人和嘉宾。如果为`null`，表示普通联系人（提交时自动创建）；如果存在，表示该表单的嘉宾（手动创建）
- 普通联系人：`form_config_id = null`，由系统在提交时自动创建
- 受邀嘉宾：`form_config_id != null`，由用户在配置面板手动创建

#### 扩展 RsvpFormConfigEntity

```prisma
model RsvpFormConfigEntity {
  // ... 现有字段 ...

  /// 关联关系
  submissions RsvpSubmissionEntity[]
  view_logs   RsvpViewLogEntity[]
  invitees    RsvpContactEntity[] /// 新增：该表单的嘉宾列表
}
```

### URL参数设计

#### 专属链接格式

```
/viewer2/{worksId}?rsvp_invitee={name}&rsvp_phone={phone}&rsvp_email={email}
```

**参数说明：**

- `rsvp_invitee`: 嘉宾姓名（必填，URL编码）
- `rsvp_phone`: 嘉宾手机号（可选，URL编码）
- `rsvp_email`: 嘉宾邮箱（可选，URL编码）

**示例：**

```
/viewer2/abc123?rsvp_invitee=张三&rsvp_phone=13800138000
/viewer2/abc123?rsvp_invitee=李四&rsvp_phone=13900139000&rsvp_email=lisi@example.com
```

#### 公开链接格式

```
/viewer2/{worksId}
```

不包含任何RSVP相关参数，表示公开访问。

## 组件设计

### 1. 配置面板扩展

在现有的`RSVPConfigPanel`组件中添加分享设置Tab：

```typescript
// packages/jiantie/components/RSVP/configPanel/index.tsx

interface RSVPConfigPanelProps {
  // ... 现有props ...
}

export function RSVPConfigPanel() {
  const [activeTab, setActiveTab] = useState<'form' | 'share'>('form');

  return (
    <div>
      {/* Tab切换 */}
      <div className="flex border-b">
        <button onClick={() => setActiveTab('form')}>表单配置</button>
        <button onClick={() => setActiveTab('share')}>分享设置</button>
      </div>

      {/* Tab内容 */}
      {activeTab === 'form' && <FormConfigTab />}
      {activeTab === 'share' && <ShareSettingsTab />}
    </div>
  );
}
```

### 2. ShareSettingsTab 组件

分享设置Tab的主要功能：

```typescript
// packages/jiantie/components/RSVP/configPanel/ShareSettingsTab.tsx

interface ShareSettingsTabProps {
  formConfigId: string;
  worksId: string;
}

export function ShareSettingsTab({ formConfigId, worksId }: ShareSettingsTabProps) {
  const { data: invitees, refetch } = trpc.rsvp.listInvitees.useQuery({ form_config_id: formConfigId });

  return (
    <div className="space-y-4">
      {/* 1. 公开链接分享 */}
      <PublicLinkSection worksId={worksId} />

      {/* 2. 指定嘉宾分享 */}
      <InviteeListSection
        invitees={invitees}
        worksId={worksId}
        formConfigId={formConfigId}
        onRefresh={refetch}
      />

      {/* 3. 已邀请嘉宾的提交记录 */}
      <InviteeSubmissionSection
        invitees={invitees}
        formConfigId={formConfigId}
      />
    </div>
  );
}
```

### 3. InviteeManagementPage 组件

嘉宾管理页面：

```typescript
// packages/jiantie/app/mobile/rsvp-invitees/page.tsx

export default function InviteeManagementPage() {
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id');
  const worksId = searchParams.get('works_id');

  const { data: invitees, refetch } = trpc.rsvp.listInvitees.useQuery({
    form_config_id: formConfigId
  });

  return (
    <div>
      <InviteeList
        invitees={invitees}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
      />
    </div>
  );
}
```

### 4. RSVPSharePage 组件

分享页面：

```typescript
// packages/jiantie/app/mobile/rsvp-share/page.tsx

export default function RSVPSharePage() {
  const searchParams = useSearchParams();
  const inviteeId = searchParams.get('invitee_id');
  const worksId = searchParams.get('works_id');

  const { data: invitee } = trpc.rsvp.getInviteeById.useQuery({ id: inviteeId });

  // 生成专属链接
  const shareLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set('rsvp_invitee', encodeURIComponent(invitee.name));
    if (invitee.phone) params.set('rsvp_phone', encodeURIComponent(invitee.phone));
    if (invitee.email) params.set('rsvp_email', encodeURIComponent(invitee.email));
    return `${origin}/viewer2/${worksId}?${params.toString()}`;
  }, [invitee, worksId]);

  return (
    <SharePage
      shareLink={shareLink}
      shareTitle={invitee.name}
      worksId={worksId}
    />
  );
}
```

### 5. RSVP组件增强

修改现有的RSVP组件以支持专属链接：

```typescript
// packages/jiantie/components/RSVP/comp/index.tsx

function RSVPCompInner({ attrs, editorSDK }: RSVPCompProps) {
  const searchParams = useSearchParams();

  // 从URL参数获取嘉宾信息
  const inviteeName = searchParams.get('rsvp_invitee') || '';
  const inviteePhone = searchParams.get('rsvp_phone') || '';
  const inviteeEmail = searchParams.get('rsvp_email') || '';

  // 判断是否为专属链接访问
  const isInviteeLink = !!inviteeName;

  // 显示专属标题
  const displayTitle = useMemo(() => {
    if (isInviteeLink) {
      return `诚邀 ${inviteeName}`;
    }
    return config?.title || '诚邀';
  }, [isInviteeLink, inviteeName, config]);

  // 提交时匹配联系人
  const handleSubmit = async (willAttendValue: boolean) => {
    // ... 现有逻辑 ...

    // 如果URL中有手机号，自动匹配联系人
    if (inviteePhone && submissionData) {
      // 查找或创建联系人
      const contact = await findOrCreateContact({
        name: inviteeName,
        phone: inviteePhone,
        email: inviteeEmail,
        form_config_id: config.id,
      });

      submissionData._inviteeInfo = {
        isInvitee: true,
        inviteeName: inviteeName,
        contactId: contact.id,
      };
    }

    // ... 提交逻辑 ...
  };
}
```

## 后端API设计

### 新增接口

#### 1. 嘉宾管理接口

```typescript
// packages/server/src/routers/rsvp.ts

// 创建嘉宾
createInvitee: protectedProcedure
  .input(z.object({
    form_config_id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 创建Contact，设置form_config_id
    return ctx.prisma.rsvpContactEntity.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        form_config_id: input.form_config_id,
      },
    });
  }),

// 更新嘉宾
updateInvitee: protectedProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return ctx.prisma.rsvpContactEntity.update({
      where: { id },
      data,
    });
  }),

// 删除嘉宾
deleteInvitee: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.rsvpContactEntity.update({
      where: { id: input.id },
      data: { deleted: true },
    });
  }),

// 查询嘉宾列表
listInvitees: protectedProcedure
  .input(z.object({
    form_config_id: z.string(),
    keyword: z.string().optional(),
    skip: z.number().optional(),
    take: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const where: any = {
      form_config_id: input.form_config_id,
      deleted: false,
    };

    if (input.keyword) {
      where.OR = [
        { name: { contains: input.keyword, mode: 'insensitive' } },
        { phone: { contains: input.keyword, mode: 'insensitive' } },
        { email: { contains: input.keyword, mode: 'insensitive' } },
      ];
    }

    return ctx.prisma.rsvpContactEntity.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: { create_time: 'desc' },
    });
  }),

// 根据ID查询嘉宾
getInviteeById: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.rsvpContactEntity.findUnique({
      where: { id: input.id },
    });
  }),

// 获取嘉宾的提交记录
getInviteeSubmissions: protectedProcedure
  .input(z.object({
    contact_id: z.string(),
    form_config_id: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    // 查询该联系人的所有提交记录
    const submissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
      where: {
        contact_id: input.contact_id,
        form_config_id: input.form_config_id,
        deleted: false,
      },
      orderBy: { create_time: 'desc' },
    });

    // 按submission_group_id分组，取每组最新记录
    const latestByGroup = new Map();
    for (const submission of submissions) {
      const groupId = submission.submission_group_id;
      if (!latestByGroup.has(groupId)) {
        latestByGroup.set(groupId, submission);
      }
    }

    return Array.from(latestByGroup.values());
  }),
```

## 数据流程设计

### 1. 创建嘉宾流程

```
用户操作: 配置面板 -> 分享设置 -> 添加嘉宾
↓
前端: 跳转到嘉宾管理页面或显示创建表单
↓
前端: 调用 createInvitee API
↓
后端: 创建 RsvpContactEntity，设置 form_config_id
↓
前端: 刷新嘉宾列表，显示新创建的嘉宾
```

### 2. 生成分享链接流程

```
用户操作: 选择嘉宾 -> 点击分享
↓
前端: 跳转到分享页面，传入 invitee_id 和 works_id
↓
前端: 调用 getInviteeById 获取嘉宾信息
↓
前端: 生成专属链接: /viewer2/{worksId}?rsvp_invitee={name}&rsvp_phone={phone}
↓
前端: 显示分享选项（微信、朋友圈、复制链接、二维码）
```

### 3. 访客访问流程

```
访客: 点击专属链接
↓
前端: 解析URL参数（rsvp_invitee, rsvp_phone, rsvp_email）
↓
RSVP组件: 显示"诚邀 {嘉宾姓名}"
↓
访客: 填写表单并提交
↓
后端: 如果URL中有phone，自动匹配或创建联系人
↓
后端: 创建提交记录，关联到contact_id
↓
前端: 显示提交成功信息
```

## 界面交互设计

### 分享设置Tab布局

```
┌─────────────────────────────────────┐
│ 表单配置  │ 分享设置              │
├─────────────────────────────────────┤
│                                     │
│ 【公开链接分享】                    │
│ ┌─────────────────────────────────┐ │
│ │ 链接: /viewer2/{worksId}        │ │
│ │ [复制链接] [二维码]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 【指定嘉宾分享】                    │
│ ┌─────────────────────────────────┐ │
│ │ 姓名    手机      操作          │ │
│ │ 张三    138...   [分享][编辑][删除]│ │
│ │ 李四    139...   [分享][编辑][删除]│ │
│ │ [添加嘉宾]                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 【已邀请嘉宾的提交记录】            │
│ ┌─────────────────────────────────┐ │
│ │ 姓名    状态    时间    [查看]  │ │
│ │ 张三    已提交  2024-01-01      │ │
│ │ 李四    待提交  -               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 错误处理

### 数据一致性处理

1. **嘉宾删除时的处理**：
   - 执行软删除，保留历史提交记录
   - 已发送的专属链接仍然有效（通过URL参数访问）

2. **手机号唯一性处理**：
   - 如果嘉宾手机号已存在（作为普通联系人），更新该联系人的form_config_id
   - 如果手机号已作为其他表单的嘉宾，提示用户

3. **URL参数验证**：
   - 前端验证URL参数的有效性
   - 处理参数缺失或格式错误的情况

## 性能考虑

1. **数据查询优化**：
   - 使用索引优化form_config_id查询
   - 嘉宾列表支持分页加载

2. **链接生成优化**：
   - 客户端生成链接，无需后端查询
   - 使用URLSearchParams进行参数编码

3. **提交匹配优化**：
   - 通过phone唯一索引快速查找联系人
   - 避免重复创建相同手机号的联系人
