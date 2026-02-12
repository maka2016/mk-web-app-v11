import Home3 from './components/home3/home3';
import Home4 from './components/home4/home4';

export default function Page(props: any) {
  const appid = props.appid;
  if (props.storeChannelV1) {
    // if (appid === 'jiantie') {
    //   return <Home5 {...props} />;
    // }
    return <Home4 {...props} />;
  }
  return <Home3 {...props} />;
}
