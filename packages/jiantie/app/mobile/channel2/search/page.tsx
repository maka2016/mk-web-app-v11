interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page(props: PageProps) {
  const params = await props.searchParams;
  const keyword = typeof params.keyword === 'string' ? params.keyword : '';

  // return <SearchResults keyword={keyword} />;
  return null;
}
