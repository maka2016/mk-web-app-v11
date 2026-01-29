import { headers } from 'next/headers';
import ResponsiveLayout from './ResponsiveLayout';
import ResetAppid from './resetAppid';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';

  return (
    <>
      <ResetAppid />
      <ResponsiveLayout userAgent={userAgent}>{children}</ResponsiveLayout>
    </>
  );
}
