import axios from 'axios';
export const promptToken = `f042966d53f71413bc5143412fb3e5c45bdc1dc55a6c5d7c6f95a9defdfce37836b7413647b3f334fae050f8ed22665e224dc121d884bc96a89791d5b3ab5cea3bd0e77ff95e05281cda9f581f1bee0d99db896ffe7dfd300c04e6a1e79b6dac326581d02f0df7bfb6309b3ff9aaf9e24bd80a3c0b63f3bdfd7b2fbe53bf9d70`;

export const requestCMS = axios.create({
  baseURL: 'http://localhost:1337/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + promptToken,
  },
});

export const getPromptApiHost = () => {
  return typeof window !== 'undefined' && /dev_host/.test(window.location.href)
    ? 'http://localhost:5544'
    : 'https://mk-prompt-services.maka.im';
};

export const getCmsApiHost = () => {
  return typeof window !== 'undefined' && /dev_cms/.test(window.location.href)
    ? 'http://localhost:1337'
    : 'https://prompt.maka.im';
};
