// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  return new Promise(resolve => {
    fetch('https://geo.maka.im/geoip')
      .then(res => res.json())
      .then((data: any) => {
        resolve({
          $country: data?.Country,
          $province: data?.Province,
          $city: data?.City,
          $isp: data?.Isp,
          $ip: data?.Ip,
        });
      })
      .catch(err => {
        console.error(err);
        resolve({});
      });
  });
}
