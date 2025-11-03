export const worksServerV2 = () => {
  const env = process.env.ENV;
  // return "http://localhost:9990";
  if (env === 'prod') {
    return 'https://works-server-v2.maka.im';
  }
  return `https://${env}-works-server-v2.maka.im`;
};
