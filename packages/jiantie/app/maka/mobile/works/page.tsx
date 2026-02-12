import WorksListForMaka from '../../../maka-v2/works/WorksListForMaka';
// import WorksListForMaka from './main2';

export default function Page(props: any) {
  // if (process.env.ENV === 'prod') {
  //   return <WorksV1 {...props} />;
  // }
  return <WorksListForMaka {...props} />;
}
