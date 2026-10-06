(function(){
'use strict';

var state={backgroundRequested:false,hiddenAt:0,video:null,monitor:null,wasPlaying:false};

function getVideo(){
  state.video=document.getElementById('video')||state.video;
  return state.video;
}

function isMobile(){
  return !!(window.matchMedia&&window.matchMedia('(max-width:1024px) and (pointer:coarse)').matches);
}

function setSession(active){
  if(!('mediaSession' in navigator))return;
  try{
    navigator.mediaSession.playbackState=active?'playing':'paused';
  }catch(e){}
}

function setMetadata(){
  if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
  var title=(document.getElementById('playerTitle')||{}).textContent||'NM7 TV';
  var meta=(document.getElementById('playerMeta')||{}).textContent||'Truyền hình trực tiếp';
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:title.trim()||'NM7 TV',
      artist:meta.trim()||'NM7 TV',
      album:'NM7 TV',
      artwork:[
        {src:'/assets/nm7-main-logo.png',sizes:'96x96',type:'image/png'},
        {src:'/assets/nm7-main-logo.png',sizes:'192x192',type:'image/png'}
      ]
    });
  }catch(e){}
}

function installActions(){
  if(!('mediaSession' in navigator)||typeof navigator.mediaSession.setActionHandler!=='function')return;
  var v=getVideo();
  var handlers={
    play:function(){try{v&&v.play()}catch(e){}},
    pause:function(){try{v&&v.pause()}catch(e){}},
    seekbackward:function(d){if(!v)return;try{v.currentTime=Math.max(0,v.currentTime-Number(d.seekOffset||10))}catch(e){}},
    seekforward:function(d){if(!v)return;try{v.currentTime=Math.min(isFinite(v.duration)?v.duration:Infinity,v.currentTime+Number(d.seekOffset||30))}catch(e){}},
    stop:function(){try{v&&v.pause()}catch(e){}},
    previoustrack:function(){
      try{if(window.NM7Background&&typeof window.NM7Background.previous==='function')window.NM7Background.previous()}catch(e){}
    },
    nexttrack:function(){
      try{if(window.NM7Background&&typeof window.NM7Background.next==='function')window.NM7Background.next()}catch(e){}
    },
    enterpictureinpicture:function(){try{enterPiP()}catch(e){}}
  };
  Object.keys(handlers).forEach(function(name){
    try{navigator.mediaSession.setActionHandler(name,handlers[name])}catch(e){}
  });
}

function clearActions(){
  if(!('mediaSession' in navigator)||typeof navigator.mediaSession.setActionHandler!=='function')return;
  ['play','pause','seekbackward','seekforward','stop','previoustrack','nexttrack','enterpictureinpicture'].forEach(function(name){
    try{navigator.mediaSession.setActionHandler(name,null)}catch(e){}
  });
  try{navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none'}catch(e){}
}

function setButtonLabel(text,disabled){
  var b=document.querySelector('.backgroundBtn');
  if(!b)return;
  b.textContent=text;
  b.disabled=!!disabled;
  b.style.display=isMobile()?'inline-block':'none';
}

function supportsWebKitPiP(v){
  return !!(v&&v.webkitSupportsPresentationMode&&v.webkitSupportsPresentationMode('picture-in-picture')&&typeof v.webkitSetPresentationMode==='function');
}

function canPiP(v){
  return !!(v&&(supportsWebKitPiP(v)||typeof v.requestPictureInPicture==='function'));
}

function enterPiP(){
  var v=getVideo();
  if(!v){setButtonLabel('◩ Nền (không có player)',true);return Promise.reject(new Error('video not found'))}
  if(!isMobile()){setButtonLabel('◩ Chỉ chạy nền trên mobile',true);return Promise.reject(new Error('not mobile'))}

  if(supportsWebKitPiP(v)){
    try{
      v.webkitSetPresentationMode(v.webkitPresentationMode==='picture-in-picture'?'inline':'picture-in-picture');
      state.backgroundRequested=true;
      setButtonLabel('◩ Đang chạy nền',false);
      return Promise.resolve();
    }catch(e){}
  }
  if(typeof v.requestPictureInPicture==='function'){
    return v.requestPictureInPicture().then(function(){
      state.backgroundRequested=true;
      setButtonLabel('◩ Đang chạy nền',false);
    }).catch(function(e){
      setButtonLabel('◩ Chạy nền',false);
      throw e;
    });
  }
  setButtonLabel('◩ PiP không hỗ trợ',true);
  return Promise.reject(new Error('PiP not supported'));
}

function updateVisibility(){
  var v=getVideo();
  if(!v)return;
  if(document.visibilityState==='hidden'){
    state.hiddenAt=Date.now();
    if(!v.paused){
      state.backgroundRequested=true;
      setSession(true);
    }
    return;
  }
  if(document.visibilityState==='visible'){
    if(state.backgroundRequested&&!v.paused&&'mediaSession' in navigator)setSession(true);
    state.hiddenAt=0;
  }
}

function monitorPlayer(){
  var v=getVideo();
  if(!v)return;
  if(state.video!==v){
    state.video=v;
    v.addEventListener('play',function(){state.wasPlaying=true;setMetadata();setSession(true);installActions()});
    v.addEventListener('playing',function(){state.wasPlaying=true;setMetadata();setSession(true);installActions();setButtonLabel('◩ Chạy nền',false)});
    v.addEventListener('pause',function(){state.wasPlaying=false;setSession(false)});
    v.addEventListener('ended',function(){setSession(false);});
    v.addEventListener('emptied',function(){state.wasPlaying=false;clearActions();setButtonLabel('◩ Chạy nền',false)});
  }
  setButtonLabel(canPiP(v)?'◩ Chạy nền':'◩ Chạy nền (PiP không hỗ trợ)',!canPiP(v));
  if('mediaSession' in navigator&&v&&!v.paused)installActions();
}

function clickBackground(){
  enterPiP().catch(function(){
    /*
     * A browser may deny PiP when its media container does not support it.
     * We still keep Media Session active; Android Chrome may continue audio
     * when the document becomes hidden.
     */
    try{if('mediaSession' in navigator&&getVideo()&&!getVideo().paused)setSession(true)}catch(e){}
  });
}

function previous(){
  var btn=document.querySelector('[data-a="back10"]');
  if(btn&&typeof btn.click==='function')btn.click();
}

function next(){
  var btn=document.querySelector('[data-a="next"]');
  if(btn&&typeof btn.click==='function')btn.click();
}

function boot(){
  var b=document.querySelector('.backgroundBtn');
  if(b)b.addEventListener('click',clickBackground);
  document.addEventListener('visibilitychange',updateVisibility,true);
  window.addEventListener('pagehide',function(){var v=getVideo();if(v&&!v.paused)setSession(true)},true);
  window.addEventListener('pageshow',function(){monitorPlayer();updateVisibility()},true);
  state.monitor=setInterval(monitorPlayer,1000);
  monitorPlayer();
}

window.NM7Background={
  enter:enterPiP,
  previous:previous,
  next:next,
  refresh:monitorPlayer,
  isMobile:isMobile
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();