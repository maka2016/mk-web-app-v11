import { queryToObj } from '@mk/utils';
import React from 'react';

export function LoadWidget<T = any>(widgetRef: any): React.FC<T> {
  const result = (window?.[widgetRef] as any)?.default || window?.[widgetRef];
  return result;
}

export function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts?.pop()?.split(';').shift();
}

export function setCookie(name: string, value: string, expiredays: number) {
  var exdate: any = new Date();
  exdate.setDate(exdate.getDate() + expiredays);

  var domainString =
    window.location.host.indexOf('maka.im') >= 0 ? 'domain=maka.im;' : '';
  if (!domainString) {
    domainString =
      window.location.host.indexOf('maka.io') >= 0 ? 'domain=maka.io;' : '';
  }

  document.cookie =
    name +
    '=' +
    escape(value) +
    (expiredays == null ? '' : ';expires=' + exdate.toGMTString()) +
    ';path=/;' +
    domainString;
}
