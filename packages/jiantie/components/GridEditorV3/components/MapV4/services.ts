import fetchJsonp from './fetch-jsonp';
import { txMapKey } from './const';

// const key2 = "MI5BZ-Y2AC4-N3RUC-KNCKQ-S6MNF-4BFIE"
// const key1 = "52HBZ-FHLKX-O3543-7XLAA-U5HP3-B3BWN"

export const searchPlaceSuggestion = async (keyword: string) => {
  return new Promise((resolve, reject) => {
    fetchJsonp(
      `https://apis.map.qq.com/ws/place/v1/suggestion?keyword=${keyword}&key=${txMapKey}&output=jsonp`,
      {
        jsonpCallback: 'callback',
      }
    )
      .then((res: any) => {
        return res.json();
      })
      .then(json => {
        console.log('parsed json', json);
        resolve(json.data);
      })
      .catch(ex => {
        console.log('parsing failed', ex);
      });
  });
};
