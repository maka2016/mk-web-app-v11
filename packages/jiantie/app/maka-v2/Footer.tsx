import useIsMobile from '../../utils/use-mobile';

const Footer = ({ userAgent }: { userAgent?: string }) => {
  const isMobile = useIsMobile(userAgent);
  if (isMobile) {
    return null;
  }
  return (
    <footer className='w-full h-[428px] bg-[#fafafa] text-[rgba(0,0,0,0.6)] print:hidden'>
      <div className='shadow-[0px_1px_0px_0px_rgba(0,0,0,0.05)_inset] flex py-20 px-[100px] pb-6 justify-between'>
        <img
          className='m-4 w-[98px] h-[38px]'
          src='https://res.maka.im/assets/store7/logo.png?v4'
          height={38}
          width={98}
          alt='MAKA官网'
        />

        <div className='flex-shrink-0 flex justify-start flex-wrap ml-[107px]'>
          <dl className='text-sm mr-[50px]'>
            <dt className='mb-8 mt-5 font-semibold text-[rgba(0,0,0,0.88)]'>
              关于MAKA{' '}
            </dt>
            <dd className='mt-4 ml-0 relative'>
              合作伙伴{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/partners.html'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              服务条款{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/app/member-policy.html'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              隐私协议{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/datastory/privacy/privacy.html'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              营业执照{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://img2.maka.im/assets/licences/%E8%90%A5%E4%B8%9A%E6%89%A7%E7%85%A7%E5%89%AF%E6%9C%AC-MAKA.pdf'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>{' '}
            </dd>
            <dd className='mt-4 ml-0 relative'>
              加入MAKA{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/joinus.html'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
          </dl>
          <dl className='text-sm mr-[50px]'>
            <dt className='mb-8 mt-5 font-semibold text-[rgba(0,0,0,0.88)]'>
              使用指南{' '}
            </dt>
            <dd className='mt-4 ml-0 relative'>
              APP下载{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/download.html'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              帮助中心{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://support.qq.com/products/162011/faqs-more?clientInfo=web&clientVersion=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_14_6%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F88.0.4324.182+Safari%2F537.36'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              网站地图{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/sitemap.html'
                target='_blank'
                rel='noreferrer'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              意见反馈{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/datastory/privacy/privacy.html'
                target='_blank'
                rel='noreferrer nofollow'
              ></a>
            </dd>
          </dl>

          <dl className='text-sm mr-[50px]'>
            <dt className='mb-8 mt-5 font-semibold text-[rgba(0,0,0,0.88)]'>
              设计学院{' '}
            </dt>
            <dd className='mt-4 ml-0 relative'>
              教程素材{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/baike/jiaochengsucai'
                target='_blank'
                rel='noreferrer'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              技巧攻略{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/baike/jiqiaogonglve'
                target='_blank'
                rel='noreferrer'
              ></a>
            </dd>
            <dd className='mt-4 ml-0 relative'>
              设计赏析{' '}
              <a
                className='absolute top-0 left-0 w-full h-full'
                href='https://www.maka.im/baike/shejishangxi'
                target='_blank'
                rel='noreferrer'
              ></a>
            </dd>
          </dl>
          <dl className='text-sm mr-[50px]'>
            <dt className='mb-8 mt-5 font-semibold text-[rgba(0,0,0,0.88)]'>
              联系我们
            </dt>
            <dd className='mt-4 ml-0 relative'>QQ：2363698210</dd>
            <dd className='mt-4 ml-0 relative'>热线：020-39340995</dd>
            <dd className='mt-4 ml-0 relative'>(周一至周五9:00 - 18:30)</dd>
            <dd className='mt-4 ml-0 relative'>邮箱：business@maka.im</dd>
            <dd className='mt-4 ml-0 relative'>
              地址：广州市海珠区新港东路620号
              <br />
              南丰汇环球展贸中心办公楼814-815
            </dd>
          </dl>
        </div>
        <div className='flex flex-col items-start justify-end text-sm'>
          <div className='relative w-[60px] h-[60px] p-2'>
            <img
              className='absolute top-0 right-0 bottom-0 left-0 w-[60px] h-[60px]'
              src='https://res.maka.im/assets/mk-store-7/qrborder.png'
              alt=''
            />

            <img
              className='w-[46px] h-[46px]'
              width={120}
              height={120}
              src='https://res.maka.im/assets/store3/index/media_platform.jpg?x-oss-process=image/format,webp'
              alt='MAKA公众号二维码'
            />
          </div>
          <p className='w-[60px] text-xs text-[rgba(0,0,0,0.45)] text-center mt-2'>
            扫码关注
            <br />
            获取大礼
          </p>
        </div>
      </div>
      <div className='shadow-[0px_1px_0px_0px_#e5e5e5_inset] py-2.5 px-10 text-sm text-[rgba(0,0,0,0.25)] text-center flex items-center justify-center'>
        <span className='mr-8'>{`©2014-${new Date().getFullYear()} 码卡（广州）科技有限公司`}</span>

        <a
          className='mr-3'
          href='https://beian.miit.gov.cn/'
          rel='nofollow noreferrer'
          target='_blank'
        >
          粤ICP备14001206号
        </a>
        <img
          className='w-4 mr-1'
          src='https://img2.maka.im/cdn/webstore7/assets/icon_beian.jpeg'
          alt=''
        />
        <a
          href='https://beian.mps.gov.cn/#/query/webSearch?code=44030502004249'
          rel='noreferrer'
          target='_blank'
        >
          粤公网安备44030502004249
        </a>
      </div>
    </footer>
  );
};

export default Footer;
