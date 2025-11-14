import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '../../../utils/auth';
export async function GET() {
  const headerInfo = await headers();

  const session = await auth.api.getSession({
    headers: (await headers()) as Headers,
  });

  console.log(
    'auth.api.listSessions',
    await auth.api.listSessions({
      headers: (await headers()) as Headers,
    })
  );
  return NextResponse.json({ message: 'helloworld @api', session });
}
