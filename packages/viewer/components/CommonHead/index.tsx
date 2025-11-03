import Head from 'next/head';
import { cdnApi } from '@mk/services';

function commonHead({ worksDetail }: { worksDetail: any }) {
  if (!worksDetail) return <></>;
  const thumb = cdnApi(worksDetail.cover);
  return (
    <>
      <Head>
        <meta name='keywords' content={worksDetail.desc} />
        <meta name='description' content={worksDetail.desc} />
        <meta property='og:image' content={thumb} />
        <meta property='og:description' content={worksDetail.desc} />
        <meta property='og:title' content={worksDetail.title} />
        <meta property='og:url' content={thumb} />
        <meta itemProp='image' content={thumb} />
        <title>{worksDetail.title}</title>
      </Head>
      {thumb && (
        <img
          src={thumb}
          alt={worksDetail.title}
          style={{
            position: 'absolute',
            zIndex: -999,
            width: 100,
            height: 100,
            opacity: 0,
          }}
        />
      )}
    </>
  );
}

export default commonHead;
