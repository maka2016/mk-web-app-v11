import { prisma } from '@mk/jiantie/v11-database';
import { Prisma } from '@mk/jiantie/v11-database/generated/client/client';
import { validateRequest } from '@/server/auth/token-validator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-token');
    const uidHeader = req.headers.get('x-uid');
    const appid = req.headers.get('x-appid') ?? undefined;
    if (!token || !uidHeader) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少鉴权头 x-token / x-uid' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const auth = await validateRequest(token, Number(uidHeader), appid);
    if (!auth.isValid) {
      return new Response(
        JSON.stringify({ success: false, message: auth.error || '鉴权失败' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { run_id, status, error_message, final_snapshot } = body;

    if (!run_id || typeof run_id !== 'string' || !run_id.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'run_id 必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!status || (status !== 'success' && status !== 'failed')) {
      return new Response(
        JSON.stringify({ success: false, message: 'status 必须为 success 或 failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existing = await prisma.aiTemplateGenerationRunEntity.findUnique({
      where: { id: run_id },
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'run 不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (existing.uid !== auth.uid) {
      return new Response(
        JSON.stringify({ success: false, message: '无权限更新该 run' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await prisma.aiTemplateGenerationRunEntity.update({
      where: { id: run_id },
      data: {
        status,
        error_message:
          status === 'failed' && error_message != null
            ? String(error_message)
            : status === 'success'
              ? null
              : existing.error_message,
        final_snapshot:
          final_snapshot != null
            ? (final_snapshot as Prisma.InputJsonValue)
            : existing.final_snapshot !== null
              ? existing.final_snapshot
              : Prisma.DbNull,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AI Finish API] 更新 run 失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '更新失败，请重试',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
