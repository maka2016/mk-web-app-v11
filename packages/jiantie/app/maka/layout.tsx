import ResetAppid from './resetAppid';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ResetAppid />
      {children}
    </>
  );
}
