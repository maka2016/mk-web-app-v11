import ajax from 'micell/ajax';

// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  return new Promise(resolve => {
    ajax('https://geo.maka.im/geoip')
      .then(({ response }: any) => {
        resolve({
          $country: response.Country,
          $province: response.Province,
          $city: response.City,
          $isp: response.Isp,
          $ip: response.Ip,
        });
      })
      .catch(err => {
        console.error(err);
        resolve({});
      });
  });
}
