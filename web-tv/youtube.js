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

function isAndroidMobile(){
  return /Android/i.test(navigator.userAgent||'') && !/TV|SMART-TV/i.test(navigator.userAgent||'');
}

function openOriginal(raw){
  var u=officialUrl(raw);
  try{sessionStorage.setItem('nm7:returnUrl',location.href)}catch(e){}

  /*
   * A normal Chrome/Safari page cannot intercept youtube.com network requests.
   * On Android, hand off from the user's tap to the NM7 native WebView host.
   * The host owns request interception + document-start filtering. If it is
   * not installed, fall back to the official YouTube page.
   */
  if(isAndroidMobile()){
    var left=false, timer=0;
    var stop=function(){
      left=true;
      if(timer)clearTimeout(timer);
    };
    try{window.addEventListener('pagehide',stop,{once:true});}catch(e){}
    try{
      document.addEventListener('visibilitychange',function(){if(document.hidden)stop()},{once:true});
    }catch(e){}
    try{
      location.href='nm7youtube://open?url='+encodeURIComponent(u);
      timer=setTimeout(function(){
        if(!left)location.href=u;
      },1200);
      return;
    }catch(e){}
  }

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