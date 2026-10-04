(function(){
'use strict';
var DEFAULT_URL='https://nm7-tv-web.citrine-cent.workers.dev/';
var params=new URLSearchParams(location.search);
var target=params.get('url')||DEFAULT_URL;
var frame=document.getElementById('nm7');
var capture=document.getElementById('remoteCapture');
var C={ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Back:10009};

function send(name){
 try{frame.contentWindow.postMessage({type:'nm7-remote',key:name,keyCode:C[name]},'*')}catch(e){}
}
function registerRemote(){
 try{
  if(!window.tizen||!tizen.tvinputdevice)return;
  ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','Enter','Back'].forEach(function(k){
   try{tizen.tvinputdevice.registerKey(k)}catch(e){}
  });
 }catch(e){}
}
function nameFor(e){
 var k=String(e.key||'');
 if(C[k])return k;
 var c=Number(e.keyCode||e.which||0);
 for(var n in C)if(C[n]===c)return n;
 return '';
}
function keydown(e){
 var name=nameFor(e);
 if(!name)return;
 try{e.preventDefault();e.stopPropagation()}catch(x){}
 send(name);
}
function focusCapture(){
 try{capture.focus()}catch(e){}
}
function boot(){
 registerRemote();
 focusCapture();
 frame.src=target;
 frame.addEventListener('load',focusCapture);
 document.addEventListener('keydown',keydown,true);
 document.addEventListener('keyup',function(e){
  var name=nameFor(e);if(!name)return;
  try{e.preventDefault();e.stopPropagation()}catch(x){}
 },true);
 document.addEventListener('focusin',focusCapture,true);
}
boot();
})();