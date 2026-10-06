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

  // The normal browser path must use the first-party YouTube origin. A Cloudflare
  // Worker reverse proxy can be rate-limited by YouTube and leave the app shell
  // stuck on skeleton placeholders. The Worker is retained only as an explicit
  // diagnostic/proxy endpoint and is not the default navigation path.
  location.href=u;
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