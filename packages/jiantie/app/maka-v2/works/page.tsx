import WorksListForMaka from './WorksListForMaka';

export default function Page(props: any) {
  // if (process.env.ENV === 'prod') {
  //   return <WorksV1 {...props} />;
  // }
  return <WorksListForMaka {...props} />;
}
