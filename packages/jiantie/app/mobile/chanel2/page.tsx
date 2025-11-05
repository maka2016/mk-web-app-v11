// import { Suspense } from 'react';
import Main from './components/main';

// export default async function Page({
//   searchParams,
// }: {
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// }) {
//   const params = await searchParams;

//   return (
//     <Suspense>
//       <Main />
//     </Suspense>
//   );
// }

export default function Page(props: any) {
  return <Main {...props} />;
}
