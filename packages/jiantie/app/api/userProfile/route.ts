import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
export async function GET() {
  const headerInfo = await headers();

  // const newUser = await auth.api.createUser({
  //   body: {
  //     email: 'use2r@example.com', // required
  //     password: 'some-secure-password', // required
  //     name: 'James Smith', // required
  //     role: 'user',
  //   },
  // });
  // return NextResponse.json({ message: 'helloworld @api' });

  // const session = await auth.api.getSession({
  //   headers: (await headers()) as Headers,
  // });

  // console.log(
  //   'auth.api.listSessions',
  //   await auth.api.listSessions({
  //     headers: (await headers()) as Headers,
  //   })
  // );
  return NextResponse.json({ message: 'helloworld @api' });
}
