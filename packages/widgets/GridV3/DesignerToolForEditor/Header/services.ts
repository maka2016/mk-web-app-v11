import axios from 'axios';
import qs from 'qs';

const promptToken = `d4db37673366976ea41b8daa6e17862e526b939e81f5768718ba5cd3f501a46f9203ebc16815d123f2da5577de6935efe58d797d2558dde34aae38f65a6724cf525c93f75d8f2df9e90b06783ec9d72191f28538df49d7409eabb4c072d34fd12896dd2254ab7fe998987939d135595b734c92ccd1b12a2decd00dfca8582438`;

export const requestCMSDesigner = axios.create({
  baseURL: 'https://prompt.maka.im',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + promptToken,
  },
});

const getTemplateCmsDocumentId = async (templateId: string) => {
  const queryStr = {
    filters: {
      template_id: {
        $eq: templateId,
      },
    },
    pagination: {
      page: 1,
      pageSize: 1,
    },
    sort: ['sort_score:desc'],
  };

  const templateCmsDocumentId = await requestCMSDesigner.get(
    `/api/template-items?${qs.stringify(queryStr, {
      encode: false,
    })}`
  );

  // 添加更详细的日志
  // console.log("Response data.data:", templateCmsDocumentId.data.data);

  // 添加错误处理
  if (!templateCmsDocumentId.data?.data) {
    console.error('No data found for templateId:', templateId);
    throw new Error(`No template found with ID: ${templateId}`);
  }

  return templateCmsDocumentId.data.data?.[0]?.documentId;
};

export const updateTemplateCover = async (
  templateId: string,
  designer_uid: string,
  coverType: '动态' | '静态' = '动态'
) => {
  console.log('templateId', templateId);
  const templateUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;
  const apiUrl =
    coverType === '动态'
      ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
      : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';
  const apiUrlFinal = `${apiUrl}?url=${encodeURIComponent(
    templateUrl
  )}&width=540&height=960&works_id=${templateId}&uid=${designer_uid}&mode=template&watermark=0&setpts=0.5&pageCount=1`;
  console.log('apiUrlFinal', apiUrlFinal);
  const coverRes = await axios.get(apiUrlFinal, {
    timeout: 60000,
  });

  const coverUrl =
    coverType === '动态'
      ? coverRes.data.fullUrls[0]
      : coverRes.data?.data?.fullUrls?.[0];
  console.log('coverUrl', coverUrl);

  await axios.put(`https://works-server-v2.maka.im/template/v1/${templateId}`, {
    cover: coverUrl,
  });

  const templateCmsDocumentId = await getTemplateCmsDocumentId(templateId);

  await requestCMSDesigner.put(`/api/template-items/${templateCmsDocumentId}`, {
    data: {
      cover_url: coverUrl,
    },
  });

  return coverUrl;
};
