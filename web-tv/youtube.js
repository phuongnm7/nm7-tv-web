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

function openOriginal(raw){
  var u=officialUrl(raw);
  try{sessionStorage.setItem('nm7:returnUrl',location.href)}catch(e){}
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