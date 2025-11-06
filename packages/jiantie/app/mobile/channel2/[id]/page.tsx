interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  // return <Detail channelId={Number(params.id)} />;
  return null;
}
