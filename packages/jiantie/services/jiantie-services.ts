const env = process.env.ENV;
export const getJiantieApiHost = () => {
  // return "https://jiantie-api.maka.im";
  if (env === 'prod') {
    return 'https://jiantie-api.maka.im';
  }
  return `https://${env}-jiantie-api.maka.im`;
};

export const worksServerV2 = () => {
  // return "http://localhost:9990";
  // return "https://works-server-v2.maka.im";
  if (env === 'prod') {
    return 'https://works-server-v2.maka.im';
  }
  return `https://${env}-works-server-v2.maka.im`;
};
