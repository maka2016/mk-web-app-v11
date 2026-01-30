import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

// 尽量复用 jiantie 的 env 加载逻辑：
// - 允许用户在命令行显式传入 DATABASE_URL（最高优先级）
// - 否则优先读 .env.local（Next/本地开发默认），再读 .env 兜底
const jiantiePkgRoot = path.resolve(__dirname, '../../');
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(jiantiePkgRoot, '.env.local') });
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(jiantiePkgRoot, '.env') });
}

function splitSqlStatements(sql: string): string[] {
  // Remove line comments, keep everything else.
  const lines = sql
    .split('\n')
    .map((line) => line.replace(/--.*$/g, '').trimEnd());
  const cleaned = lines.join('\n').trim();
  if (!cleaned) return [];

  // Split by semicolon, but avoid splitting inside single-quoted strings.
  const out: string[] = [];
  let buf = '';
  let inSingle = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : '';

    if (ch === "'" && prev !== '\\') {
      inSingle = !inSingle;
      buf += ch;
      continue;
    }

    if (ch === ';' && !inSingle) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      continue;
    }

    buf += ch;
  }

  const tail = buf.trim();
  if (tail) out.push(tail);

  return out;
}

async function main() {
  const defaultSqlPath = path.resolve(
    __dirname,
    '../prisma/migrations/20260124120000_theme_task_status_enum/migration.sql'
  );
  const sqlFile = process.argv[2] ? path.resolve(process.argv[2]) : defaultSqlPath;

  const connectionString =
    process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL env var.');
  }

  const sql = await fs.readFile(sqlFile, 'utf-8');
  const statements = splitSqlStatements(sql);
  if (statements.length === 0) {
    throw new Error(`No SQL statements found in ${sqlFile}`);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`[migration] sqlFile=${sqlFile}`);
    console.log(`[migration] statements=${statements.length}`);
    console.log(
      `[migration] db=${process.env.MIGRATION_DATABASE_URL ? 'MIGRATION_DATABASE_URL' : 'DATABASE_URL'}`
    );

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`[migration] exec ${i + 1}/${statements.length}`);
        try {
          await tx.$executeRawUnsafe(stmt);
        } catch (e: unknown) {
          console.error(`[migration] statement ${i + 1} failed`);
          console.error('--- SQL ---');
          console.error(stmt);
          console.error('--- ERROR ---');
          console.error(e);
          throw e;
        }
      }
    });

    console.log('[migration] done');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('[migration] failed');
  console.error(err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exitCode = 1;
});

