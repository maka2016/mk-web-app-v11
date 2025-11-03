'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Database, Loader2, Plus, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * tRPC API 使用示例页面
 */
export default function TrpcDemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uid, setUid] = useState<string>('');
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [total, setTotal] = useState<number>(0);

  // 同步 uid 到 URL
  const updateUrl = (newUid: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newUid.trim()) {
      params.set('uid', newUid.trim());
    } else {
      params.delete('uid');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // 从 URL 获取 uid 参数
  useEffect(() => {
    const urlUid = searchParams.get('uid');
    if (urlUid) {
      setUid(urlUid);
      // 如果 URL 中有 uid 参数，自动执行搜索
      const loadData = async () => {
        setLoading(true);
        setResult('');
        try {
          const data = await trpc.works.findMany.query({
            deleted: false,
            take: 20,
          });
          setWorks(data);

          const count = await trpc.works.count.query({
            deleted: false,
          });
          setTotal(count);

          setResult(`✅ 成功获取 ${data.length} 个作品（总共 ${count} 个）`);
        } catch (error: any) {
          setResult(`❌ 查询失败: ${error.message || error}`);
          setWorks([]);
          setTotal(0);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [searchParams]);

  // 查询作品列表
  const handleFindWorks = async (currentUid?: string) => {
    const searchUid = currentUid || uid;
    if (!searchUid.trim()) {
      setResult('❌ 请输入用户 UID');
      return;
    }

    setLoading(true);
    setResult('');
    try {
      const data = await trpc.works.findMany.query({
        deleted: false,
        take: 20,
      });
      setWorks(data);

      // 同时获取总数
      const count = await trpc.works.count.query({
        deleted: false,
      });
      setTotal(count);

      setResult(`✅ 成功获取 ${data.length} 个作品（总共 ${count} 个）`);
    } catch (error: any) {
      setResult(`❌ 查询失败: ${error.message || error}`);
      setWorks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 创建作品
  const handleCreateWork = async () => {
    if (!uid.trim()) {
      setResult('❌ 请先输入用户 UID');
      return;
    }

    setLoading(true);
    setResult('');
    try {
      const newWork = await trpc.works.create.mutate({
        title: '测试作品 ' + new Date().toLocaleString('zh-CN'),
        desc: '通过 tRPC API 创建的测试作品',
      });
      setResult(`✅ 创建成功: ${newWork.id}`);
      handleFindWorks(); // 刷新列表
    } catch (error: any) {
      setResult(`❌ 创建失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // 查询规格列表
  const handleFindSpecs = async () => {
    setLoading(true);
    setResult('');
    try {
      const specs = await trpc.worksSpec.findMany.query({
        deleted: false,
        take: 10,
      });
      setResult(`✅ 成功获取 ${specs.length} 个规格`);
      console.log('规格列表:', specs);
    } catch (error: any) {
      setResult(`❌ 查询失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFindWorks();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* 搜索区域 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl font-semibold'>
            tRPC API 测试工具
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-4 items-end'>
            <div className='flex-1'>
              <label
                htmlFor='uid'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                用户ID (UID)
              </label>
              <Input
                id='uid'
                type='text'
                placeholder='请输入用户ID，例如：123456'
                value={uid}
                onChange={e => {
                  const newUid = e.target.value;
                  setUid(newUid);
                  updateUrl(newUid);
                }}
                onKeyPress={handleKeyPress}
                className='h-8'
              />
            </div>
            <Button
              onClick={() => handleFindWorks()}
              disabled={loading || !uid.trim()}
              className='h-8 px-4'
            >
              {loading ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : (
                <Search className='h-4 w-4 mr-2' />
              )}
              查询作品
            </Button>
          </div>

          <div className='flex gap-2 flex-wrap'>
            <Button
              onClick={handleCreateWork}
              disabled={loading || !uid.trim()}
              variant='outline'
              size='sm'
              className='h-8'
            >
              <Plus className='h-4 w-4 mr-1' />
              创建测试作品
            </Button>

            <Button
              onClick={handleFindSpecs}
              disabled={loading}
              variant='outline'
              size='sm'
              className='h-8'
            >
              <Database className='h-4 w-4 mr-1' />
              查询规格列表
            </Button>
          </div>

          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.startsWith('✅')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {result}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 作品列表 */}
      {works.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-medium'>
              作品列表 (共 {total} 个作品，显示前 20 个)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-16'>封面</TableHead>
                    <TableHead className='min-w-48'>标题</TableHead>
                    <TableHead className='min-w-32'>描述</TableHead>
                    <TableHead className='w-20'>版本</TableHead>
                    <TableHead className='w-32'>创建时间</TableHead>
                    <TableHead className='w-32'>更新时间</TableHead>
                    <TableHead className='w-32'>作品ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {works.map(work => (
                    <TableRow key={work.id}>
                      <TableCell>
                        {work.cover ? (
                          <img
                            src={work.cover}
                            alt={work.title}
                            className='w-12 h-12 object-cover rounded'
                            onError={e => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <div className='w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs'>
                            无封面
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='max-w-48'>
                          <div
                            className='font-medium truncate'
                            title={work.title}
                          >
                            {work.title}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className='max-w-32 truncate text-sm text-gray-600'
                          title={work.desc}
                        >
                          {work.desc || '-'}
                        </div>
                      </TableCell>
                      <TableCell className='text-sm text-gray-600'>
                        v{work.version}
                      </TableCell>
                      <TableCell className='text-sm text-gray-600'>
                        {formatDate(work.create_time)}
                      </TableCell>
                      <TableCell className='text-sm text-gray-600'>
                        {formatDate(work.update_time)}
                      </TableCell>
                      <TableCell>
                        <code className='text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded'>
                          {work.id}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {uid && !loading && works.length === 0 && result.startsWith('✅') && (
        <Card>
          <CardContent className='text-center py-12'>
            <div className='text-gray-500'>
              <Search className='h-12 w-12 mx-auto mb-4 text-gray-300' />
              <p>该用户暂无作品</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg font-medium'>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4 text-sm text-gray-600'>
            <div>
              <h3 className='font-medium text-gray-900 mb-2'>📋 功能说明</h3>
              <ul className='space-y-1 list-disc list-inside'>
                <li>输入用户 UID 查询该用户的所有作品</li>
                <li>可以创建测试作品验证 API 功能</li>
                <li>查询规格列表查看系统支持的作品规格</li>
                <li>所有操作都是类型安全的 TypeScript API</li>
              </ul>
            </div>
            <div>
              <h3 className='font-medium text-gray-900 mb-2'>🔧 技术特性</h3>
              <ul className='space-y-1 list-disc list-inside'>
                <li>使用 tRPC 实现端到端类型安全</li>
                <li>支持 Works、Template、WorksSpec 三种实体的 CRUD</li>
                <li>基于 Prisma ORM 访问 PostgreSQL 数据库</li>
                <li>URL 参数支持，可分享查询链接</li>
              </ul>
            </div>
            <div>
              <h3 className='font-medium text-gray-900 mb-2'>📚 相关文档</h3>
              <ul className='space-y-1'>
                <li>
                  • 数据库配置:{' '}
                  <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>
                    DATABASE_QUICKSTART.md
                  </code>
                </li>
                <li>
                  • API 文档:{' '}
                  <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>
                    app/api/trpc/README.md
                  </code>
                </li>
                <li>
                  • 集成指南:{' '}
                  <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>
                    TRPC_INTEGRATION.md
                  </code>
                </li>
              </ul>
            </div>
            <div className='pt-2 border-t'>
              <p className='text-xs text-gray-500'>
                💡 提示: 需要在项目根目录配置 .env.local 文件，设置 DATABASE_URL
                环境变量才能正常使用
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
