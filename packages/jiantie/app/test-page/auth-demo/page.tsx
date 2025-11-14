'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Separator } from '@workspace/ui/components/separator';
import { createAuthClient } from 'better-auth/client';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

type AuthClientInstance = ReturnType<typeof createAuthClient>;
type SessionResponse = Awaited<ReturnType<AuthClientInstance['getSession']>>;
type SessionData = SessionResponse extends { data: infer Data }
  ? Data
  : SessionResponse extends { data: infer MaybeData | null }
    ? MaybeData
    : null;
type SessionError = SessionResponse extends { error: infer Err }
  ? Err
  : { message?: string; status: number } | null;

export default function AuthDemoPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('等待初始化');
  const [session, setSession] = useState<SessionData>(null);
  const [errorDetail, setErrorDetail] = useState<SessionError>(null);
  const [client, setClient] = useState<AuthClientInstance | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInitialize = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setStatus('error');
      setMessage('请输入有效的 auth token');
      setErrorDetail(null);
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('正在初始化客户端…');
    setErrorDetail(null);

    try {
      const instance = createAuthClient({
        baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? '',
        fetchOptions: {
          auth: {
            type: 'Bearer',
            token: () => trimmedToken,
          },
        },
      });

      const response = await instance.getSession();
      if (response?.error) {
        setStatus('error');
        setMessage('客户端已创建，但校验 token 失败');
        setSession(null);
        setErrorDetail(response.error);
      } else {
        setStatus('success');
        setMessage('客户端初始化完成');
        setSession(response?.data ?? null);
        setErrorDetail(null);
      }

      // createAuthClient 返回的是 Proxy 函数，直接 setState 会被 React 当成 updater
      // 用函数包一层才能把实例存到 state 里，方便后续复用
      setClient(() => instance);
    } catch (error) {
      setStatus('error');
      setSession(null);
      setClient(null);
      setMessage(
        error instanceof Error ? error.message : '初始化 better-auth 客户端失败'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefetchSession = async () => {
    if (!client) return;
    setLoading(true);
    setMessage('正在重新获取会话…');
    try {
      const response = await client.getSession();
      if (response?.error) {
        setStatus('error');
        setMessage('重新获取会话失败');
        setSession(null);
        setErrorDetail(response.error);
      } else {
        setStatus('success');
        setMessage('已刷新会话');
        setSession(response?.data ?? null);
        setErrorDetail(null);
      }
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : '刷新会话时发生未知错误'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container mx-auto max-w-3xl space-y-6 p-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-xl font-semibold'>
            <ShieldCheck className='h-5 w-5 text-emerald-500' />
            Better Auth Token 测试
          </CardTitle>
          <CardDescription>
            粘贴 better-auth 的 Bearer token，实时初始化客户端并读取当前会话。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <label
              htmlFor='auth-token'
              className='text-sm font-medium text-foreground'
            >
              Auth Token
            </label>
            <Input
              id='auth-token'
              placeholder='better-auth 签发的 JWT 或访问令牌'
              value={token}
              onChange={event => setToken(event.target.value)}
              disabled={loading}
            />
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button onClick={handleInitialize} disabled={loading}>
              {loading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <ShieldCheck className='mr-2 h-4 w-4' />
              )}
              初始化客户端
            </Button>
            <Button
              variant='outline'
              onClick={handleRefetchSession}
              disabled={loading || !client}
            >
              {loading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              重新获取会话
            </Button>
          </div>

          <Alert
            variant={status === 'error' ? 'destructive' : 'default'}
            className='mt-2'
          >
            <AlertTitle>
              {status === 'success'
                ? '已连接 better-auth'
                : status === 'error'
                  ? '发生错误'
                  : '等待操作'}
            </AlertTitle>
            <AlertDescription className='space-y-2'>
              <p>{message}</p>
              {errorDetail ? (
                <code className='block rounded bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground'>
                  {JSON.stringify(
                    {
                      status:
                        typeof errorDetail === 'object' &&
                        errorDetail !== null &&
                        'status' in errorDetail
                          ? errorDetail.status
                          : undefined,
                      statusText:
                        typeof errorDetail === 'object' &&
                        errorDetail !== null &&
                        'statusText' in errorDetail
                          ? errorDetail.statusText
                          : undefined,
                      message:
                        typeof errorDetail === 'object' &&
                        errorDetail !== null &&
                        'message' in errorDetail
                          ? errorDetail.message
                          : undefined,
                    },
                    null,
                    2
                  )}
                </code>
              ) : null}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className='text-sm text-muted-foreground'>
          ⚠️ Demo 仅用于调试，token
          会直接在浏览器内存中处理，请勿在生产环境暴露。
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>会话数据</CardTitle>
          <CardDescription>
            成功初始化后展示 better-auth 返回的 getSession 结果。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <pre className='max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100'>
              {JSON.stringify(session, null, 2)}
            </pre>
          ) : (
            <p className='text-sm text-muted-foreground'>
              暂无会话数据，可在上方输入 token 并初始化客户端后查看。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>使用说明</CardTitle>
          <CardDescription>
            帮助理解 better-auth 客户端初始化流程。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 text-sm text-muted-foreground'>
          <div>
            <p className='font-medium text-foreground'>交互步骤</p>
            <ol className='list-decimal space-y-1 pl-5'>
              <li>在后台生成或复制 better-auth Bearer token。</li>
              <li>粘贴到上方输入框并点击“初始化客户端”。</li>
              <li>
                Demo 会调用{' '}
                <code className='rounded bg-muted px-1 py-0.5'>
                  client.getSession()
                </code>{' '}
                验证 token。
              </li>
              <li>需要重新验证时，使用“重新获取会话”。</li>
            </ol>
          </div>
          <Separator />
          <div>
            <p className='font-medium text-foreground'>关键代码</p>
            <pre className='rounded-lg bg-muted p-4 text-xs text-foreground'>
              {`const client = createAuthClient({
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => authToken,
    },
  },
});

const session = await client.getSession();`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
