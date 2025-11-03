/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import React from 'react';
import Script from 'next/script';

export default function WebProMonitor() {
  return (
    <>
      {/* <Script
        id="monit-meta"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(n,e,r,t,a,o,s,i,c,l,f,m,p,u){o="precollect";s="getAttribute";i="addEventListener";c="PerformanceObserver";l=function(e){f=[].slice.call(arguments);f.push(Date.now(),location.href);(e==o?l.p.a:l.q).push(f)};l.q=[];l.p={a:[]};n[a]=l;m=document.createElement("script");m.src=r+"?aid="+t+"&globalName="+a;m.crossOrigin="anonymous";e.getElementsByTagName("head")[0].appendChild(m);if(i        in        n){l.pcErr=function(e){e=e||n.event;p=e.target||e.srcElement;if(p        instanceof        Element||p        instanceof        HTMLElement){n[a](o,"st",{tagName:p.tagName,url:p[s]("href")||p[s]("src")})}else{n[a](o,"err",e.error||e.message)}};l.pcRej=function(e){e=e||n.event;n[a](o,"reject",e.reason||e.detail&&e.detail.reason)};n[i]("error",l.pcErr,true);n[i]("unhandledrejection",l.pcRej,true)}if("PerformanceLongTaskTiming"in        n){u=l.pp={entries:[]};u.observer=new        PerformanceObserver(function(e){u.entries=u.entries.concat(e.getEntries())});u.observer.observe({entryTypes:["longtask"]})}})(window,document,"https://apm.volccdn.com/mars-web/apmplus/web/browser.cn.js",0,"apmPlus");
            `,
        }}
      />

<Script
        id="monit-start"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.apmPlus("init",{
  aid:1000212,
  token: 'be5bb4d88f7b4e71bb8850c23679330c'
});
window.apmPlus("start");`,
        }}
      /> */}
    </>
  );
}
