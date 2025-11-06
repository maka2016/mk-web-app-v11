interface PageProps {
  params: Promise<{
    collectionId: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  // return <Templates collectionId={Number(params.collectionId)} />;
  return null;
}
