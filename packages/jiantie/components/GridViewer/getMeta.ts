import { prisma } from '@mk/jiantie/v11-database';

export async function generateMetadataFac({
  uid: _uid,
  worksId,
  type,
}: {
  uid: string;
  worksId: string;
  type: 'event' | 'template';
}) {
  try {
    if (type === 'event') {
      const worksEntity = await prisma.worksEntity.findUnique({
        where: { id: worksId },
      });

      if (!worksEntity || worksEntity.deleted) {
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
      return {
        openGraph: {
          title: worksEntity.title,
          description: worksEntity.desc,
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
        title: worksEntity.title,
      };
    } else {
      const templateEntity = await prisma.templateEntity.findUnique({
        where: { id: worksId },
      });

      if (!templateEntity || templateEntity.deleted) {
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
      return {
        openGraph: {
          title: templateEntity.title,
          description: templateEntity.desc,
          images: [
            // transformImgUrl(templateEntity.cover, {
            //   width: 1200,
            //   height: (1200 / 3) * 2,
            //   fit: "cover",
            // }),
          ],
          url: `https://viewer.maka.im/${type}/${worksId}`,
          type: 'website',
        },
        title: templateEntity.title,
      };
    }
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
