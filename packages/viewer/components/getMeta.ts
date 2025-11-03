import { WorksDetailEntity } from '@mk/services';
import axios from 'axios';

export async function generateMetadataFac({
  uid,
  worksId,
  type,
}: {
  uid: string;
  worksId: string;
  type: 'event' | 'template';
}) {
  try {
    const worksDetail =
      type === 'event'
        ? ((
            await axios.get(
              `https://works-server-v2.maka.im/works/v1/detail/${worksId}`
            )
          ).data as WorksDetailEntity)
        : ((
            await axios.get(
              `https://works-server-v2.maka.im/template/v1/detail/${worksId}`
            )
          ).data as WorksDetailEntity);
    return {
      openGraph: {
        title: worksDetail.title,
        description: worksDetail.desc,
        images: [
          // transformImgUrl(worksDetail.cover, {
          //   width: 1200,
          //   height: (1200 / 3) * 2,
          //   fit: "cover",
          // }),
        ],
        url: `https://viewer.maka.im/${type}/${worksId}`,
        type: 'website',
      },
      title: worksDetail.title,
    };
  } catch (err) {
    console.error(err);
    return {
      openGraph: {
        title: '简帖',
        description: '简帖',
        url: `https://viewer.maka.im/${type}/${worksId}`,
        type: 'website',
      },
      title: '简帖',
    };
  }
}
