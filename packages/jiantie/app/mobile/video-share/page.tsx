import Share from './components/main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    works_id: string;
  }>;
}) {
  const works_id = (await searchParams).works_id;
  return <Share worksId={works_id}></Share>;
}
