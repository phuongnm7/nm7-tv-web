(function(){
'use strict';

function videoId(value){
  var s=String(value||'').trim(),m=s.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
  if(m)return m[1];
  m=s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/i);
  return m?m[1]:'';
}

function officialUrl(value){
  var id=videoId(value);
  return id?'https://www.youtube.com/watch?v='+encodeURIComponent(id):'https://www.youtube.com/';
}

var YOUTUBE_PROXY_ORIGIN='https://nm7-youtube-proxy.phuongnm7-iptv.workers.dev';

function isAndroidMobile(){
  return /Android/i.test(navigator.userAgent||'') && !/TV|SMART-TV/i.test(navigator.userAgent||'');
}

function openOriginal(raw){
  var u=officialUrl(raw);
  try{sessionStorage.setItem('nm7:returnUrl',location.href)}catch(e){}

  /*
   * Web-only mode: stay on a YouTube reverse-proxy origin controlled by NM7.
   * This keeps the original YouTube document/UI while putting YouTube-origin
   * requests behind the Worker, where player responses can be filtered.
   */
  location.href=YOUTUBE_PROXY_ORIGIN + new URL(u).pathname + new URL(u).search;
}

window.NM7YouTube={
  open:openOriginal,
  watch:openOriginal,
  close:function(){
    try{
      var back=sessionStorage.getItem('nm7:returnUrl');
      if(back&&back!==location.href){location.href=back;return;}
    }catch(e){}
    history.back();
  }
};
})();