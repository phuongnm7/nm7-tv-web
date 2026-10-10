(function(){
'use strict';
var VERSION='1.0.69'; // Native 1.0.69 wallpaper asset restored from APK.
var PLAYLISTS={
 tv:'/api/playlist?source=tv&default=1',
 tv2:'/api/playlist?source=tv&default=2',
 sport:'/api/playlist?source=sport'
};

// Initial TV preset: Android and Windows use preset 2; iOS/iPadOS and other platforms use preset 1.
function detectDefaultTvPreset(){
 var ua='',platform='',uaDataPlatform='',touchPoints=0;
 try{
  if(typeof navigator!=='undefined'){
   ua=String(navigator.userAgent||'');
   platform=String(navigator.platform||'');
   uaDataPlatform=String(navigator.userAgentData&&navigator.userAgentData.platform||'');
   touchPoints=Number(navigator.maxTouchPoints||0);
  }
 }catch(e){}
 if(/android/i.test(ua)||/^android$/i.test(platform)||/^android$/i.test(uaDataPlatform))return 2;
 if(/iphone|ipad|ipod/i.test(ua)||/iphone|ipad|ipod/i.test(platform)||(/macintel/i.test(platform)&&touchPoints>1))return 1;
 if(/windows/i.test(ua)||/^win/i.test(platform)||/^windows$/i.test(uaDataPlatform))return 2;
 return 1;
}
var S={
 source:'tv',
 tvPreset:detectDefaultTvPreset(),
 list:[],
 groups:[],
 row:0,
 col:0,
 zone:'home',
 menu:0,
 menuOpen:false,
 dialog:null,
 query:'',
 fav:[],
 recent:[],
 player:false,
 current:null,
 candidateIndex:0,
 proxyAttempt:false,
 retryPending:false,
 watchdog:null,
 drmRecoveryCount:0,
 drmHardRecoveryCount:0,
 drmRecoveryTimer:null,
 drmStallTimer:null,
 drmStallAnchor:0,
 drmStallSince:0,
 hls:null,
 dash:null,
 shaka:null,
 mpegts:null,
 ctrl:false,
 ctrlIndex:2,
 quick:false,
 quickIndex:0,
 generation:0,
 loading:false,
 debug:new URLSearchParams(location.search).get('debug')==='1',
 audioMutedByPolicy:false,
 backArmed:false,
 backTimer:null,
 historyGuard:false,
 exitAllow:false,
 mobileMode:false,
 localM3uText:'',
 localM3uName:''
};
var $=function(id){return document.getElementById(id)};
var toastTimer=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function dbg(s){
 if(!S.debug)return;
 var d=$('debug');if(!d)return;
 dbg.lines=dbg.lines||[];
 dbg.lines.push(new Date().toLocaleTimeString()+' '+String(s||''));
 if(dbg.lines.length>120)dbg.lines.splice(0,dbg.lines.length-120);
 d.style.display='block';
 d.textContent=dbg.lines.join('\n');
 d.scrollTop=d.scrollHeight;
}
function toast(s){var t=$('toast');t.textContent=s;t.className='show';clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.className=''},2600)}
function isHttp(u){return /^https?:\/\//i.test(String(u||''))}
function saveUser(){try{localStorage.setItem('nm7:fav',JSON.stringify(S.fav));localStorage.setItem('nm7:recent',JSON.stringify(S.recent.slice(0,80)))}catch(e){}}
function restoreUser(){try{S.fav=JSON.parse(localStorage.getItem('nm7:fav')||'[]');S.recent=JSON.parse(localStorage.getItem('nm7:recent')||'[]')}catch(e){S.fav=[];S.recent=[]}}
var CACHE_SCHEMA='20261009-vietmitv-defaults-1';
function cacheKey(){return 'nm7:web:'+CACHE_SCHEMA+':'+S.source+(S.source==='tv'?':default-'+(S.tvPreset===2?2:1):'')}
function readCache(){try{var x=JSON.parse(localStorage.getItem(cacheKey())||'null');if(!x||x.schema!==CACHE_SCHEMA||!Array.isArray(x.channels)||!x.channels.length)return null;return x}catch(e){return null}}
function isAndroid1069DefaultList(channels){
 if(!Array.isArray(channels)||!channels.length)return false;
 var groups=[],seen={};
 for(var i=0;i<channels.length;i++){var g=String(channels[i].group||'');if(!seen[g]){seen[g]=1;groups.push(g)}}
 if(groups.length<4||groups[0]!=='VTV'||groups[1]!=='VTVcab'||groups[2]!=='Thể Thao'||groups[3]!=='SCTV')return false;
 var vtv=channels.filter(function(x){return String(x.group||'')==='VTV'}).map(function(x){return x.name});
 var cab=channels.filter(function(x){return String(x.group||'')==='VTVcab'}).map(function(x){return x.name});
 var sport=channels.filter(function(x){return String(x.group||'')==='Thể Thao'}).map(function(x){return x.name});
 var sctv=channels.filter(function(x){return String(x.group||'')==='SCTV'}).map(function(x){return x.name});
 var vtvExpected=['VTV1','VTV2','VTV3','VTV4','VTV5','VTV5 Tây Nam Bộ','VTV5 Tây Nguyên','VTV6'];
 var cabExpected=['On BiBi','ON Cine','ON E- Channel','On Golf','ON Info TV','On Kids','On Life','On Movies - You TV'];
 var sportExpected=['HTV Thể Thao','SCTV15','SCTV17','SCTV22','VTV6','VTVCab 3 - ON Sports HD'];
 var sctvExpected=['SCTV Phim Tổng Hợp','SCTV1','SCTV2 - TODAY TV','SCTV3'];
 function starts(a,b){for(var i=0;i<b.length;i++)if(a[i]!==b[i])return false;return true}
 return starts(vtv,vtvExpected)&&starts(cab,cabExpected)&&starts(sport,sportExpected)&&starts(sctv,sctvExpected);
}
function saveCache(){try{localStorage.setItem(cacheKey(),JSON.stringify({schema:CACHE_SCHEMA,at:Date.now(),channels:S.list}))}catch(e){}}
function norm(c){
 c=c||{};
 if(!Array.isArray(c.candidates))c.candidates=[];
 c.id=String(c.id||c.name||'');
 c.name=String(c.name||'Kênh');
 c.group=String(c.group||'Khác');
 c.logo=String(c.logo||'');
 return c
}

function parseM3U(text,base){
 var lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/),out=[],m=null,ua='',ref='',origin='',headers={},manifest='',licenseType='',licenseKey='',epg='';
 function finish(){if(m&&m.candidates.length)out.push(m)}
 for(var i=0;i<lines.length;i++){
  var l=lines[i].trim(),mt,lt,lk,um,rm,p,h,url,ps,r,u;
  if(!l)continue;
  if(l.indexOf('#EXTM3U')===0){
   var tvg=/url-tvg="([^"]*)"/i.exec(l)||/x-tvg-url="([^"]*)"/i.exec(l);
   if(tvg)epg=resolveUrl(tvg[1],base);
   continue
  }
  if(l.indexOf('#EXTINF:')===0){
   finish();
   p=l.indexOf(',');h=p<0?l:l.slice(0,p);
   m={name:p<0?'Kênh':l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||'Khác',logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||'',id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||'',candidates:[],catchup:(/catchup="([^"]*)"/i.exec(h)||[])[1]||'',catchupDays:(/catchup-days="([^"]*)"/i.exec(h)||[])[1]||'',catchupSource:(/catchup-source="([^"]*)"/i.exec(h)||[])[1]||''};
   ua='';ref='';origin='';headers={};manifest='';licenseType='';licenseKey='';
   continue
  }
  if(!m)continue;
  if(l.indexOf('#EXTHTTP:')===0){
   try{
    var rawHeaders=JSON.parse(l.slice(l.indexOf(':')+1).trim());
    if(rawHeaders&&typeof rawHeaders==='object'&&!Array.isArray(rawHeaders)){
     Object.keys(rawHeaders).forEach(function(k){
      var value=rawHeaders[k];if(typeof value!=='string'||!value.trim())return;
      var lk=String(k).toLowerCase();
      if(lk==='user-agent')ua=value;
      else if(lk==='referer'||lk==='referrer')ref=value;
      else if(lk==='origin')origin=value;
      else headers[k]=value;
     });
    }
   }catch(e){}
   continue
  }
  if(l.indexOf('#EXTVLCOPT:')===0){
   um=/http-user-agent=(?:"([^"]+)"|(.*))/i.exec(l);rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l);
   if(um)ua=(um[1]||um[2]||'').trim();
   if(rm)ref=rm[1]||rm[2];
   var om=/http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);if(om)origin=om[1]||om[2];
   continue
  }
  if(l.indexOf('#KODIPROP:')===0){
   mt=/manifest_type=(.+)/i.exec(l);lt=/license_type=(.+)/i.exec(l);lk=/license_key=(.+)/i.exec(l);
   if(mt)manifest=mt[1].trim();
   if(lt)licenseType=lt[1].trim();
   if(lk)licenseKey=lk[1].trim();
   continue
  }
  if(l.charAt(0)==='#')continue;
  if(/^(https?|rtsp|rtmp|udp|srt|rtp):/i.test(l)){
   ps=l.split('|');url=resolveUrl(ps[0],base);r=ref;u=ua;
   for(var j=1;j<ps.length;j++){
    var z=ps[j],eq=z.indexOf('='),k=eq>0?z.slice(0,eq):'',v=eq>0?decodeURIComponent(z.slice(eq+1)):'';if(/^referer$/i.test(k))r=v;if(/^http-user-agent$/i.test(k))u=v;if(/^origin$/i.test(k))origin=v;
   }
   var mm=manifest.toLowerCase(),cand={url:url,ref:r,ua:u,headers:Object.assign({},headers),type:mm==='mpd'?'dash':mm==='hls'?'hls':'',dash:mm==='mpd',hls:mm==='hls'||/\.m3u8?(?:$|\?)/i.test(url)||/playlist|index\.m3u|manifest/i.test(url),drm:licenseType&&licenseKey?{type:licenseType,key:licenseKey}:null};
   if(origin)cand.headers.Origin=origin;m.candidates.push(cand);
  }
 }
 finish();
 for(var q=0;q<out.length;q++){out[q]=norm(out[q]);out[q].id=out[q].id||out[q].name}
 return {channels:out,epgUrl:epg}
}
function resolveUrl(u,base){
 var x=String(u||'').trim();if(!x)return '';
 if(isHttp(x)||/^(rtsp|rtmp|udp|srt|rtp):/i.test(x)||!base)return x;
 try{return new URL(x,base).toString()}catch(e){return x}
}

function renderHome(){
 var home=$('homeRows'),html='',shownGroups=S.groups.length;
 if(!S.list.length){home.innerHTML='<div class="empty">Không có kênh phù hợp</div>';return}
 for(var r=0;r<shownGroups;r++){
  var g=S.groups[r],a=channelsInGroup(g);if(!a.length)continue;
  html+='<section class="row" data-row="'+r+'"><h2>'+esc(g)+'</h2><div class="cards">';
  var shown=a.length;
  for(var i=0;i<shown;i++){
   var c=a[i],selected=(S.zone==='home'&&!S.menuOpen&&r===S.row&&i===S.col),logo=logoSource(c),star=S.fav.indexOf(c.id)>=0;
   var tvSpatial=isTvLikeDevice();
   html+='<button class="card" type="button" tabindex="'+(tvSpatial?'0':(selected?'0':'-1'))+'" data-row="'+r+'" data-col="'+i+'" aria-label="'+esc(c.name)+'" aria-selected="'+(selected?'true':'false')+'">';
   html+='<div class="thumb">';
   if(logo)html+='<img loading="lazy" class="channelLogo '+(logoOverride(c)?'noClip':'')+'" data-row="'+r+'" data-src="'+esc(logo)+'" alt="">';
   else html+='<span>TV</span>';
   html+='</div><div class="name">'+esc(c.name)+'</div>'+ (star?'<span class="star">★</span>':'') +'</button>';
  }
  html+='</div></section>';
 }
 home.innerHTML=html;
 var cards=home.querySelectorAll('.card');
 for(var j=0;j<cards.length;j++){
  cards[j].addEventListener('click',onCardClick);
  cards[j].addEventListener('focus',function(){
   var rr=Number(this.dataset.row||0),cc=Number(this.dataset.col||0);
   S.row=rr;S.col=cc;S.zone='home';S.menuOpen=false;
   activateLogos();
  });
 }
 var imgs=home.querySelectorAll('img[data-row]');
 for(var z=0;z<imgs.length;z++)imgs[z].addEventListener('error',function(){this.style.display='none';if(this.parentNode&&!this.parentNode.querySelector('span'))this.parentNode.insertAdjacentHTML('beforeend','<span>TV</span>')});
 focusHome(true);
 activateLogos();
}
function onCardClick(e){
 var b=e.currentTarget,rr=Number(b.dataset.row||0),cc=Number(b.dataset.col||0),a=channelsInGroup(S.groups[rr]||''),c=a[cc];
 if(c)openPlayer(c)
}
function channelsInGroup(g){
 var source=getVisibleList(),a=[];
 for(var i=0;i<source.length;i++)if((source[i].group||'Khác')===g)a.push(source[i]);
 return a
}
function getVisibleList(){
 if(!S.query)return S.list;
 var q=S.query.toLowerCase(),a=[];
 for(var i=0;i<S.list.length;i++){var c=S.list[i];if((c.name+' '+c.group+' '+c.id).toLowerCase().indexOf(q)>=0)a.push(c)}
 return a
}
function rebuildGroups(){
 var a=getVisibleList(),seen={},g=[];
 for(var i=0;i<a.length;i++){var x=a[i].group||'Khác';if(!seen[x]){seen[x]=1;g.push(x)}}
 var priority={'VTV':0,'VTVcab':1,'Thể Thao':2,'The Thao':2,'SCTV':3};
 g.sort(function(x,y){
  var px=priority.hasOwnProperty(x)?priority[x]:1000,py=priority.hasOwnProperty(y)?priority[y]:1000;
  return px-py;
 });
 S.groups=g;
 if(S.row>=g.length)S.row=Math.max(0,g.length-1);
 var count=channelsInGroup(g[S.row]||'').length;
 if(S.col>=count)S.col=Math.max(0,count-1);
}
function ensureCardVisible(el){
 if(!el)return;
 var sc=el.closest('.cards');
 if(!sc)return;
 var left=el.offsetLeft;
 var right=left+el.offsetWidth;
 var visibleLeft=sc.scrollLeft+10;
 var visibleRight=sc.scrollLeft+sc.clientWidth-10;
 if(left<visibleLeft){
   sc.scrollLeft=Math.max(0,left-14);
 }else if(right>visibleRight){
   sc.scrollLeft=Math.max(0,right-sc.clientWidth+14);
 }
}
function homeRowsScroll(){return $('homeRows')}
function scrollHomeRowsToSection(section){
 var sc=homeRowsScroll();
 if(!sc||!section)return;
 var top=section.offsetTop;
 var bottom=top+section.offsetHeight;
 var viewTop=sc.scrollTop;
 var viewBottom=viewTop+sc.clientHeight;
 var maxTop=Math.max(0,sc.scrollHeight-sc.clientHeight);
 if(top<viewTop+6)sc.scrollTop=Math.max(0,top-8);
 else if(bottom>viewBottom-6)sc.scrollTop=Math.min(maxTop,bottom-sc.clientHeight+8);
}
function scrollHomeRowsByPage(direction){
 var sc=homeRowsScroll();
 if(!sc)return;
 var maxTop=Math.max(0,sc.scrollHeight-sc.clientHeight);
 if(maxTop<=0)return;
 var step=Math.max(70,Math.round(sc.clientHeight*0.72));
 sc.scrollTop=Math.max(0,Math.min(maxTop,sc.scrollTop+(direction<0?-step:step)));
}

function homeSpatialCards(){
 var nodes=document.querySelectorAll('#homeRows .card');
 var a=[];
 for(var i=0;i<nodes.length;i++){
  var r=nodes[i].getBoundingClientRect();
  if(!r.width||!r.height)continue;
  a.push({el:nodes[i],left:r.left,right:r.right,top:r.top,bottom:r.bottom,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2});
 }
 a.sort(function(x,y){return x.top-y.top||x.left-y.left});
 return a;
}
function homeVisualRows(cards){
 var rows=[];
 var tolerance=10;
 for(var i=0;i<cards.length;i++){
  var item=cards[i],row=null;
  for(var j=0;j<rows.length;j++){
   if(Math.abs(rows[j].cy-item.cy)<=tolerance){row=rows[j];break}
  }
  if(!row){row={cy:item.cy,items:[]};rows.push(row)}
  row.items.push(item);
  row.cy=row.items.reduce(function(sum,x){return sum+x.cy},0)/row.items.length;
 }
 rows.sort(function(a,b){return a.cy-b.cy});
 for(var k=0;k<rows.length;k++)rows[k].items.sort(function(a,b){return a.left-b.left});
 return rows;
}
function moveHomeSpatial(direction){
 var cards=homeSpatialCards();
 if(!cards.length)return false;
 var active=document.activeElement;
 var current=null;
 for(var i=0;i<cards.length;i++)if(cards[i].el===active){current=cards[i];break}
 if(!current){
  for(var z=0;z<cards.length;z++){
   if(Number(cards[z].el.dataset.row||-1)===S.row&&Number(cards[z].el.dataset.col||-1)===S.col){current=cards[z];break}
  }
 }
 if(!current)current=cards[0];

 var rows=homeVisualRows(cards),ri=-1,ii=-1;
 for(var r=0;r<rows.length;r++){
  for(var q=0;q<rows[r].items.length;q++){
   if(rows[r].items[q]===current){ri=r;ii=q;break}
  }
  if(ri>=0)break;
 }
 if(ri<0)return false;

 var target=null;
 if(direction==='left'){
  if(ii===0){
   openMenu();
   return true;
  }
  target=rows[ri].items[ii-1];
 }else if(direction==='right'){
  if(ii<rows[ri].items.length-1){
   target=rows[ri].items[ii+1];
  }else if(ri<rows.length-1){
   target=rows[ri+1].items[0];
  }else{
   scrollHomeRowsByPage(1);
   return true;
  }
 }else if(direction==='up'){
  if(ri>0){
   var prev=rows[ri-1].items, best=prev[0],bestD=Infinity;
   for(var p=0;p<prev.length;p++){var d=Math.abs(prev[p].cx-current.cx);if(d<bestD){bestD=d;best=prev[p]}}
   target=best;
  }else{
   scrollHomeRowsByPage(-1);
   return true;
  }
 }else if(direction==='down'){
  if(ri<rows.length-1){
   var next=rows[ri+1].items,bestN=next[0],bestND=Infinity;
   for(var n=0;n<next.length;n++){var dn=Math.abs(next[n].cx-current.cx);if(dn<bestND){bestND=dn;bestN=next[n]}}
   target=bestN;
  }else{
   scrollHomeRowsByPage(1);
   return true;
  }
 }
 if(!target)return false;
 var rr=Number(target.el.dataset.row||0),cc=Number(target.el.dataset.col||0);
 setFocusCard(rr,cc,true);
 return true;
}

function setFocusCard(rr,cc,focusNow){
 var a=channelsInGroup(S.groups[rr]||'');if(!a.length)return false;
 cc=Math.max(0,Math.min(a.length-1,cc));S.zone='home';S.row=rr;S.col=cc;
 var el=document.querySelector('.card[data-row="'+rr+'"][data-col="'+cc+'"]');
 if(!el){renderHome();el=document.querySelector('.card[data-row="'+rr+'"][data-col="'+cc+'"]')}
 if(el){
  var all=document.querySelectorAll('.card');for(var i=0;i<all.length;i++){all[i].tabIndex=isTvLikeDevice()?0:-1;all[i].setAttribute('aria-selected','false')}
  el.tabIndex=0;el.setAttribute('aria-selected','true');
  if(focusNow)try{el.focus({preventScroll:true})}catch(e){try{el.focus()}catch(e2){}}
  try{ensureCardVisible(el)}catch(e3){}
  var section=el.closest('.row');
  if(section)try{scrollHomeRowsToSection(section)}catch(e4){}
  if(window.requestAnimationFrame)requestAnimationFrame(function(){
   ensureCardVisible(el);
   var s=el.closest('.row');if(s)scrollHomeRowsToSection(s);
  });
  activateLogos();
 }
 return true
}
function focusHome(initial){
 if(!S.list.length)return;
 if(S.zone!=='home')return;
 var a=channelsInGroup(S.groups[S.row]||'');if(!a.length){rebuildGroups();a=channelsInGroup(S.groups[S.row]||'')}
 setFocusCard(S.row,S.col,!!initial)
}
function activateLogos(){
 var imgs=document.querySelectorAll('img[data-src]');
 for(var i=0;i<imgs.length;i++){
  var r=Number(imgs[i].dataset.row||0);
  if(Math.abs(r-S.row)<=2){imgs[i].src=imgs[i].dataset.src;imgs[i].removeAttribute('data-src')}
 }
}
function logoOverride(c){
 var id=String(c&&c.id||'').toLowerCase().replace(/[\s_-]+/g,'');
 var n=String(c&&c.name||'').toLowerCase().replace(/[\s_-]+/g,'');
 var g=String(c&&c.group||'').toLowerCase();
 if(g.indexOf('vtvcab')<0&&n.indexOf('vtvcab')<0)return '';
 if(id==='vtvcab3hd'||n.indexOf('onsports')>=0||n.indexOf('vtvcab3')>=0)return 'https://cdn.hqth.me/logo/thumbs/14.png';
 if(id==='vtvcab6hd'||n.indexOf('onsports+')>=0||n.indexOf('vtvcab6')>=0)return 'https://cdn.hqth.me/logo/thumbs/17.png';
 if(id==='vtvcab16hd'||n.indexOf('onfootball')>=0||n.indexOf('vtvcab16')>=0)return 'https://cdn.hqth.me/logo/thumbs/24.png';
 if(id==='vtvcab18hd'||n.indexOf('onsportsnews')>=0||n.indexOf('vtvcab18')>=0)return 'https://cdn.hqth.me/logo/thumbs/26.png';
 return ''
}
function logoSource(c){
 var u=logoOverride(c)||c.logo||'';return isHttp(u)?'/api/image?u='+encodeURIComponent(u)+'&r='+encodeURIComponent(c.ref||'')+'&ua='+encodeURIComponent(c.ua||''):u
}

function renderMenu(){
 var labels=['⌂  Trang chính','▶  YouTube gốc · AdBlock','⌕  Tìm kiếm kênh','TV  Tất cả các kênh','▣  Truyền hình','⚽  Thể thao','★  Yêu thích','◷  Gần đây','+  Thêm nguồn','☷  Chỉnh sửa nguồn','↻  Tải lại nguồn'];
 var menu=$('sideList'),html='';
 for(var i=0;i<labels.length;i++)html+='<button class="menuBtn" type="button" tabindex="'+(i===S.menu?'0':'-1')+'" data-menu="'+i+'">'+labels[i]+'</button>';
 menu.innerHTML=html;
 var bs=menu.querySelectorAll('.menuBtn');
 for(var j=0;j<bs.length;j++){bs[j].addEventListener('click',function(){S.menu=Number(this.dataset.menu);selectMenu()})}
 var target=bs[S.menu]||bs[0];if(target)target.focus();
}
function openMenu(){
 if(S.player){hideQuick();S.ctrl=false;$('ctrl').className='hidden'}
 S.zone='menu';S.menuOpen=true;$('side').className='';renderMenu()
}
function closeMenu(){
 S.menuOpen=false;$('side').className='hidden';S.zone=S.player?'player':'home';renderHome();if(!S.player)focusHome(true);else playerFocus()
}
function selectMenu(){
 var p=S.menu;
 if(p===0){closeMenu();return}
 if(p===1){openYouTube();return}
 if(p===2){showSearch();return}
 if(p===3){S.query='';rebuildGroups();closeMenu();return}
 if(p===4){closeMenu();loadSource('tv',false,S.tvPreset);return}
 if(p===5){closeMenu();loadSource('sport');return}
 if(p===6){showSubset('fav');return}
 if(p===7){showSubset('recent');return}
 if(p===8){showAddSource();return}
 if(p===9){showSources();return}
 if(p===10){
  closeMenu();
  if(S.source==='local-m3u'&&S.localM3uText){applyLocalM3U(S.localM3uText,S.localM3uName,'Đã tải lại tệp M3U · '+S.list.length+' kênh');return}
  loadSource(S.source,true,S.tvPreset);return
 }
}
function openYouTube(raw){
 S.menuOpen=false;
 $('side').className='hidden';
 S.zone='home';
 if(window.NM7YouTube&&typeof window.NM7YouTube.open==='function'){
  window.NM7YouTube.open(raw||'');
  return;
 }
 location.href=raw||'https://www.youtube.com/';
}
function showSubset(kind){
 var a=[],ids=S.fav;
 if(kind==='recent'){
  for(var i=0;i<S.recent.length;i++){var c=findById(S.recent[i]);if(c)a.push(c)}
 }else for(var j=0;j<S.list.length;j++)if(ids.indexOf(S.list[j].id)>=0)a.push(S.list[j]);
 if(!a.length){toast(kind==='recent'?'Gần đây trống':'Yêu thích trống');return}
 S.list=a;S.query='';rebuildGroups();S.row=0;S.col=0;S.menuOpen=false;$('side').className='hidden';S.zone='home';renderHome();focusHome(true)
}
function findById(id){for(var i=0;i<S.list.length;i++)if(S.list[i].id===id)return S.list[i];return null}
function showSearch(){
 S.dialog='search';$('dlg').className='';$('box').innerHTML='<h2>Tìm kiếm kênh</h2><input id="qin" class="input" value="'+esc(S.query)+'" placeholder="Tên kênh, TVG-ID hoặc nhóm"><p class="guide">Gõ nội dung tìm kiếm, dùng Enter để đóng.</p><div class="dialogActions"><button class="db" data-dlg="close">Đóng</button></div>';
 var q=$('qin');q.focus();q.addEventListener('input',function(){S.query=this.value.trim()});
 $('box').querySelector('[data-dlg="close"]').addEventListener('click',closeDialog)
}
function closeDialog(){var type=S.dialog;S.dialog=null;$('dlg').className='hidden';if(type==='search'){rebuildGroups();renderHome()}if(type==='exit')resetBackArm();if(S.player)playerFocus();else if(S.menuOpen)renderMenu();else focusHome(true)}
function showAddSource(){
 S.dialog='add';$('dlg').className='';$('box').innerHTML='<h2>Thêm nguồn IPTV</h2><input id="srcInput" class="input" placeholder="https://.../playlist.m3u"><p class="guide">Nguồn phải là HTTPS/HTTP. Web Browser vẫn giữ nguyên metadata của playlist cho header và DRM.</p><div class="dialogActions" style="justify-content:flex-start;align-items:center"><button class="db" id="srcFileBtn" type="button">📁 Chọn tệp M3U</button><input id="srcFile" type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"><span id="srcFileName" class="guide" style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Chưa chọn tệp</span></div><div class="dialogActions"><button class="db" id="srcOk" type="button">Mở nguồn</button><button class="db" id="srcCancel" type="button">Hủy</button></div>';
 var i=$('srcInput'),fb=$('srcFileBtn'),fi=$('srcFile'),fn=$('srcFileName');i.focus();
 function pickFile(){try{fi.click()}catch(e){toast('Không thể mở trình chọn tệp trên trình duyệt này')}}
 fb.onclick=pickFile;
 fi.addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;fn.textContent=String(f.name||'Tệp M3U');loadLocalM3UFile(f,function(){closeDialog();if(S.menuOpen)closeMenu()});this.value='' });
 $('srcOk').onclick=function(){var u=i.value.trim();if(!isHttp(u)){i.focus();toast('URL nguồn không hợp lệ');return}closeDialog();loadCustom(u)};
 $('srcCancel').onclick=closeDialog
}
function readLocalFileText(file){
 return new Promise(function(resolve,reject){
  if(!file){reject(new Error('Chưa chọn tệp'));return}
  if(typeof file.text==='function'){
   file.text().then(function(t){resolve(String(t||''))},function(){reject(new Error('Không đọc được tệp M3U'))});return
  }
  if(typeof FileReader==='undefined'){reject(new Error('Trình duyệt không hỗ trợ đọc tệp cục bộ'));return}
  var fr=new FileReader();
  fr.onload=function(){resolve(String(fr.result||''))};
  fr.onerror=function(){reject(new Error('Không đọc được tệp M3U'))};
  try{fr.readAsText(file,'UTF-8')}catch(e){reject(new Error('Không đọc được tệp M3U'))}
 })
}
function applyLocalM3U(text,name,message){
 var p=parseM3U(text,'');
 if(!p.channels.length)throw new Error('Tệp M3U không có kênh hợp lệ hoặc chỉ chứa URL tương đối');
 S.source='local-m3u';S.localM3uText=String(text||'');S.localM3uName=String(name||'playlist.m3u');S.list=p.channels.map(norm);S.query='';S.row=0;S.col=0;rebuildGroups();renderHome();S.loading=false;saveCache();if(message)toast(message);else toast('Đã mở '+S.localM3uName+' · '+S.list.length+' kênh')
}
function loadLocalM3UFile(file,onSuccess){
 var name=String(file&&file.name||'');
 if(name&&!/\.m3u8?$/i.test(name)){toast('Vui lòng chọn tệp .m3u hoặc .m3u8');return}
 if(file&&Number(file.size||0)>20*1024*1024){toast('Tệp M3U quá lớn (tối đa 20 MB)');return}
 toast('Đang đọc tệp M3U…');
 readLocalFileText(file).then(function(text){
  applyLocalM3U(text,name);
  if(typeof onSuccess==='function')onSuccess();
 }).catch(function(e){toast('Không đọc được M3U: '+String(e&&e.message||e))})
}
function showSources(){
 var local=S.source==='local-m3u'&&S.localM3uName?'<br>Tệp M3U đang mở: '+esc(S.localM3uName):'';
 var selected=S.tvPreset===2?2:1;
 S.dialog='sources';$('dlg').className='';
 $('box').innerHTML='<h2>Nguồn mặc định</h2>'+
  '<p class="guide"><b>Truyền hình · Mặc định 1</b><br><br>'+
  '<b>Truyền hình · Mặc định 2</b><br><br>'+
  '<b>Đang chọn:</b> Mặc định '+selected+'<br><b>Thể thao:</b> Nguồn thể thao hiện tại'+local+'</p>'+
  '<div class="dialogActions"><button class="db" id="tvDefault1" type="button">Dùng mặc định 1</button>'+
  '<button class="db" id="tvDefault2" type="button">Dùng mặc định 2</button>'+
  '<button class="db" id="sourceReload" type="button">Tải lại</button>'+
  '<button class="db" id="sourceClose" type="button">Đóng</button></div>';
 function selectTvPreset(preset){
  closeDialog();
  if(S.menuOpen)closeMenu();
  loadSource('tv',true,preset);
 }
 $('tvDefault1').onclick=function(){selectTvPreset(1)};
 $('tvDefault2').onclick=function(){selectTvPreset(2)};
 $('sourceReload').onclick=function(){closeDialog();if(S.menuOpen)closeMenu();if(S.source==='local-m3u'&&S.localM3uText){applyLocalM3U(S.localM3uText,S.localM3uName,'Đã tải lại tệp M3U');return}loadSource(S.source,true,S.tvPreset)};
 $('sourceClose').onclick=closeDialog
}
function filterFavorite(c){return S.fav.indexOf(c.id)>=0}

function loadCustom(url){
 S.source='custom';S.loading=true;toast('Đang tải nguồn…');
 var api='/api/source?u='+encodeURIComponent(url);
 fetch(api,{cache:'no-store'}).then(function(r){return r.json().catch(function(){return {error:'HTTP '+r.status}}).then(function(d){if(!r.ok)throw new Error(d&&d.error||'HTTP '+r.status);return d})}).then(function(d){
  if(!d||!Array.isArray(d.channels)||!d.channels.length)throw new Error(d&&d.error||'Playlist rỗng');
  S.list=d.channels.map(norm);S.query='';S.row=0;S.col=0;rebuildGroups();renderHome();S.loading=false;saveCache();toast('Đã tải '+S.list.length+' kênh')
 }).catch(function(e){S.loading=false;toast('Không tải được nguồn: '+e.message)})
}
function fetchJsonTimeout(url,ms){
 var timer;
 return Promise.race([
  fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}),
  new Promise(function(_,reject){timer=setTimeout(function(){reject(new Error('timeout '+ms+'ms'))},ms)})
 ]).then(function(v){clearTimeout(timer);return v},function(e){clearTimeout(timer);throw e})
}
function applyPlaylist(d,source,message){
 if(!d||!Array.isArray(d.channels)||!d.channels.length)throw new Error('playlist response không hợp lệ');
 if(source!==S.source)return false;
 S.list=d.channels.map(norm);S.row=0;S.col=0;rebuildGroups();renderHome();S.loading=false;saveCache();if(message)toast(message);return true
}
function loadSource(source,force,tvPreset){
 S.source=source;
 if(source==='tv')S.tvPreset=tvPreset===2?2:1;
 S.query='';S.loading=true;
 var requestPreset=source==='tv'?S.tvPreset:0;
 var cached=readCache();
 if(cached&&!force){S.list=cached.channels.map(norm);rebuildGroups();S.row=0;S.col=0;renderHome();toast('Đã mở cache · đang cập nhật…')}
 else $('homeRows').innerHTML='<div class="empty">Đang tải '+(source==='sport'?'thể thao':'truyền hình')+'…</div>';

 var playlistUrl=source==='tv'&&requestPreset===2?PLAYLISTS.tv2:PLAYLISTS[source];
 fetchJsonTimeout(playlistUrl,15000).then(function(d){
  if(source==='tv'&&S.tvPreset!==requestPreset)return;
  applyPlaylist(d,source,'Đã cập nhật '+d.channels.length+' kênh'+(source==='tv'?' · mặc định '+requestPreset:''));
 }).catch(function(e){
  if(source==='tv'&&S.tvPreset!==requestPreset)return;
  if(source==='tv'){
   S.loading=false;
   if(S.list.length)toast('API không phản hồi · giữ playlist hiện tại');
   else if(requestPreset===1)fallbackOriginal(cached,e);
   else{
    $('homeRows').innerHTML='<div class="empty">Không tải được Nguồn mặc định 2. Vui lòng thử lại.</div>';
    toast('Không tải được nguồn mặc định 2: '+(e&&e.message||String(e||'lỗi không xác định')));
   }
  }else{S.loading=false;toast('Không tải được playlist: '+e.message)}
 })
}
function fallbackOriginal(cached,firstError){
 var u='https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/';
 fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(function(t){
  var p=parseM3U(t,u);if(!p.channels.length||!isAndroid1069DefaultList(p.channels))throw new Error('nguồn mặc định không đúng');
  S.list=p.channels;S.row=0;S.col=0;rebuildGroups();renderHome();saveCache();toast('Đã mở nguồn mặc định Android 1.0.69 · '+S.list.length+' kênh')
 }).catch(function(e){
  if(cached&&cached.channels.length&&isAndroid1069DefaultList(cached.channels)){toast('Nguồn mới lỗi · giữ playlist 1.0.69')}
  else toast('Không tải được nguồn mặc định: '+(firstError&&firstError.message||e.message));
 });
}

function sanitizeAppleCandidates(c){
 if(!c||!Array.isArray(c.candidates))return c;
 var id=String(c.id||'').toLowerCase().replace(/[\\s_-]+/g,''),name=String(c.name||'').toLowerCase();
 if(id!=='vtvcab3hd'&&name.indexOf('vtvcab3')<0&&name.indexOf('on sports hd')<0)return c;
 var out=[];
 for(var i=0;i<c.candidates.length;i++){
  var u=String(c.candidates[i]&&c.candidates[i].url||'');
  if(/e3\.endpoint\.cdn\.sctvonline\.vn\/hls\/vtvcab3\/index\.m3u8/i.test(u))continue;
  if(/856175157\.r\.vtvcdn\.com\/ondrm\/THETHAO_HD\/m30_index\.m3u8/i.test(u))continue;
  out.push(c.candidates[i]);
 }
 return Object.assign({},c,{candidates:out});
}
function normalizeCandidate(cand){
 cand=cand||{};cand.headers=cand.headers||{};
 if(!cand.ref&&!cand.headers.Referer&&!cand.headers.referer)cand.ref='';
 if(!cand.ua&&!cand.headers['User-Agent'])cand.ua='';
 return cand
}
function isAppleTouchDevice(){
 var ua=navigator.userAgent||'';
 return /iPad|iPhone|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&Number(navigator.maxTouchPoints||0)>1)
}
function isDashDrmCandidate(cand){
 cand=normalizeCandidate(cand||{});
 var u=String(cand.url||''),t=String(cand.type||'').toLowerCase(),m=String(cand.mime||'').toLowerCase();
 return !!cand.drm&&(cand.dash||t==='dash'||m.indexOf('dash+xml')>=0||/\.mpd(?:$|\?)/i.test(u))
}
function variantBaseName(name){
 return String(name||'')
  .replace(/\s*\[(?:flv|hls(?:\s*\d+)?)\]\s*$/i,'')
  .replace(/\s*[-–]\s*(?:TRỰC TIẾP|FPT PLAY)\s*$/i,'')
  .trim()
}
function isVtvBackupGroup(group){
 return /vtv\s*dự\s*phòng/i.test(String(group||''));
}
function isSportsGroup(group){
 return /thể\s*thao|the\s*thao/i.test(String(group||''));
}
function appleFallbackKey(c){
 var id=String(c&&c.id||'').toLowerCase().replace(/[\s_.-]+/g,''),name=variantBaseName(c&&c.name||'').toLowerCase();
 if(id.indexOf('onsportsplus')===0||/on\s*sports\s*\+|sports\+/.test(name))return 'onsportsplus';
 if(id.indexOf('onsportsnews')===0||/on\s*sports\s*news/.test(name))return 'onsportsnews';
 if(id.indexOf('onfootball')===0||/on\s*football/.test(name))return 'onfootball';
 if(id.indexOf('ongolf')===0||/\bgolf(?:\s*channel)?\b/.test(name))return 'ongolf';
 if(id.indexOf('sctv15')===0||/\bsctv\s*15\b/.test(name))return 'sctv15';
 if(id.indexOf('sctv17')===0||/\bsctv\s*17\b/.test(name))return 'sctv17';
 if(id.indexOf('sctv22')===0||/\bsctv\s*22\b/.test(name))return 'sctv22';
 if(id.indexOf('vtv6')===0||/\bvtv\s*6\b/.test(name))return 'vtv6';
 if(id.indexOf('htvthethao')===0||/htv.*thể\s*thao|htv.*the\s*thao/.test(name))return 'htvthethao';
 if((id.indexOf('onsports')===0||/on\s*sports/.test(name))&&!/plus|\+|news/.test(id+' '+name))return 'onsports';
 return variantBaseName(c&&c.name||'').toLowerCase()
  .replace(/\b(?:hd|fhd|uhd|50fps|25fps|live|trực tiếp|fpt play)\b/g,'')
  .replace(/[^a-z0-9]+/g,'');
}
function addAppleHlsAlternatives(c){
 if(!isAppleTouchDevice()||!c)return c;
 var base=variantBaseName(c.name),group=String(c.group||''),isBackup=isVtvBackupGroup(group),family=appleFallbackKey(c),extra=[];
 for(var i=0;i<S.list.length;i++){
  var x=S.list[i],xGroup=String(x.group||'');
  if(x===c)continue;
  var sameName=variantBaseName(x.name)===base;
  var sportsPair=(isSportsGroup(group)||isSportsGroup(xGroup))&&family===appleFallbackKey(x);
  if(!sameName&&!sportsPair)continue;
  // Keep the VTV-backup exception narrowly paired with the primary VTV group.
  // For the sports group, only use explicit same-channel/alias keys (e.g. VTV6
  // or ON Sports), never merely similar names such as ON Sports vs ON Sports+.
  var counterpart=(isBackup&&xGroup==='VTV')||(group==='VTV'&&isVtvBackupGroup(xGroup))||sportsPair;
  if(xGroup!==group&&!counterpart)continue;
  var ca=x.candidates||[];
  for(var j=0;j<ca.length;j++){
   var cc=ca[j];
   if(classify(cc)!=='hls'||cc.drm)continue;
   if(!extra.some(function(z){return z.url===cc.url}))extra.push(cc)
  }
 }
 if(!extra.length)return c;
 var merged=(c.candidates||[]).slice();
 for(var q=0;q<extra.length;q++)if(!merged.some(function(z){return z.url===extra[q].url}))merged.push(extra[q]);
 var hls=[],rest=[];
 for(var z=0;z<merged.length;z++){
  if(classify(merged[z])==='hls'&&!merged[z].drm)hls.push(merged[z]);
  else rest.push(merged[z]);
 }
 return Object.assign({},c,{candidates:hls.concat(rest)})
}
function startupCandidateIndex(c){
 var a=c&&Array.isArray(c.candidates)?c.candidates:[];
 if(!a.length)return 0;
 if(isAppleTouchDevice()){
  // On iPad/Safari, prefer every plain HLS candidate before attempting DASH ClearKey,
  // including ON Sports variants; the old ON Sports special case incorrectly picked DASH first.
  for(var j=0;j<a.length;j++)if(classify(a[j])==='hls'&&!a[j].drm)return j;
  for(var q=0;q<a.length;q++){var qk=classify(a[q]);if(qk==='mp4'&&!a[q].drm)return q}
  for(var d=0;d<a.length;d++)if(isDashDrmCandidate(a[d]))return d;
 }
 if(isDashDrmCandidate(a[0])){
  for(var i=0;i<a.length;i++)if(classify(a[i])==='hls'&&!a[i].drm)return i;
 }
 return 0;
}

function shouldProxyFirst(cand,kind){
 cand=normalizeCandidate(cand||{});
 // Production diagnostics confirmed the SCTV4K upstream manifest is HTTP 200,
 // but its child TS segments return HTTP 400 directly and HTTP 200 via Worker.
 // Start this known source through the proxy instead of wasting a direct attempt.
 if(kind==='hls'&&(/sctv4k/i.test(String(cand.name||'')+' '+String(cand.id||''))||/vietanhtv\\.id\\.vn/i.test(String(cand.resolvedUrl||cand.url||''))))return true;
 if(isAppleTouchDevice()&&isDashDrmCandidate(cand))return false;
 if(kind==='flv'||kind==='mpegts')return true;
 // This provider serves a readable HLS manifest directly but rejects child TS segments with HTTP 400.
 if(/vietanhtv\.id\.vn/i.test(String(cand.resolvedUrl||cand.url||'')))return true;
 if(cand.forceProxy===true)return true;
 return false
}

function attemptUsesProxy(cand,kind){
 var pf=shouldProxyFirst(cand,kind);
 return pf ? S.attemptStep===0 : S.attemptStep===1
}
function makeProxy(u,cand){
 if(!isHttp(u))return u;
 cand=normalizeCandidate(cand||{});
 if(!S.proxyAttempt)return u;
 if(u.indexOf(location.origin+'/api/stream')===0)return u;
 // Cloudflare Worker egress is WAF-blocked for this Stalker host. Use the tested
 // branch-only Vercel proxy for this one stream type; leave every other source on Worker.
 var stalkerTsProxy=isStalkerTsCandidate(cand,'mpegts');
 var proxyOrigin=stalkerTsProxy
  ?'https://nm7-tv-web-git-fix-sports-hls-startup-proxy-20261010-phuongnm7.vercel.app'
  :'';
 var q=proxyOrigin+'/api/stream?u='+encodeURIComponent(u);
 if(cand.ref)q+='&r='+encodeURIComponent(cand.ref);
 if(cand.ua)q+='&ua='+encodeURIComponent(cand.ua);
 else if(stalkerTsProxy)q+='&ua='+encodeURIComponent('Mozilla/5.0 (Linux; Android 15; SM-G998B) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36');
 if(cand.headers&&Object.keys(cand.headers).length)q+='&h='+encodeURIComponent(JSON.stringify(cand.headers));
 return q
}
function makeLicenseProxy(u,cand){
 if(!isHttp(u))return u;
 cand=normalizeCandidate(cand||{});
 // Keep the original DRM license endpoint on the first attempt; fall back to our proxy on retry.
 if(!S.proxyAttempt)return u;
 var q='/api/license?u='+encodeURIComponent(u);
 if(cand.ref)q+='&r='+encodeURIComponent(cand.ref);
 if(cand.ua)q+='&ua='+encodeURIComponent(cand.ua);
 if(cand.headers&&Object.keys(cand.headers).length)q+='&h='+encodeURIComponent(JSON.stringify(cand.headers));
 return q
}
function classify(c){
 var u=String(c.url||''),m=String(c.mime||'').toLowerCase(),t=String(c.type||'').toLowerCase();
 if(c.dash||t==='dash'||m.indexOf('dash+xml')>=0||/\.mpd(?:$|\?)/i.test(u))return 'dash';
 if(c.hls||t==='hls'||m.indexOf('mpegurl')>=0||/\.m3u8?(?:$|\?)/i.test(u))return 'hls';
 if(c.flv||t==='flv'||m.indexOf('x-flv')>=0||/\.flv(?:$|\?)/i.test(u))return 'flv';
 if(c.mpegts||t==='mpegts'||m.indexOf('mp2t')>=0||/\.ts(?:$|\?)/i.test(u)||/[?&]extension=(?:ts|m2ts)(?:&|$)/i.test(u))return 'mpegts';
 if(/^rtsp/i.test(u))return 'rtsp';
 if(/^rtmp/i.test(u))return 'rtmp';
 if(/^udp:/i.test(u))return 'udp';
 if(/^srt:/i.test(u))return 'srt';
 if(/\.mp4(?:$|\?)/i.test(u))return 'mp4';
 return 'http'
}
function browserDrm(c){
 var d=c.drm||{},type=String(d.type||'').toLowerCase(),key=String(d.key||'').trim();
 if(!type||!key)return null;
 if(type.indexOf('clearkey')>=0){
  if(isHttp(key))return {system:'org.w3.clearkey',license:key,remote:true};
  var map=parseClearKey(key);return map&&Object.keys(map).length?{system:'org.w3.clearkey',clearKeys:map,remote:false}:{system:'org.w3.clearkey',error:'ClearKey KID/KEY không hợp lệ'}
 }
 if(type.indexOf('widevine')>=0)return {system:'com.widevine.alpha',license:key,remote:true};
 if(type.indexOf('playready')>=0)return {system:'com.microsoft.playready',license:key,remote:true};
 return {system:type,license:key,remote:true};
}
function parseClearKey(text){
 var map={},s=String(text||'').trim(),json=null;
 try{if(s.charAt(0)==='{')json=JSON.parse(s)}catch(e){}
 function put(k,v){k=toHex16(k);v=toHex16(v);if(k&&v)map[k]=v}
 if(json){
  if(Array.isArray(json.keys))for(var i=0;i<json.keys.length;i++){var x=json.keys[i];if(x)put(x.kid||x.keyId,x.k||x.key||x.value)}
  else if(json.keys&&typeof json.keys==='object')for(var k in json.keys)put(k,json.keys[k]);
  else if(json.kid&&(json.k||json.key))put(json.kid,json.k||json.key);
  else for(var k2 in json)if(typeof json[k2]==='string')put(k2,json[k2]);
 }
 if(!Object.keys(map).length){
  if(/kid\s*=/.test(s.toLowerCase())){
   var kk='',vv='';s.split(/[&;,|]/).forEach(function(f){var e=f.indexOf('=');if(e>0){var n=f.slice(0,e).trim().toLowerCase(),v=f.slice(e+1).trim();if(n==='kid')kk=v;if(n==='key'||n==='k')vv=v}});put(kk,vv)
  }else s.split(/[;,\s]+/).forEach(function(p){var z=p.split(':');if(z.length===2)put(z[0],z[1])})
 }
 return Object.keys(map).length?map:null
}
function toHex16(v){
 var s=String(v==null?'':v).trim().replace(/^["']|["']$/g,'').replace(/-/g,'').replace(/^0x/i,'');
 if(/^[0-9a-f]{32}$/i.test(s))return s.toLowerCase();
 try{var b64=s.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';var b=atob(b64),h='';for(var i=0;i<b.length;i++)h+=('0'+b.charCodeAt(i).toString(16)).slice(-2);if(h.length===32)return h.toLowerCase()}catch(e){}
 return ''
}

function restoreAudio(){
 var v=$('video');
 if(!v)return;
 v.defaultMuted=false;
 if(S.audioMutedByPolicy){S.audioMutedByPolicy=false;v.muted=false;v.volume=1;try{var p=v.play();if(p&&p.catch)p.catch(function(){})}catch(e){}}
}
function clearPlayers(){
 if(S.watchdog){clearTimeout(S.watchdog);S.watchdog=null}
 if(S.drmRecoveryTimer){clearTimeout(S.drmRecoveryTimer);S.drmRecoveryTimer=null}
 if(S.drmStallTimer){clearInterval(S.drmStallTimer);clearTimeout(S.drmStallTimer);S.drmStallTimer=null}
 S.drmStallAnchor=0;S.drmStallSince=0;
 if(S.hls){try{S.hls.destroy()}catch(e){}S.hls=null}
 if(S.dash){try{S.dash.reset()}catch(e){}S.dash=null}
 if(S.shaka){try{S.shaka.destroy()}catch(e){}S.shaka=null}
 if(S.flv){try{S.flv.destroy()}catch(e){}S.flv=null}
 if(S.mpegts){try{S.mpegts.destroy()}catch(e){}S.mpegts=null}
}
function setStatus(s,show){$('status').textContent=s||'';$('status').style.display=show===false?'none':'flex'}
function hideStatus(){$('status').style.display='none'}
function getCandidate(){return S.current&&S.current.candidates?normalizeCandidate(S.current.candidates[S.candidateIndex]):null}

function openPlayer(c){
 var sourceId=String(c&&c.id||'').toLowerCase().replace(/[\\s_-]+/g,'');
 var sourceName=String(c&&c.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 var singleDefaultVtv1=S.source==='tv'&&S.tvPreset===1&&(sourceId==='vtv1hd'||sourceId==='vtv1'||sourceName==='vtv1');
 c=sanitizeAppleCandidates(c);
 if(!singleDefaultVtv1)c=addAppleHlsAlternatives(c);
 c=sanitizeAppleCandidates(c);
 if(!c||!c.candidates||!c.candidates.length){toast('Kênh chưa có URL phát');return}
 S.current=c;S.candidateIndex=startupCandidateIndex(c);S.attemptStep=0;S.proxyAttempt=false;S.retryPending=false;S.player=true;S.drmRecoveryCount=0;S.drmHardRecoveryCount=0;S.drmStallAnchor=0;S.drmStallSince=0;S.audioMutedByPolicy=false;S.ctrl=false;S.quick=false;S.generation++;
 S.zone='player';$('player').className='';$('ctrl').className='hidden';$('quick').className='hidden';
 $('playerTitle').textContent=c.name;$('playerMeta').textContent=c.url||'';
 S.recent=[c.id].concat(S.recent.filter(function(x){return x!==c.id})).slice(0,80);saveUser();tryCandidate()
}
function closePlayer(){
 clearPlayers();var v=$('video');v.pause();v.removeAttribute('src');try{v.load()}catch(e){}
 $('player').className='hidden';$('ctrl').className='hidden';$('quick').className='hidden';
 S.player=false;S.current=null;S.ctrl=false;S.quick=false;S.retryPending=false;S.generation++;S.zone='home';renderHome();focusHome(true)
}
function scheduleCandidateRetry(){
 if(S.retryPending)return;
 S.retryPending=true;
 var gen=S.generation;
 setTimeout(function(){
  if(gen!==S.generation||!S.player)return;
  S.retryPending=false;
  tryCandidate();
 },120)
}
function isStalkerTsCandidate(cand,kind){
 if(kind!=='mpegts'||!cand)return false;
 try{
  var u=new URL(String(cand.resolvedUrl||cand.url||'')),q=u.searchParams;
  return u.pathname.toLowerCase().endsWith('/play/live.php')&&q.has('mac')&&q.has('stream')&&q.has('extension')&&(q.has('play_token')||q.has('token'));
 }catch(e){return false}
}
function nextCandidate(reason){
 if(!S.player||S.retryPending)return;
 if(S.watchdog){clearTimeout(S.watchdog);S.watchdog=null}
 var c=S.current;if(!c)return;
 var cand=getCandidate();
 if(isAppleTouchDevice()&&cand&&isDashDrmCandidate(cand)){
  if(hardRestartDrm(c,cand,S.generation,reason||'Apple DRM candidate failure'))return;
  for(var n=S.candidateIndex+1;n<(c.candidates||[]).length;n++){
   if(classify(c.candidates[n])==='hls'&&!c.candidates[n].drm){
    S.candidateIndex=n;S.attemptStep=0;S.proxyAttempt=false;
    toast('DRM lỗi · chuyển sang HLS nguồn '+(n+1));
    scheduleCandidateRetry();return;
   }
  }
  setStatus('Không thể ổn định DRM trên Safari\n'+c.name);dbg(String(reason||'Apple DRM failure'));return;
 }
 var kind=cand?classify(cand):'http';
 var proxyFirst=!!cand&&shouldProxyFirst(cand,kind);
 // Most proxy-first providers must not be retried directly. Stalker tokens can be tied
 // to the viewer network, however, so after a proxy 403 try this TS URL directly once.
 var allowStalkerDirectFallback=isStalkerTsCandidate(cand,kind);
 if(S.attemptStep<1&&(!(proxyFirst&&S.proxyAttempt)||allowStalkerDirectFallback)){
  S.attemptStep++;
  var nextViaProxy=attemptUsesProxy(cand,kind);
  toast((reason||'Nguồn lỗi')+' · thử '+(nextViaProxy?'proxy':'trực tiếp'));
  scheduleCandidateRetry();return;
 }
 S.attemptStep=0;S.proxyAttempt=false;S.candidateIndex++;
 if(S.candidateIndex<(c.candidates||[]).length){
  toast((reason||'Nguồn lỗi')+' · chuyển nguồn '+(S.candidateIndex+1));
  scheduleCandidateRetry();return;
 }
 if(isAppleTouchDevice()&&safariOfficialUrl(c)){
  showSafariOfficialFallback(c,S.generation);
  return;
 }
 setStatus('Không phát được '+c.name+'\nĐã thử '+(c.candidates?c.candidates.length:0)+' nguồn.\nLỗi cuối: '+String(reason||'Không rõ').slice(0,160));dbg(reason||'playback failed');
}

function tryCandidate(){
 S.retryPending=false;
 var c=S.current,cand=getCandidate(),v=$('video'),kind,generation=S.generation;
 if(!cand){setStatus('Kênh chưa có URL phát');return}
 clearPlayers();kind=classify(cand);
 S.proxyAttempt=attemptUsesProxy(cand,kind);
 dbg('Playback attempt: kind='+kind+' route='+(S.proxyAttempt?(isStalkerTsCandidate(cand,kind)?'vercel-preview-proxy':'worker-proxy'):'direct')+' source='+(S.candidateIndex+1)+'/'+(c.candidates?c.candidates.length:0));
 var sourceUrl=cand.resolvedUrl||cand.url,url=makeProxy(sourceUrl,cand);
 setStatus('Đang mở '+c.name+'\nNguồn '+(S.candidateIndex+1)+'/'+c.candidates.length+(S.proxyAttempt?' · proxy':' · trực tiếp'));
 v.style.display='block';v.autoplay=true;v.controls=false;v.muted=false;v.defaultMuted=false;v.volume=1;
 if(kind==='rtsp'||kind==='rtmp'||kind==='udp'||kind==='srt'){
  setStatus('Web Browser không phát trực tiếp '+kind.toUpperCase()+'.\nNguồn này cần máy chủ chuyển đổi sang HLS/DASH.');return
 }
 if(kind==='http'&&!cand.mime&&!cand.type){probeCandidate(c,cand,generation);return}
 startByType(c,cand,url,kind,generation);
}
function startByType(c,cand,url,kind,gen){
 if(kind==='dash')startDash(c,cand,url,gen);
 else if(kind==='hls')startHls(c,cand,url,gen);
 else if(kind==='flv')startFlv(c,cand,url,gen);
 else if(kind==='mpegts')startMpegTs(c,cand,url,gen);
 else startDirect(c,cand,url,gen);
 var isKnownSlow4k=kind==='hls'&&(/sctv4k/i.test(String((c&&c.name)||'')+' '+String((c&&c.id)||''))||/vietanhtv\.id\.vn/i.test(String(cand.resolvedUrl||cand.url||'')));
 var wait=kind==='hls'?(isKnownSlow4k?15000:8000):15000;
 if(isAppleTouchDevice()&&kind==='hls'&&c&&c.candidates&&c.candidates.length>1)wait=5000;
 if(isAppleTouchDevice()&&kind==='dash'&&cand&&cand.drm)wait=30000;
 // SCTV4K uses proxy-first and a bounded 15-second startup watchdog.
 S.watchdog=setTimeout(function(){
  if(S.generation!==gen||!S.player)return;
  S.watchdog=null;
  var status=$('status'),statusText=String(status&&status.textContent||'');
  var waitingForPlayback=!!(status&&status.style.display!=='none'&&statusText.trim());
  // Safari's explicit external-service fallback is intentional, not a stalled inline player.
  if(waitingForPlayback&&statusText.indexOf('Safari không phát được DASH/ClearKey nội tuyến.')===0)return;
  // readyState can be >= 2 even when no decoded frame ever starts. Use the visible
  // startup status as the primary signal, and retry direct -> proxy if still waiting.
  if(waitingForPlayback||$('video').readyState<2||$('video').paused)
   nextCandidate('Timeout phát '+Math.round(wait/1000)+'s · chưa xác nhận video chạy');
 },wait)
}
function probeCandidate(c,cand,gen){
 setStatus('Đang xác định định dạng '+c.name+'…');
 var u='/api/probe?u='+encodeURIComponent(cand.resolvedUrl||cand.url);
 if(cand.ref)u+='&r='+encodeURIComponent(cand.ref);
 if(cand.ua)u+='&ua='+encodeURIComponent(cand.ua);
 if(cand.headers&&Object.keys(cand.headers).length)u+='&h='+encodeURIComponent(JSON.stringify(cand.headers));
 fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(d){
  if(gen!==S.generation||!S.player)return;
  if(!d||!d.type||(d.type==='http'&&!d.resolvedUrl)){nextCandidate('Không xác định được định dạng');return}
  cand.type=d.type;
  cand.mime=d.contentType||cand.mime||'';
  cand.resolvedUrl=d.resolvedUrl||d.finalUrl||cand.url;
  if(d.type==='dash')cand.dash=true;
  if(d.type==='hls')cand.hls=true;
  if(d.type==='flv')cand.flv=true;
  if(d.type==='mpegts')cand.mpegts=true;
  var resolved=d.resolvedUrl||d.finalUrl||cand.url;
  cand.resolvedUrl=resolved;
  S.proxyAttempt=attemptUsesProxy(cand,d.type);var url=makeProxy(resolved,cand);
  clearPlayers();
  setStatus('Đang phát '+c.name+'\nNguồn '+(S.candidateIndex+1)+'/'+c.candidates.length+(S.proxyAttempt?' · proxy':''));
  startByType(c,cand,url,d.type,gen);
 }).catch(function(e){if(gen===S.generation&&S.player){dbg('Probe '+(e&&e.message||e));nextCandidate('Probe lỗi')}})
}
function markPlaying(gen){if(gen!==S.generation||!S.player)return;if(S.watchdog){clearTimeout(S.watchdog);S.watchdog=null}hideStatus()}
function startDirect(c,cand,url,gen){
 try{ $('video').muted=false;$('video').defaultMuted=false;$('video').volume=1;$('video').src=url; var p=$('video').play();if(p&&p.catch)p.catch(function(){}); $('video').onplaying=function(){markPlaying(gen)} }catch(e){nextCandidate('Direct playback lỗi')}
}
function startHls(c,cand,url,gen){
 var v=$('video'),ua=navigator.userAgent||'',safariLike=/Safari/i.test(ua)&&!/Chrome|Chromium|Android/i.test(ua),tizenLike=/SMART-TV|Tizen/i.test(ua);
 var native=!!(v.canPlayType&&(v.canPlayType('application/vnd.apple.mpegurl')||v.canPlayType('application/x-mpegURL')))&&(safariLike||tizenLike);
 if(native){
  v.muted=false;v.defaultMuted=false;v.volume=1;
  v.onplaying=function(){markPlaying(gen)};
  v.onerror=function(){
   if(gen!==S.generation)return;
   if(S.watchdog){clearTimeout(S.watchdog);S.watchdog=null}
   if(!S.proxyAttempt){
    S.attemptStep=1;
    S.proxyAttempt=true;
    var pu=makeProxy(cand.resolvedUrl||cand.url,cand);
    setStatus('HLS trực tiếp lỗi · chuyển proxy '+c.name);
    try{
     v.src=pu;var p=v.play();if(p&&p.catch)p.catch(function(){});
     S.watchdog=setTimeout(function(){
      if(gen!==S.generation||!S.player)return;
      S.watchdog=null;
      var status=$('status'),stillWaiting=!!(status&&status.style.display!=='none'&&String(status.textContent||'').trim());
      if(stillWaiting||$('video').readyState<2||$('video').paused)
       nextCandidate('HLS proxy timeout 5s · chưa xác nhận video chạy');
     },5000)
    }catch(e){nextCandidate('HLS proxy lỗi')}
    return
   }
   nextCandidate('HLS native lỗi')
  };
  v.src=url;
  var p=v.play();if(p&&p.catch)p.catch(function(){});
  return
 }
 tryHlsJs(c,cand,url,gen)
}
function tryHlsJs(c,cand,url,gen){
 if(!window.Hls||!Hls.isSupported()){nextCandidate('Trình duyệt không hỗ trợ HLS/MSE');return}
 try{
  var v=$('video'),networkRecoveries=0,mediaRecoveries=0,tizenLike=/SMART-TV|Tizen/i.test(navigator.userAgent||'');
  v.muted=false;v.defaultMuted=false;
  var h=new Hls({enableWorker:!tizenLike,startFragPrefetch:true,lowLatencyMode:false,maxBufferLength:30,maxMaxBufferLength:60,maxBufferHole:.5,startPosition:-1,manifestLoadingMaxRetry:4,fragLoadingMaxRetry:5,levelLoadingMaxRetry:5,backBufferLength:30,liveSyncDurationCount:3,liveMaxLatencyDurationCount:6});
  S.hls=h;
  h.on(Hls.Events.MEDIA_ATTACHED,function(){
   if(gen!==S.generation||!S.player||S.hls!==h)return;
   h.loadSource(url);
  });
  h.on(Hls.Events.MANIFEST_PARSED,function(){
   if(gen!==S.generation||!S.player||S.hls!==h)return;
   var p=v.play();
   if(p&&p.catch)p.catch(function(){
    try{v.muted=true;S.audioMutedByPolicy=true;var q=v.play();if(q&&q.catch)q.catch(function(){})}catch(e){}
   });
  });
  h.on(Hls.Events.ERROR,function(ev,data){
   // Destroyed direct attempts can emit late errors during a newer proxy attempt.
   if(gen!==S.generation||!S.player||S.hls!==h)return;
   if(S.debug)console.log('NM7 HLS',data&&data.type,data&&data.details,data&&data.response||'');
   var httpStatus=Number(data&&data.response&&(data.response.code||data.response.status)||data&&data.networkDetails&&data.networkDetails.status||0);
   // Do not wait for HLS.js retry backoff when an upstream explicitly rejects
   // the manifest/segment. Switch direct <-> proxy immediately on HTTP 4xx/5xx.
   if(httpStatus>=400&&httpStatus<=599){
    nextCandidate('HLS HTTP '+httpStatus+' · '+(S.proxyAttempt?'proxy lỗi':'nguồn trực tiếp lỗi'));
    return;
   }
   if(data&&!S.proxyAttempt&&data.type===Hls.ErrorTypes.NETWORK_ERROR){
    // A direct HLS fetch that fails at network/CORS level should not spend
    // several hls.js backoff rounds before using the same-origin proxy.
    nextCandidate('HLS trực tiếp lỗi · chuyển proxy');
    return;
   }
   if(data&&data.fatal){
    if(data.type===Hls.ErrorTypes.NETWORK_ERROR&&networkRecoveries<2){
      networkRecoveries++;
      try{h.startLoad();return}catch(e){}
    }
    if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&mediaRecoveries<2){
      mediaRecoveries++;
      try{h.recoverMediaError();return}catch(e){}
    }
    nextCandidate('HLS '+(data.details||data.type||'lỗi'))
   }
  });
  h.attachMedia(v);
 }catch(e){nextCandidate('HLS.js khởi tạo lỗi')}
}
function startFlv(c,cand,url,gen){
 var v=$('video');
 function startMpegTsFallback(){
  if(!window.mpegts||!mpegts.isSupported()){nextCandidate('FLV/MSE không được hỗ trợ');return}
  try{
   clearPlayers();
   v.muted=false;v.defaultMuted=false;v.volume=1;
   var p=mpegts.createPlayer({type:'flv',isLive:true,url:url},{enableWorker:false,enableStashBuffer:true,stashInitialSize:128*1024});
   S.mpegts=p;
   p.on(mpegts.Events.ERROR,function(t,d,i){if(gen===S.generation)nextCandidate('FLV/MPEG-TS '+(d||t||'lỗi'))});
   p.attachMediaElement(v);p.load();
   v.onplaying=function(){markPlaying(gen)};
   var x=v.play();if(x&&x.catch)x.catch(function(){});
  }catch(e){nextCandidate('FLV fallback khởi tạo lỗi')}
 }
 if(window.flvjs&&flvjs.isSupported()){
  try{
   v.muted=false;v.defaultMuted=false;v.volume=1;
   var p=flvjs.createPlayer({type:'flv',isLive:true,cors:true,url:url},{enableWorker:false,enableStashBuffer:true,stashInitialSize:128*1024});
   S.flv=p;
   p.on(flvjs.Events.ERROR,function(t,d){
    if(gen!==S.generation)return;
    try{p.destroy()}catch(e){} if(S.flv===p)S.flv=null;
    startMpegTsFallback()
   });
   p.attachMediaElement(v);p.load();
   v.onplaying=function(){markPlaying(gen)};
   var x=v.play();if(x&&x.catch)x.catch(function(){});
   return
  }catch(e){try{if(S.flv)S.flv.destroy()}catch(err){}S.flv=null}
 }
 startMpegTsFallback()
}
function diagnoseMpegTs(c,cand,gen){
 // Query the source status without ever printing the URL, MAC, credentials or play_token.
 var source=String((cand&&(cand.resolvedUrl||cand.url))||'');
 if(!isHttp(source))return;
 try{
  fetch('/api/probe?u='+encodeURIComponent(source),{cache:'no-store'}).then(function(r){return r.json().then(function(d){return {http:r.status,data:d}})}).then(function(x){
   if(gen!==S.generation)return;
   var d=x.data||{};
   dbg('MPEG-TS upstream diagnostic: probeHTTP='+x.http+' upstreamHTTP='+(d.status||0)+' type='+(d.type||'unknown')+' contentType='+(d.contentType||'unknown'));
  }).catch(function(){if(gen===S.generation)dbg('MPEG-TS upstream diagnostic: probe request failed (URL hidden)')});
 }catch(e){dbg('MPEG-TS upstream diagnostic: probe unavailable')}
}
function startMpegTs(c,cand,url,gen){
 if(!window.mpegts||!mpegts.isSupported()){nextCandidate('MPEG-TS/MSE không được hỗ trợ');return}
 try{
  var p=mpegts.createPlayer({type:'mpegts',isLive:true,url:url});
  S.mpegts=p;p.on(mpegts.Events.ERROR,function(t,d,i){if(gen===S.generation){dbg('MPEG-TS player error: '+String(d||t||'lỗi'));diagnoseMpegTs(c,cand,gen);nextCandidate('MPEG-TS '+(d||t||'lỗi'))}});
  p.attachMediaElement($('video'));p.load();var x=$('video').play();if(x&&x.catch)x.catch(function(){})
 }catch(e){nextCandidate('MPEG-TS khởi tạo lỗi')}
}
function getAppleDrmRuntime(){
 var ua=navigator.userAgent||'';
 var apple=isAppleTouchDevice();
 return {apple:apple,ios17plus:apple && !!window.ManagedMediaSource,webCrypto:typeof crypto!=='undefined'&&!!crypto.subtle,shaka:String(window.shaka&&shaka.version||'')};
}
function safariOfficialUrl(c){
 var id=String(c&&c.id||'').toLowerCase().replace(/[\s_-]+/g,'');
 var name=String(c&&c.name||'').toLowerCase();
 if(id.indexOf('sctv22')===0||name==='sctv22')return 'https://vtvgo.vn/channel/sctv22';
 if(id.indexOf('onsportsplus')===0||/on\s*sports\s*\+|sports\+/.test(name))return 'https://www.onplus.com.vn/channel?id=19bd2799-c693-4cff-9648-fa80e23e843a&type=1';
 if(id.indexOf('onsportsnews')===0||/on\s*sports\s*news/.test(name))return 'https://www.onplus.com.vn/channel?id=812a139b-1a74-498e-bc92-06a3117d3114&type=1';
 if(id.indexOf('onfootball')===0||/on\s*football/.test(name))return 'https://www.onplus.com.vn/channel?id=1a8ca8c8-1754-4c02-ae49-146374f3a567&type=1';
 if(id.indexOf('ongolf')===0||/\bgolf(?:\s*channel)?\b/.test(name))return 'https://www.onplus.com.vn/channel?id=b48802e4-1afc-429a-aac0-be53b1a0092c&type=1';
 if(id.indexOf('sctv15')===0||/sctv\s*15/.test(name))return 'https://www.onplus.com.vn/channel?id=342775b9-7c03-4332-a7c5-54a4e7bf23c3&type=1';
 if(id.indexOf('sctv17')===0||/sctv\s*17/.test(name))return 'https://www.onplus.com.vn/channel?id=a7f11eb9-aef0-4c33-b277-6cb5b83c038f';
 if(id.indexOf('onsports')===0||/on\s*sports/.test(name))return 'https://www.onplus.com.vn/channel?id=d61a9ace-2b7d-4474-9e6d-8f5c0c0d870d&type=1';
 if(id.indexOf('vtv6')===0||/vtv\s*6/.test(name))return 'https://www.vtvgo.vn/';
 if(id.indexOf('htvthethao')===0||/htv.*thể\s*thao|htv.*the\s*thao/.test(name))return 'https://www.htv.com.vn/truc-tuyen';
 return '';
}
function showSafariOfficialFallback(c,gen){
 var u=safariOfficialUrl(c);
 if(gen!==S.generation||!S.player)return;
 clearPlayers();
 var onplus=!!(u&&u.indexOf('onplus.com.vn')>=0),htv=!!(u&&u.indexOf('htv.com.vn')>=0),vtvgo=!!(u&&u.indexOf('vtvgo.vn')>=0);
 var message='Safari không phát được DASH/ClearKey nội tuyến.';
 if(u){
  var provider=onplus?'ON Plus':htv?'HTV trực tuyến':vtvgo?'VTVgo':'dịch vụ chính thức';
  message+='\nMở '+provider+' để xem; có thể cần đăng nhập hoặc gói thuê bao.';
 }
 setStatus(message);
 var b=$('officialBtn');
 if(b){
  b.className=u?'cb':'cb hidden';
  b.textContent=u?(onplus?'Mở kênh trên ON Plus':htv?'Mở HTV trực tuyến':vtvgo?'Mở SCTV22 trên VTVgo':'Mở dịch vụ chính thức'):'Mở trình phát chính thức';
  b.onclick=function(){try{window.open(u,'_blank','noopener,noreferrer')}catch(e){location.href=u}};
  setTimeout(function(){try{b.focus()}catch(e){}},30);
 }
 dbg('Safari ClearKey unsupported; official fallback='+(u||'none'));
}
function startDash(c,cand,url,gen){
 var drm=browserDrm(cand);
 if(isAppleTouchDevice()&&drm&&isDashDrmCandidate(cand)){
  showSafariOfficialFallback(c,gen);
  return;
 }
 if(S.debug&&isAppleTouchDevice())dbg('Apple DRM runtime '+JSON.stringify(getAppleDrmRuntime()));

 if(window.shaka&&shaka.Player){
  startShaka(c,cand,url,drm,gen);return
 }
 if(!drm||!drm.error){startDashJs(c,cand,url,gen);return}
 nextCandidate('Thiếu Shaka Player để phát DRM')
}
function transientDrmError(e){
 var E=window.shaka&&shaka.util&&shaka.util.Error,code=Number(e&&e.code||0);
 if(!E)return code===3016||code===3017||code===3018||code===3007||code===3015;
 return code===E.Code.MEDIA_SOURCE_OPERATION_FAILED||
   code===E.Code.MEDIA_SOURCE_OPERATION_THREW||
   code===E.Code.VIDEO_ERROR||
   code===E.Code.QUOTA_EXCEEDED_ERROR;
}
function retryDrmInPlace(c,cand,url,p,gen,reason){
 if(gen!==S.generation||!S.player||S.shaka!==p)return false;
 if(S.drmRecoveryTimer)return true;
 if(S.drmRecoveryCount>=3)return false;
 S.drmRecoveryCount++;
 var n=S.drmRecoveryCount;
 S.drmRecoveryTimer=setTimeout(function(){
  S.drmRecoveryTimer=null;
  if(gen!==S.generation||!S.player||S.shaka!==p)return;
  try{
   if(!p.retryStreaming){
    if(n>=3)hardRestartDrm(c,cand,gen,'retryStreaming unavailable');
    return;
   }
   Promise.resolve(p.retryStreaming(.15)).then(function(ok){
    if(gen!==S.generation||!S.player||S.shaka!==p)return;
    if(ok){
     setStatus('Đang tự khôi phục DRM · lần '+n+'/3\n'+c.name);
     var v=$('video');var x=v.play();if(x&&x.catch)x.catch(function(){});
    }else if(n>=3){
     hardRestartDrm(c,cand,gen,'retryStreaming=false');
    }
   }).catch(function(e){
    dbg('retryStreaming rejected '+String(e&&e.message||e));
    if(n>=3)hardRestartDrm(c,cand,gen,'retryStreaming rejected');
   });
  }catch(e){
   dbg('retryStreaming exception '+String(e&&e.message||e));
   if(n>=3)hardRestartDrm(c,cand,gen,'retryStreaming exception');
  }
 },250);
 dbg('DRM retry '+n+' '+String(reason||''));
 return true
}

function eCode(e){return e&&e.code?e.code:(e&&e.detail&&e.detail.code?e.detail.code:'')}
function hardRestartDrm(c,cand,gen,reason){
 if(gen!==S.generation||!S.player||!isDashDrmCandidate(cand))return false;
 if(S.drmHardRecoveryCount>=2){
  setStatus('Không thể ổn định DRM trực tiếp trên Safari\n'+c.name);
  dbg('DRM hard recovery exhausted '+String(reason||''));
  return false;
 }
 S.drmHardRecoveryCount++;
 var n=S.drmHardRecoveryCount;
 var sourceUrl=cand.resolvedUrl||cand.url;
 clearPlayers();
 S.proxyAttempt=false;
 setStatus('Đang khởi tạo lại DRM trực tiếp · lần '+n+'/2\n'+c.name);
 setTimeout(function(){
  if(gen!==S.generation||!S.player)return;
  startShaka(c,cand,sourceUrl,browserDrm(cand),gen);
 },180);
 return true
}
function startShaka(c,cand,url,drm,gen){
 try{
  if(shaka.polyfill&&shaka.polyfill.installAll)shaka.polyfill.installAll();
  var p=new shaka.Player($('video'));S.shaka=p;
  if(drm&&drm.error)throw new Error(drm.error);
  var apple=isAppleTouchDevice&&isAppleTouchDevice();
  var appleDrm=!!(apple&&drm&&isDashDrmCandidate(cand));
  var retry={
   maxAttempts:6,
   baseDelay:500,
   backoffFactor:1.6,
   fuzzFactor:0.15,
   timeout:15000,
   stallTimeout:5000,
   connectionTimeout:7000
  };
  var cfg={
   drm:{servers:{},retryParameters:retry},
   manifest:{
    retryParameters:retry,
    defaultPresentationDelay:appleDrm?8:undefined,
    dash:{
     autoCorrectDrift:true,
     ignoreSuggestedPresentationDelay:true
    }
   },
   streaming:{
    preferNativeHls:false,
    retryParameters:retry,
    bufferingGoal:appleDrm?18:undefined,
    rebufferingGoal:appleDrm?6:undefined,
    bufferBehind:appleDrm?25:undefined,
    segmentPrefetchLimit:appleDrm?2:undefined,
    startAtSegmentBoundary:appleDrm,
    updateIntervalSeconds:appleDrm?2:1,
    allowMediaSourceRecoveries:apple&&drm,
    minTimeBetweenRecoveries:12,
    returnToEndOfLiveWindowWhenOutside:true
   },
   abr:{
    enabled:appleDrm,
    defaultBandwidthEstimate:appleDrm?1500000:undefined,
    switchInterval:appleDrm?12:undefined,
    bandwidthUpgradeTarget:appleDrm?0.85:undefined,
    bandwidthDowngradeTarget:appleDrm?0.95:undefined,
    restrictions:appleDrm?{
      maxWidth:1280,
      maxHeight:720,
      maxFrameRate:60,
      maxPixels:921600
    }:undefined
   }
  };
  if(drm){
   if(drm.clearKeys)cfg.drm.clearKeys=drm.clearKeys;
   if(drm.remote&&drm.license){
    cfg.drm.servers[drm.system]=makeLicenseProxy(drm.license,cand);
   }
  }
  if(p.configure)p.configure(cfg);
  var net=shaka.net.NetworkingEngine;
  p.getNetworkingEngine().registerRequestFilter(function(type,request){
   if(gen!==S.generation)return;
   var uri=request.uris&&request.uris[0]||'';
   if(appleDrm&&S.debug){
    var tn='';
    try{
     tn=type===net.RequestType.MANIFEST?'MANIFEST':
        type===net.RequestType.SEGMENT?'SEGMENT':
        type===net.RequestType.LICENSE?'LICENSE':
        type===net.RequestType.INIT_SEGMENT?'INIT':'OTHER';
    }catch(_){}
    dbg('DRM request '+tn+' '+String(uri).slice(0,260)+(S.proxyAttempt?' [proxy]':' [direct]'));
   }
   if(type===net.RequestType.LICENSE){
    if(drm&&drm.remote&&drm.license){
     request.uris=[makeLicenseProxy(drm.license,cand)];
    }
    return
   }
   // Critical: direct Safari DRM means direct MPD + direct media segments.
   // Only proxy when the player has explicitly entered a proxy attempt.
   // This prevents Cloudflare's 403 from killing an otherwise working stream.
   if(/^https?:/i.test(uri)&&(!appleDrm||S.proxyAttempt)&&uri.indexOf(location.origin+'/api/stream')!==0){
    request.uris=[makeProxy(uri,cand)];
   }
  });
  p.getNetworkingEngine().registerResponseFilter(function(type,response){
   if(gen!==S.generation||!appleDrm||!S.debug)return;
   try{
    var status=Number(response&&response.status||0),uri=String(response&&response.uri||'');
    var tn=type===net.RequestType.MANIFEST?'MANIFEST':
      type===net.RequestType.SEGMENT?'SEGMENT':
      type===net.RequestType.LICENSE?'LICENSE':
      type===net.RequestType.INIT_SEGMENT?'INIT':'OTHER';
    if(status>=400||status===0){
     dbg('DRM response '+tn+' HTTP='+status+' '+uri.slice(0,320));
     // A direct CDN rejection is a transport problem, not an EME/MSE problem.
     // Switch to the same-origin proxy only after observing the rejection.
     if((status>=400||status===0)&&!S.proxyAttempt&&type!==net.RequestType.LICENSE){
      S.proxyAttempt=true;
      dbg('DRM direct response rejected -> enable proxy for subsequent requests');
      try{if(S.shaka===p&&p.retryStreaming)Promise.resolve(p.retryStreaming(.15)).catch(function(e){dbg('proxy retry rejected '+String(e&&e.message||e))})}catch(e){}
     }
    }
   }catch(e){dbg('DRM response filter '+String(e&&e.message||e))}
  });

  p.addEventListener('error',function(ev){
   if(gen!==S.generation||S.shaka!==p||!ev||!ev.detail)return;
   var e=ev.detail,code=e.code||'',cat=e.category||'';
   dbg('Shaka '+code+' cat='+cat+' data='+(e.data?JSON.stringify(e.data):'')+' '+(e.message||''));
   if(appleDrm){
    if(transientDrmError(e)){
     // Let Shaka's built-in MediaSource recovery handle transient iOS MSE errors.
     // A second retryStreaming() here can race the built-in recovery and destroy
     // a healthy live DRM session.
     dbg('Apple DRM transient media error '+code+' — defer to Shaka MSE recovery');
     return;
    }
    if(window.shaka&&shaka.util&&shaka.util.Error&&cat===shaka.util.Error.Category.NETWORK){
     dbg('Apple DRM network error — keep session alive');
     return;
    }
    if(window.shaka&&shaka.util&&shaka.util.Error&&cat===shaka.util.Error.Category.STREAMING){
     dbg('Apple DRM streaming error — keep session alive');
     return;
    }
    if(hardRestartDrm(c,cand,gen,'fatal DRM/manifest '+code))return;
    setStatus('DRM lỗi '+code+'\n'+c.name);
    return;
   }
   nextCandidate('DASH/DRM lỗi '+code);
  });

  p.load(url).then(function(){
   // Manifest readiness is not proof that a video frame is playing.
   var x=$('video').play();if(x&&x.catch)x.catch(function(){});
  }).catch(function(e){
   if(gen!==S.generation)return;
   dbg('Shaka load '+(e.code||'')+' cat='+(e.category||'')+' '+(e.message||''));
   if(appleDrm){
    if(transientDrmError(e)&&retryDrmInPlace(c,cand,url,p,gen,e))return;
    if(hardRestartDrm(c,cand,gen,'load failure '+(e.code||'')))return;
    setStatus('DRM không khởi tạo được '+(e.code||'')+'\n'+c.name);
    return;
   }
   nextCandidate('DASH/DRM lỗi '+(e.code||''));
  });

  var v=$('video');
  function armDrmStallWatch(reason){
   if(!appleDrm||gen!==S.generation||!S.player||S.shaka!==p)return;
   if(S.drmStallTimer)return;
   S.drmStallSince=Date.now();
   S.drmStallAnchor=isFinite(v.currentTime)?v.currentTime:0;
   S.drmStallTimer=setInterval(function(){
    if(gen!==S.generation||!S.player||S.shaka!==p){
     clearInterval(S.drmStallTimer);S.drmStallTimer=null;return;
    }
    if(v.paused||!isFinite(v.currentTime)){
     S.drmStallSince=Date.now();
     S.drmStallAnchor=isFinite(v.currentTime)?v.currentTime:S.drmStallAnchor;
     return;
    }
    if(Math.abs(v.currentTime-S.drmStallAnchor)>0.25){
     S.drmStallSince=Date.now();
     S.drmStallAnchor=v.currentTime;
     return;
    }
    var ahead=0;
    try{
     if(v.buffered&&v.buffered.length)ahead=Math.max(0,v.buffered.end(v.buffered.length-1)-v.currentTime);
    }catch(_){}
    // A stalled live timeline with no meaningful buffer for 10s is a real
    // playback failure. Do not restart while there is healthy buffered media.
    if(ahead>1.5){
     S.drmStallSince=Date.now();
     return;
    }
    if((Date.now()-S.drmStallSince)/1000>=10){
     clearInterval(S.drmStallTimer);S.drmStallTimer=null;
     dbg('DRM real stall reason='+reason+' t='+(isFinite(v.currentTime)?v.currentTime.toFixed(2):'NaN')+' ahead='+ahead.toFixed(2));
     hardRestartDrm(c,cand,gen,'real playback stall');
    }
   },1000);
  }
  // Do not restart the player on a transient 'waiting'/'stalled'
  // event. Shaka's live pipeline already handles rebuffering internally.
  // We only record the condition for diagnostics.
  v.addEventListener('waiting',function(){
   if(appleDrm&&gen===S.generation&&S.player&&S.shaka===p){
    dbg('DRM waiting t='+(isFinite(v.currentTime)?v.currentTime.toFixed(2):'NaN')+
        ' rs='+v.readyState+' buffered='+(v.buffered.length?v.buffered.end(v.buffered.length-1).toFixed(2):'0'));
    if(!S.drmStallTimer)armDrmStallWatch('waiting');
   }
  });
  v.addEventListener('stalled',function(){
   if(appleDrm&&gen===S.generation&&S.player&&S.shaka===p){
    dbg('DRM stalled t='+(isFinite(v.currentTime)?v.currentTime.toFixed(2):'NaN')+
        ' rs='+v.readyState+' net='+v.networkState);
    if(!S.drmStallTimer)armDrmStallWatch('stalled');
   }
  });
  v.addEventListener('playing',function(){
   if(appleDrm&&gen===S.generation&&S.player&&S.shaka===p){
    if(!S.drmStallTimer)armDrmStallWatch('playing');
   }
  });
  if(appleDrm)armDrmStallWatch('startup');

 }catch(e){
  if(isAppleTouchDevice()&&isDashDrmCandidate(cand)){
   hardRestartDrm(c,cand,gen,'Shaka init '+String(e&&e.message||e));
   return;
  }
  nextCandidate('Shaka khởi tạo lỗi');
 }
}

function startDashJs(c,cand,url,gen){
 if(!window.dashjs){nextCandidate('Thiếu DASH player');return}
 try{
  var p=dashjs.MediaPlayer().create();S.dash=p;
  p.extend('RequestModifier',function(){return{
   modifyRequestURL:function(u){return /^https?:/i.test(u)&&u.indexOf(location.origin+'/api/stream')!==0?makeProxy(u,cand):u},
   modifyRequestHeader:function(xhr){if(cand.ua)try{xhr.setRequestHeader('User-Agent',cand.ua)}catch(e){}if(cand.ref)try{xhr.setRequestHeader('Referer',cand.ref)}catch(e){}return xhr}
  }});
  p.on(dashjs.MediaPlayer.events.ERROR,function(e){if(gen===S.generation)nextCandidate('DASH '+((e||{}).error||{}).message||'lỗi')});
  p.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED,function(){var x=$('video').play();if(x&&x.catch)x.catch(function(){})});
  p.initialize($('video'),url,true)
 }catch(e){nextCandidate('dash.js khởi tạo lỗi')}
}

function playerFocus(){
 if(!S.player)return;
 if(S.quick){focusQuick();return}
 if(S.ctrl){focusControls();return}
 try{document.body.focus()}catch(e){}
}
function showControls(){
 S.ctrl=!S.ctrl;S.quick=false;$('quick').className='hidden';$('ctrl').className=S.ctrl?'':'hidden';
 if(S.ctrl)focusControls();else document.body.focus()
}
function focusControls(){
 var b=document.querySelectorAll('.cb');
 if(!b.length)return;
 S.ctrlIndex=Math.max(0,Math.min(b.length-1,S.ctrlIndex));
 for(var i=0;i<b.length;i++)b[i].tabIndex=i===S.ctrlIndex?0:-1;
 try{b[S.ctrlIndex].focus()}catch(e){}
}
function controlAction(action){
 var b=document.querySelectorAll('#ctrl .cb');
 var a=action||(b[S.ctrlIndex]?b[S.ctrlIndex].dataset.a:'');
 if(a==='back'){closePlayer();return}
 if(a==='back10'){seek(-10);return}
 if(a==='fwd30'){seek(30);return}
 if(a==='play'){restoreAudio();togglePlay();return}
 if(a==='next'){restoreAudio();switchRelative(1);return}
 if(a==='background'){
  if(window.NM7Background&&typeof window.NM7Background.enter==='function'){
   window.NM7Background.enter().then(function(){toast('Đã bật chạy nền / PiP')}).catch(function(){toast('Thiết bị/trình duyệt không hỗ trợ PiP · Media Session vẫn được giữ')});
  }else toast('Chưa có module chạy nền');
  return
 }
}
function bindPlayerControls(){
 var ctrl=$('ctrl');
 if(!ctrl||ctrl.dataset.actionsBound==='1')return;
 ctrl.dataset.actionsBound='1';
 ctrl.addEventListener('click',function(e){
  var button=e.target&&e.target.closest?e.target.closest('button[data-a]'):null;
  if(!button||!ctrl.contains(button))return;
  e.preventDefault();
  e.stopPropagation();
  var action=button.dataset.a;
  S.ctrlIndex=Array.prototype.indexOf.call(ctrl.querySelectorAll('.cb'),button);
  controlAction(action);
 },true);
}
function togglePlay(){
 if(isNativeVideo()){$('video').paused?$('video').play():$('video').pause();return}
 if(S.shaka){try{S.shaka.getMediaElement().paused?S.shaka.getMediaElement().play():S.shaka.getMediaElement().pause();return}catch(e){}}
 if(S.dash){try{var st=S.dash.isPaused();if(st)S.dash.play();else S.dash.pause();return}catch(e){}}
}
function isNativeVideo(){return !!$('video').src}
function seek(sec){
 var v=$('video');
 if(isFinite(v.duration)&&v.duration>0){v.currentTime=Math.max(0,Math.min(v.duration,v.currentTime+sec));return}
 if(S.shaka){try{var t=S.shaka.getMediaElement().currentTime;S.shaka.getMediaElement().currentTime=Math.max(0,t+sec);return}catch(e){}}
 toast('Luồng này không hỗ trợ tua')
}
function buildQuick(){
 var q=$('quickCards'),html='',a=S.list;
 for(var i=0;i<a.length;i++){
  var c=a[i];html+='<button class="quickCard" type="button" tabindex="'+(i===S.quickIndex?'0':'-1')+'" data-q="'+i+'">'+esc(c.name)+'</button>'
 }
 q.innerHTML=html;
 var bs=q.querySelectorAll('.quickCard');
 for(var j=0;j<bs.length;j++)bs[j].onclick=function(){var i=Number(this.dataset.q);S.quickIndex=i;hideQuick();openPlayer(S.list[i])};
 if(bs.length){S.quickIndex=Math.max(0,Math.min(bs.length-1,S.quickIndex));try{bs[S.quickIndex].focus()}catch(e){}}
}
function showQuick(){
 if(!S.player)return;S.ctrl=false;$('ctrl').className='hidden';S.quick=true;$('quick').className='';$('quickTitle').textContent='Chọn kênh';buildQuick()
}
function hideQuick(){S.quick=false;$('quick').className='hidden'}
function focusQuick(){
 var bs=document.querySelectorAll('.quickCard');if(!bs.length)return;
 S.quickIndex=Math.max(0,Math.min(bs.length-1,S.quickIndex));for(var i=0;i<bs.length;i++)bs[i].tabIndex=i===S.quickIndex?0:-1;
 try{bs[S.quickIndex].focus()}catch(e){}
}
function switchRelative(delta){
 if(!S.current)return;
 var idx=-1;for(var i=0;i<S.list.length;i++)if(S.list[i].id===S.current.id){idx=i;break}
 if(idx<0)idx=0;var next=S.list[(idx+delta+S.list.length)%S.list.length];if(next)openPlayer(next)
}


function isNativeTvMode(){try{return new URLSearchParams(location.search).get('native_tv')==='1'}catch(e){return false}}
function isTouchMode(){
 if(isNativeTvMode())return false;
 return !!((window.matchMedia&&window.matchMedia('(pointer: coarse)').matches) ||
  ('ontouchstart' in window) || (navigator.maxTouchPoints&&navigator.maxTouchPoints>0));
}
function isTvLikeDevice(){
 if(isNativeTvMode())return true;
 var ua=String(navigator.userAgent||'');
 if(/Android TV|Google TV|GoogleTV|SmartTV|Tizen|webOS|Web0S|BRAVIA|AFT/i.test(ua))return true;
 var android=/Android/i.test(ua),mobile=/Mobile|Mobi/i.test(ua);
 var wide=false;
 try{wide=Math.max(Number(screen.width||0),Number(screen.height||0))>=1200}catch(e){}
 return android&&!mobile&&wide;
}
function detectMobileDevice(){
 if(isNativeTvMode())return false;
 var ua=String(navigator.userAgent||'');
 var mobileUA=/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
 var touch=('ontouchstart' in window)||((navigator.maxTouchPoints||0)>0);
 var small=false;
 try{small=Math.max(Number(screen.width||0),Number(screen.height||0))<=1024}catch(e){}
 var coarse=false;
 try{coarse=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches)}catch(e){}
 return !!(mobileUA||(touch&&small&&(coarse||!ua)));
}
function applyDeviceMode(){
 var m=detectMobileDevice();
 S.mobileMode=m;
 if(document.body){
  if(m)document.body.classList.add('mobile-mode');
  else document.body.classList.remove('mobile-mode');
  if(isTvLikeDevice())document.body.classList.add('tv-spatial');
  else document.body.classList.remove('tv-spatial');
 }
 var b=$('mobileMenuBtn');
 if(b)b.tabIndex=m?0:-1;
 return m
}
function mobileModeChange(){
 var old=S.mobileMode;var now=applyDeviceMode();
 if(old!==now&&!S.dialog&&!S.player&&!S.menuOpen){renderHome();focusHome(false)}
}

function resetBackArm(){
 if(S.backTimer){clearTimeout(S.backTimer);S.backTimer=null}
 S.backArmed=false;
}
function armMobileBack(){
 if(!isTouchMode())return;
 if(S.backArmed){
  resetBackArm();
  showExitConfirm();
  return
 }
 S.backArmed=true;
 toast('Nhấn Back lần nữa để thoát');
 S.backTimer=setTimeout(function(){resetBackArm()},2200);
}
function showExitConfirm(){
 S.dialog='exit';
 $('dlg').className='';
 $('box').innerHTML='<h2>Thoát NM7 TV?</h2><p class="guide">Bạn có muốn thoát trang web không?</p><div class="dialogActions"><button class="db" id="exitNo">Ở lại</button><button class="db" id="exitYes">Thoát</button></div>';
 $('exitNo').onclick=function(){closeDialog()};
 $('exitYes').onclick=function(){
  S.exitAllow=true;
  resetBackArm();
  try{history.back()}catch(e){window.close()}
 };
 $('exitNo').focus();
}
function handleBackAction(){
 if(S.dialog){closeDialog();return true}
 if(S.menuOpen){closeMenu();return true}
 if(S.player){closePlayer();return true}
 if(isTouchMode()){armMobileBack();return true}
 return false
}
function mobileHistoryGuard(){
 if(!isTouchMode()||S.historyGuard)return;
 try{history.pushState({nm7TouchGuard:true},'',location.href);S.historyGuard=true}catch(e){return}
 window.addEventListener('popstate',function(){
  if(S.exitAllow)return;
  handleBackAction();
  try{history.forward()}catch(e){}
 },false);
}
function bindTouchNavigation(){
 if(!isTouchMode())return;
 var player=$('player');
 if(!player||player.dataset.touchBound==='1')return;
 player.dataset.touchBound='1';
 var T={active:false,startX:0,startY:0,lastX:0,lastY:0,moved:false,target:null};
 player.addEventListener('touchstart',function(e){
  if(!e.touches||!e.touches.length)return;
  restoreAudio();
  var p=e.touches[0];
  T.active=true;T.startX=T.lastX=p.clientX;T.startY=T.lastY=p.clientY;T.moved=false;T.target=e.target;
 },{passive:true});
 player.addEventListener('touchmove',function(e){
  if(!T.active||!e.touches||!e.touches.length)return;
  var p=e.touches[0];
  T.lastX=p.clientX;T.lastY=p.clientY;
  if(Math.abs(T.lastX-T.startX)+Math.abs(T.lastY-T.startY)>16)T.moved=true;
 },{passive:true});
 player.addEventListener('touchend',function(){
  if(!T.active)return;
  var dx=T.lastX-T.startX,dy=T.lastY-T.startY,ax=Math.abs(dx),ay=Math.abs(dy);
  var swipe=Math.max(ax,ay)>=55;
  T.active=false;
  if(!swipe){
   if(T.target&&(T.target.id==='video'||(T.target.closest&&T.target.closest('#video'))))showControls();
   return
  }
  if(S.dialog||S.menuOpen)return;
  if(ax>ay){
   if(dx<0)seek(30);else seek(-10);
  }else{
   if(dy<0)switchRelative(1);else switchRelative(-1);
  }
 },{passive:true});
}

function tvPointerLockElement(){
 return document.pointerLockElement||document.webkitPointerLockElement||null;
}
function tvPointerLockSupported(){
 return !!(document.body&&(document.body.requestPointerLock||document.body.webkitRequestPointerLock));
}
var TVPOINTER={lastX:null,lastY:null,lastNavAt:0,accX:0,accY:0,lastDir:'',edge:null,edgeSince:0,edgeTicks:0,edgeTimer:null};
var TVGAME={last:{},raf:0};

function tvPointerNearEdge(x,y){
 var w=window.innerWidth||document.documentElement.clientWidth||0;
 var h=window.innerHeight||document.documentElement.clientHeight||0;
 var m=Math.max(18,Math.min(42,Math.round(Math.min(w,h)*0.035)));
 if(x<=m)return 'left';
 if(x>=w-m)return 'right';
 if(y<=m)return 'up';
 if(y>=h-m)return 'down';
 return '';
}
function tvNavigate(dir){
 if(!dir)return false;
 if(S.dialog)return false;
 if(S.menuOpen){tvPointerMoveMenu(dir);return true}
 if(S.player){tvPointerMovePlayer(dir);return true}
 if(S.zone==='home')return !!moveHomeSpatial(dir);
 return false;
}
function tvStartEdgeBridge(dir){
 if(!dir)return;
 var now=Date.now();
 if(TVPOINTER.edge===dir && now-TVPOINTER.edgeSince<1400)return;
 TVPOINTER.edge=dir;
 TVPOINTER.edgeSince=now;
 TVPOINTER.edgeTicks=0;
 if(TVPOINTER.edgeTimer)clearInterval(TVPOINTER.edgeTimer);
 TVPOINTER.edgeTimer=setInterval(function(){
  var age=Date.now()-TVPOINTER.edgeSince;
  if(TVPOINTER.edge!==dir||age>1450||TVPOINTER.edgeTicks>=5){
   clearInterval(TVPOINTER.edgeTimer);TVPOINTER.edgeTimer=null;TVPOINTER.edge=null;return;
  }
  if(Date.now()-TVPOINTER.lastNavAt<150)return;
  TVPOINTER.edgeTicks++;
  TVPOINTER.lastNavAt=Date.now();
  tvNavigate(dir);
 },190);
}
function tvPointerDir(dx,dy){
 var ax=Math.abs(dx),ay=Math.abs(dy);
 if(Math.max(ax,ay)<2)return '';
 return ax>=ay?(dx<0?'left':'right'):(dy<0?'up':'down');
}
function tvPointerMoveMenu(dir){
 var bs=document.querySelectorAll('.menuBtn');
 if(!bs.length)return;
 if(dir==='up'||dir==='down'){
  S.menu=Math.max(0,Math.min(bs.length-1,S.menu+(dir==='up'?-1:1)));
  renderMenu();
 }else if(dir==='left'){
  closeMenu();
 }
}
function tvPointerMovePlayer(dir){
 if(!S.player)return;
 if(S.quick){
  var qb=document.querySelectorAll('.quickCard');
  if(dir==='left')S.quickIndex=Math.max(0,S.quickIndex-1);
  else if(dir==='right')S.quickIndex=Math.min(qb.length-1,S.quickIndex+1);
  else if(dir==='up')S.quickIndex=Math.max(0,S.quickIndex-1);
  else if(dir==='down')S.quickIndex=Math.min(qb.length-1,S.quickIndex+1);
  focusQuick();return
 }
 if(S.ctrl){
  if(dir==='left'){seek(-10);return}
  if(dir==='right'){restoreAudio();seek(30);return}
  if(dir==='up'){restoreAudio();switchRelative(1);return}
  if(dir==='down'){restoreAudio();switchRelative(-1);return}
  return
 }
 if(dir==='left'){restoreAudio();showQuick();return}
 if(dir==='right'){restoreAudio();seek(30);return}
 if(dir==='up'){restoreAudio();switchRelative(1);return}
 if(dir==='down'){restoreAudio();switchRelative(-1);return}
}
function onTvPointerMove(e){
 if(!isTvLikeDevice())return;
 if(e&&e.__nm7PointerHandled)return;
 try{if(e)Object.defineProperty(e,'__nm7PointerHandled',{value:true,configurable:true})}catch(_){}

 var dx=Number(e.movementX||e.webkitMovementX||0),dy=Number(e.movementY||e.webkitMovementY||0);
 var x=isFinite(e.clientX)?Number(e.clientX):NaN,y=isFinite(e.clientY)?Number(e.clientY):NaN;
 if(!dx&&!dy&&TVPOINTER.lastX!=null&&isFinite(x)&&isFinite(y)){
  dx=x-TVPOINTER.lastX;dy=y-TVPOINTER.lastY;
 }
 if(isFinite(x))TVPOINTER.lastX=x;
 if(isFinite(y))TVPOINTER.lastY=y;

 var dir=tvPointerDir(dx,dy);
 var edge=tvPointerNearEdge(x,y);
 if(!dir && edge && TVPOINTER.lastDir){
  dir=TVPOINTER.lastDir;
 }
 if(!dir)return;
 TVPOINTER.lastDir=dir;
 if(edge===dir)TVPOINTER.edge=dir;

 TVPOINTER.accX+=dx;TVPOINTER.accY+=dy;
 var now=Date.now();
 if(now-TVPOINTER.lastNavAt<105)return;
 var threshold=6;
 if(!dx&&!dy || Math.max(Math.abs(TVPOINTER.accX),Math.abs(TVPOINTER.accY))>=threshold){
  TVPOINTER.accX=0;TVPOINTER.accY=0;TVPOINTER.lastNavAt=now;
  tvNavigate(dir);
 }
 if(edge===dir)tvStartEdgeBridge(dir);
}
function bindTvPointerNavigation(){
 if(!isTvLikeDevice())return;
 document.addEventListener('pointermove',onTvPointerMove,true);
 document.addEventListener('mousemove',onTvPointerMove,true);
 document.addEventListener('click',function(e){
  if(!isTvLikeDevice()||S.dialog)return;
  var card=e.target&&e.target.closest?e.target.closest('#homeRows .card'):null;
  if(card){
   S.row=Number(card.dataset.row||0);S.col=Number(card.dataset.col||0);S.zone='home';S.menuOpen=false;
  }
 },true);
 if(typeof window.Gamepad!=='undefined'||navigator.getGamepads){
  window.addEventListener('gamepadconnected',function(){tvPollGamepad()},true);
  window.addEventListener('gamepaddisconnected',function(){},true);
  tvPollGamepad();
 }
}
function tvPollGamepad(){
 if(!navigator.getGamepads)return;
 var pads=navigator.getGamepads(),active=false;
 for(var i=0;i<pads.length;i++){
  var p=pads[i];if(!p)continue;
  active=true;
  var b=p.buttons||[];
  var map={12:'up',13:'down',14:'left',15:'right'};
  for(var k in map){
   var idx=Number(k),pressed=!!(b[idx]&&b[idx].pressed);
   var key=p.index+':b'+idx;
   if(pressed&&!TVGAME.last[key]){
    TVGAME.last[key]=true;tvNavigate(map[k]);
   }else if(!pressed)TVGAME.last[key]=false;
  }
  var ax=p.axes||[];
  if(ax.length>=2){
   var adir=Math.abs(ax[0])>Math.abs(ax[1])?(ax[0]<-.55?'left':ax[0]>.55?'right':''):(ax[1]<-.55?'up':ax[1]>.55?'down':'');
   var akey=p.index+':axis';
   if(adir&&TVGAME.last[akey]!==adir){TVGAME.last[akey]=adir;tvNavigate(adir)}
   if(!adir)TVGAME.last[akey]='';
  }
 }
 TVGAME.raf=requestAnimationFrame(tvPollGamepad);
}
function onKey(e){
 if(!e)return;
 // Samsung TV Browser can deliver remote events to Window rather than the focused button.
 // Mark the event once so the Window + Document capture listeners never execute twice.
 if(e.__nm7Handled)return;
 var rk=remoteCode(e);
 if(!(rk===37||rk===38||rk===39||rk===40||rk===13||rk===10009||rk===27||rk===461||rk===8))return;
 try{Object.defineProperty(e,'__nm7Handled',{value:true,configurable:true})}catch(_){e.__nm7Handled=true}
 if(S.player && (e.keyCode||e.which||0)===13) restoreAudio();
 var k=remoteCode(e);
 if(S.dialog){
  if(k===10009||k===27){e.preventDefault();e.stopPropagation();closeDialog();return}
  if(S.dialog==='add'){
   e.preventDefault();e.stopPropagation();
   var af=[$('srcInput'),$('srcFileBtn'),$('srcOk'),$('srcCancel')].filter(function(x){return !!x});
   var ai=af.indexOf(document.activeElement);if(ai<0)ai=0;
   if(k===37||k===38){ai=(ai-1+af.length)%af.length;af[ai].focus();return}
   if(k===39||k===40){ai=(ai+1)%af.length;af[ai].focus();return}
   if(k===13){af[ai].click();return}
   return
  }
  if(k===13 && S.dialog==='search'){e.preventDefault();e.stopPropagation();closeDialog();return}
  return
 }
 if(e.repeat && (k===13||k===10009||k===27))return;
 if(k===10009||k===27){
  e.preventDefault();e.stopPropagation();
  if(S.player){
   if(S.quick){hideQuick();playerFocus();return}
   if(S.ctrl){S.ctrl=false;$('ctrl').className='hidden';playerFocus();return}
   closePlayer();return
  }
  if(S.menuOpen){closeMenu();return}
  if(isTouchMode()){armMobileBack();return}
  openMenu();return
 }
 if(S.menuOpen){
  e.preventDefault();e.stopPropagation();
  if(k===38||k===40){
   var bs=document.querySelectorAll('.menuBtn');S.menu=Math.max(0,Math.min(bs.length-1,S.menu+(k===38?-1:1)));renderMenu();return
  }
  if(k===39||k===13){selectMenu();return}
  return
 }
 if(S.player){
  e.preventDefault();e.stopPropagation();
  if(S.quick){
   var qb=document.querySelectorAll('.quickCard');
   if(k===37)S.quickIndex=Math.max(0,S.quickIndex-1);
   else if(k===39)S.quickIndex=Math.min(qb.length-1,S.quickIndex+1);
   else if(k===38){hideQuick();playerFocus();return}
   else if(k===40)S.quickIndex=Math.min(qb.length-1,S.quickIndex+1);
   else if(k===13&&qb[S.quickIndex]){var ci=S.quickIndex;hideQuick();openPlayer(S.list[ci]);return}
   focusQuick();return
  }
  if(S.ctrl){
   if(k===37){seek(-10);return}
   if(k===39){restoreAudio();seek(30);return}
   if(k===38){restoreAudio();switchRelative(1);return}
   if(k===40){restoreAudio();switchRelative(-1);return}
   if(k===13){restoreAudio();togglePlay();return}
   return
  }
  if(k===13){showControls();return}
  if(k===37){restoreAudio();showQuick();return}
  if(k===39){seek(30);return}
  if(k===38){switchRelative(1);return}
  if(k===40){switchRelative(-1);return}
  if(k===412){seek(-10);return}
  if(k===417){seek(30);return}
  if(k===10252){showControls();return}
  if(k===427){switchRelative(1);return}
  if(k===428){switchRelative(-1);return}
  return
 }
 if(k===37){e.preventDefault();e.stopPropagation();if(S.zone==='home'){moveHomeSpatial('left');}return}
 if(k===39){e.preventDefault();e.stopPropagation();if(S.zone==='home'){moveHomeSpatial('right');}return}
 if(k===38){e.preventDefault();e.stopPropagation();if(S.zone==='home'){moveHomeSpatial('up');}return}
 if(k===40){e.preventDefault();e.stopPropagation();if(S.zone==='home'){moveHomeSpatial('down');}return}
 if(k===13){e.preventDefault();e.stopPropagation();if(S.zone==='home'){var c=channelsInGroup(S.groups[S.row]||'')[S.col];if(c)openPlayer(c)}return}
 if(k===8||k===403){e.preventDefault();e.stopPropagation();if(S.zone==='home'){var c2=channelsInGroup(S.groups[S.row]||'')[S.col];if(c2){var ix=S.fav.indexOf(c2.id);if(ix<0){S.fav.push(c2.id);toast('Đã thêm yêu thích')}else{S.fav.splice(ix,1);toast('Đã bỏ yêu thích')}saveUser();renderHome()}}return}
}
function remoteCode(e){
 var k=Number(e.keyCode||e.which||0),key=String(e.key||'').toLowerCase(),code=String(e.code||'').toLowerCase();
 if(key==='arrowleft'||key==='left'||code==='arrowleft'||key==='dpad_left')return 37;
 if(key==='arrowup'||key==='up'||code==='arrowup'||key==='dpad_up')return 38;
 if(key==='arrowright'||key==='right'||code==='arrowright'||key==='dpad_right')return 39;
 if(key==='arrowdown'||key==='down'||code==='arrowdown'||key==='dpad_down')return 40;
 if(key==='enter'||key==='select'||key==='ok'||key==='return'||key==='dpad_center')return 13;
 if(key==='escape'||key==='esc')return 27;
 if(key==='back'||key==='backspace'||key==='browserback'||key==='browserbackspace')return 10009;
 // Android/Google TV WebView and some TV browsers may expose Android KeyEvent constants.
 if(k===21)return 37;
 if(k===19)return 38;
 if(k===22)return 39;
 if(k===20)return 40;
 if(k===23||k===66)return 13;
 if(k===4)return 10009;
 // Samsung/Tizen models expose RETURN/BACK as 461 or 10009 depending on browser generation.
 if(k===461||k===10009)return 10009;
 if(k===8)return 10009;
 return k
}

$('video').addEventListener('playing',function(){markPlaying(S.generation)});
$('video').addEventListener('canplay',function(){var v=$('video');if(S.player&&!v.paused&&v.currentTime>0.1)markPlaying(S.generation)});
$('video').addEventListener('error',function(){
 if(!S.player)return;
 var cand=getCandidate(),v=$('video'),ve=v.error;
 if(cand&&isAppleTouchDevice()&&isDashDrmCandidate(cand)){
  dbg('Video error code='+(ve&&ve.code||0)+' msg='+(ve&&ve.message||'')+
      ' t='+(isFinite(v.currentTime)?v.currentTime.toFixed(2):'NaN')+
      ' rs='+v.readyState+' net='+v.networkState);
  if(S.drmStallTimer){clearInterval(S.drmStallTimer);clearTimeout(S.drmStallTimer);S.drmStallTimer=null}
  var src=cand.resolvedUrl||cand.url;
  // Do not immediately retry/restart Apple DRM from the media element error.
  // Shaka's MSE recovery gets first chance; the verified-stall watchdog is the
  // only path allowed to perform a hard restart.
  return;
 }
 // hls.js reports HTTP/network/codec failures with more precise details.
 if(S.hls)return;
 if(!S.proxyAttempt)nextCandidate('Video error code='+(ve&&ve.code||0));
});
$('video').addEventListener('ended',function(){if(S.player)nextCandidate('Luồng kết thúc')});

function swallowRemoteDefaults(e){
 var k=remoteCode(e);
 if(k===37||k===38||k===39||k===40||k===13||k===10009||k===27||k===461){
  // The Samsung browser may otherwise scroll the page or move native focus
  // after our application-level navigation has handled the remote key.
  e.preventDefault();
 }
}
function restoreRemoteFocus(){
 if(S.dialog||S.menuOpen)return;
 setTimeout(function(){
  if(S.player)playerFocus();
  else{
   focusHome(false);
   var sc=homeRowsScroll();
   var row=document.querySelector('.row[data-row="'+S.row+'"]');
   if(sc&&row)scrollHomeRowsToSection(row);
  }
 },20);
}
function startup(){
 restoreUser();
 applyDeviceMode();
 bindTouchNavigation();
 bindPlayerControls();
 mobileHistoryGuard();
 // Capture at Window first: Samsung TV Browser may not bubble remote events
 // through the focused button/document in the same way as desktop Chrome.
 window.addEventListener('keydown',onKey,true);
 window.addEventListener('keyup',swallowRemoteDefaults,true);
 document.addEventListener('keydown',onKey,true);
 document.addEventListener('keyup',swallowRemoteDefaults,true);
 window.addEventListener('resize',mobileModeChange);
 window.addEventListener('orientationchange',mobileModeChange);
 $('mobileMenuBtn').addEventListener('click',function(){openMenu()});
 $('btnYouTubeTab').addEventListener('click',function(){openYouTube();});
 $('appShortcut').addEventListener('click',function(){toast('Chọn ứng dụng');});
 window.addEventListener('focus',restoreRemoteFocus,true);
 window.addEventListener('pageshow',restoreRemoteFocus,true);
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')restoreRemoteFocus()},true);
 bindTvPointerNavigation();
 var cached=readCache();if(cached){S.list=cached.channels.map(norm);rebuildGroups();S.row=0;S.col=0;renderHome()}
 loadSource('tv',false,S.tvPreset);
}
startup();
})();