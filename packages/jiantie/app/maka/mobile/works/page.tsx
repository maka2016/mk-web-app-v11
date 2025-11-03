import WorksV2 from './v2/main';
import Works from './v1/index';

export default function Page(props: any) {
  return <WorksV2 {...props} />;
}
