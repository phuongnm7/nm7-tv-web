(function(){
'use strict';
(function(){
  var state={open:false,items:[],index:0,query:'',current:null,related:[],loading:false};
  var $=function(s,r){return (r||document).querySelector(s)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var css=`
#ytPanel{position:fixed;inset:0;z-index:240;background:#0f0f0f;color:#fff;font-family:Arial,Helvetica,sans-serif;display:none;overflow:hidden}
#ytPanel.open{display:flex;flex-direction:column}
#ytTop{height:64px;display:flex;align-items:center;gap:14px;padding:0 22px;background:#0f0f0f;border-bottom:1px solid #242424;flex:none}
#ytLogo{display:flex;align-items:center;gap:8px;min-width:128px;font-weight:700;font-size:21px;letter-spacing:-.4px}
#ytLogoMark{width:34px;height:24px;border-radius:7px;background:#f00;display:inline-flex;align-items:center;justify-content:center;font-size:13px;color:#fff}
#ytSearch{height:42px;flex:1;max-width:760px;margin:0 auto;display:flex}
#ytSearchInput{flex:1;min-width:0;background:#121212;border:1px solid #3f3f3f;border-right:0;border-radius:22px 0 0 22px;color:#fff;padding:0 18px;font-size:17px;outline:none}
#ytSearchInput:focus{border-color:#6aa9ff}
#ytSearchBtn{width:64px;border:1px solid #3f3f3f;background:#222;border-radius:0 22px 22px 0;color:#fff;font-size:20px;outline:none}
#ytSearchBtn:focus,#ytBack:focus,#ytTopHome:focus{outline:2px solid #4aa3ff;outline-offset:1px}
#ytBack,#ytTopHome{border:0;background:transparent;color:#fff;width:42px;height:42px;border-radius:50%;font-size:23px;outline:none}
#ytBody{display:flex;flex:1;min-height:0}
#ytSide{width:84px;flex:none;padding:12px 8px;border-right:1px solid #202020;background:#0f0f0f;display:flex;flex-direction:column;gap:5px}
.ytSideBtn{border:0;background:transparent;color:#eee;height:58px;border-radius:10px;font-size:12px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;outline:none}
.ytSideBtn span:first-child{font-size:21px}
.ytSideBtn:focus,.ytSideBtn.active{background:#272727}
#ytContent{flex:1;min-width:0;overflow:auto;padding:16px 24px 40px}
#ytChips{display:flex;gap:9px;overflow:auto;padding:0 0 16px;scrollbar-width:none}
#ytChips::-webkit-scrollbar{display:none}
.ytChip{border:0;background:#272727;color:#fff;border-radius:9px;padding:9px 16px;font-size:14px;white-space:nowrap;outline:none}
.ytChip:focus,.ytChip.active{background:#fff;color:#000}
#ytGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:28px 18px}
.ytCard{border:0;background:transparent;color:#fff;padding:0;text-align:left;outline:none;min-width:0}
.ytThumb{position:relative;width:100%;aspect-ratio:16/9;background:#202020;border-radius:10px;overflow:hidden}
.ytThumb img{width:100%;height:100%;object-fit:cover;display:block}
.ytDur{position:absolute;right:7px;bottom:7px;background:#000d;padding:2px 5px;border-radius:3px;font-size:12px}
.ytCardInfo{padding-top:9px}
.ytTitle{font-size:15px;line-height:20px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ytChannel{margin-top:5px;color:#aaa;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ytStats{margin-top:3px;color:#777;font-size:12px;white-space:nowrap}
.ytCard:focus .ytThumb{box-shadow:0 0 0 3px #4aa3ff}
#ytMessage{padding:60px 10px;text-align:center;color:#aaa;font-size:18px}
#ytPlayer{position:absolute;inset:64px 0 0;background:#0f0f0f;display:none;overflow:auto;padding:22px 26px 40px}
#ytPlayer.open{display:block}
#ytWatch{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:22px;max-width:1500px;margin:0 auto}
#ytVideoWrap{background:#000;border-radius:10px;overflow:hidden;position:relative}
#ytVideo{width:100%;aspect-ratio:16/9;display:block;background:#000}
#ytWatchMain h1{font-size:21px;line-height:28px;margin:15px 0 7px}
#ytWatchMeta{color:#aaa;font-size:13px}
#ytWatchDesc{margin-top:13px;background:#1b1b1b;border-radius:10px;padding:13px 15px;color:#ddd;line-height:1.5;white-space:pre-wrap;max-height:170px;overflow:auto}
#ytActions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.ytAction{border:0;background:#272727;color:#fff;border-radius:20px;padding:9px 15px;outline:none}
.ytAction:focus{outline:2px solid #4aa3ff}
#ytRelated{display:flex;flex-direction:column;gap:13px}
.ytRel{display:flex;gap:10px;border:0;background:transparent;color:#fff;text-align:left;padding:0;outline:none}
.ytRelThumb{width:170px;aspect-ratio:16/9;background:#222;border-radius:8px;object-fit:cover;flex:none}
.ytRelText{min-width:0}
.ytRelTitle{font-size:14px;line-height:19px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ytRelSub{font-size:12px;color:#999;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ytRel:focus .ytRelThumb{box-shadow:0 0 0 3px #4aa3ff}
#ytCloseWatch{position:absolute;top:12px;right:16px;z-index:3;background:#000a;color:#fff;border:0;width:42px;height:42px;border-radius:50%;font-size:23px;outline:none}
#ytCloseWatch:focus{outline:2px solid #4aa3ff}
@media(max-width:1100px){#ytGrid{grid-template-columns:repeat(4,minmax(0,1fr))}#ytWatch{grid-template-columns:1fr}}
@media(max-width:800px){#ytTop{height:56px;padding:0 10px;gap:7px}#ytLogo{min-width:42px;font-size:0}#ytLogoMark{width:31px;height:22px}#ytSearch{max-width:none}#ytSearchInput{font-size:15px}#ytSide{display:none}#ytContent{padding:12px 10px 30px}#ytGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 10px}.ytThumb{border-radius:7px}.ytTitle{font-size:13px;line-height:18px}.ytChannel,.ytStats{font-size:11px}#ytPlayer{inset:56px 0 0;padding:10px}#ytWatch{gap:12px}#ytWatchMain h1{font-size:17px;line-height:22px}}
`;
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var panel=document.createElement('section');panel.id='ytPanel';panel.innerHTML=
    '<header id="ytTop"><button id="ytBack" type="button" aria-label="Quay lại">‹</button><div id="ytLogo"><span id="ytLogoMark">▶</span><span>YouTube</span></div><button id="ytTopHome" type="button" aria-label="Trang chủ">⌂</button><div id="ytSearch"><input id="ytSearchInput" type="search" autocomplete="off" placeholder="Tìm kiếm"><button id="ytSearchBtn" type="button" aria-label="Tìm kiếm">⌕</button></div></header>'+
    '<div id="ytBody"><aside id="ytSide"><button class="ytSideBtn active" data-yt-nav="home"><span>⌂</span><span>Trang chủ</span></button><button class="ytSideBtn" data-yt-nav="trending"><span>♨</span><span>Thịnh hành</span></button><button class="ytSideBtn" data-yt-nav="history"><span>◷</span><span>Lịch sử</span></button><button class="ytSideBtn" data-yt-nav="music"><span>♫</span><span>Âm nhạc</span></button></aside><main id="ytContent"><div id="ytChips"><button class="ytChip active" data-yt-chip="all">Tất cả</button><button class="ytChip" data-yt-chip="music">Âm nhạc</button><button class="ytChip" data-yt-chip="news">Tin tức</button><button class="ytChip" data-yt-chip="sports">Thể thao</button><button class="ytChip" data-yt-chip="gaming">Trò chơi</button></div><div id="ytGrid"></div><div id="ytMessage"></div></main></div>'+
    '<section id="ytPlayer"><button id="ytCloseWatch" type="button" aria-label="Đóng video">×</button><div id="ytWatch"><div id="ytWatchMain"><div id="ytVideoWrap"><video id="ytVideo" playsinline controls preload="metadata"></video></div><h1 id="ytWatchTitle"></h1><div id="ytWatchMeta"></div><div id="ytActions"><button class="ytAction" id="ytLike">👍 Thích</button><button class="ytAction" id="ytShare">↗ Chia sẻ</button><button class="ytAction" id="ytFull">⛶ Toàn màn hình</button></div><div id="ytWatchDesc"></div></div><div id="ytRelated"></div></div></section>';
  document.getElementById('app').appendChild(panel);
  var grid=$('#ytGrid'),msg=$('#ytMessage'),content=$('#ytContent'),inp=$('#ytSearchInput'),video=$('#ytVideo');
  var api=function(path){return fetch(path,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})};
  var fmtNum=function(n){n=Number(n||0);if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e3)return (n/1e3).toFixed(1)+'K';return String(n||0)};
  var fmtDur=function(sec){sec=Number(sec||0);if(!sec)return '';var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return (h?(h+':'+String(m).padStart(2,'0')):m)+':'+String(s).padStart(2,'0')};
  var videoId=function(u){var text=String(u||'');var m=text.match(/[?&]v=([A-Za-z0-9_-]{11})/);if(m)return m[1];m=text.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/))([A-Za-z0-9_-]{11})/i);return m?m[1]:''};
  var thumb=function(x){return x&&((x.thumbnail)||x.thumbnailUrl)||''};
  var itemsFrom=function(d){return Array.isArray(d)?d:(d&&Array.isArray(d.items)?d.items:(d&&Array.isArray(d.relatedStreams)?d.relatedStreams:[]))};
  var openState=function(){state.open=true;panel.classList.add('open');document.body.classList.add('yt-mode');$('#ytPlayer').classList.remove('open');loadTrending()};
  var closeState=function(){try{video.pause();video.removeAttribute('src');video.load()}catch(e){}state.open=false;state.current=null;$('#ytPlayer').classList.remove('open');panel.classList.remove('open');document.body.classList.remove('yt-mode');try{document.body.focus()}catch(e){}};
  var render=function(){
    grid.innerHTML='';
    if(state.loading){msg.textContent='Đang tải YouTube…';return}
    if(!state.items.length){msg.textContent='Không tìm thấy video';return}
    msg.textContent='';
    state.items.forEach(function(x,i){
      if(!x||String(x.type||'stream').toLowerCase()!=='stream')return;
      var b=document.createElement('button');b.type='button';b.className='ytCard';b.dataset.index=String(i);b.tabIndex=i===state.index?0:-1;
      var t=thumb(x);
      b.innerHTML='<div class="ytThumb">'+(t?'<img loading="lazy" src="'+esc(t)+'" alt="">':'')+(x.duration?'<span class="ytDur">'+fmtDur(x.duration)+'</span>':'')+'</div><div class="ytCardInfo"><div class="ytTitle">'+esc(x.title||'Video')+'</div><div class="ytChannel">'+esc(x.uploaderName||'')+'</div><div class="ytStats">'+fmtNum(x.views)+' lượt xem</div></div>';
      b.addEventListener('click',function(){watch(x.url||x.videoId||'')});
      b.addEventListener('focus',function(){state.index=i});
      grid.appendChild(b);
    });
    focusGrid();
  };
  var focusGrid=function(){
    var a=grid.querySelectorAll('.ytCard');if(!a.length)return;
    state.index=Math.max(0,Math.min(a.length-1,state.index));
    for(var i=0;i<a.length;i++)a[i].tabIndex=i===state.index?0:-1;
    try{a[state.index].focus({preventScroll:true})}catch(e){try{a[state.index].focus()}catch(e2){}}
    try{a[state.index].scrollIntoView({block:'nearest',behavior:'auto'})}catch(e3){}
  };
  var loadTrending=function(){
    state.loading=true;render();
    api('/api/youtube/trending?region=VN').then(function(d){state.items=itemsFrom(d);state.index=0;state.loading=false;render()}).catch(function(e){state.loading=false;state.items=[];render();msg.textContent='Không tải được YouTube lúc này';});
  };
  var search=function(q){
    q=String(q||inp.value||'').trim();if(!q){loadTrending();return}
    state.query=q;state.loading=true;render();
    api('/api/youtube/search?q='+encodeURIComponent(q)+'&filter=videos').then(function(d){state.items=itemsFrom(d);state.index=0;state.loading=false;render()}).catch(function(e){state.loading=false;state.items=[];render();msg.textContent='Không tải được kết quả tìm kiếm';});
  };
  var chooseStream=function(d){
    if(d&&d.hls)return {url:d.hls,kind:'hls'};
    var a=Array.isArray(d&&d.videoStreams)?d.videoStreams.slice():[];
    a=a.filter(function(x){return x&&x.url&&!x.videoOnly&&(!x.mimeType||/^video\//i.test(x.mimeType))});
    a.sort(function(a,b){return (Number(b.width||0)*Number(b.height||0))-(Number(a.width||0)*Number(a.height||0))});
    return a[0]?{url:a[0].url,kind:'progressive'}:null;
  };
  var prox=function(u){return '/api/stream?u='+encodeURIComponent(u)};
  var watch=function(u){
    var id=videoId(u);if(!id&&/^[A-Za-z0-9_-]{11}$/.test(String(u||'')))id=String(u);if(!id){msg.textContent='Video ID không hợp lệ';return}
    state.loading=true;$('#ytPlayer').classList.add('open');$('#ytWatchTitle').textContent='Đang tải…';$('#ytWatchMeta').textContent='';$('#ytWatchDesc').textContent='';$('#ytRelated').innerHTML='';
    api('/api/youtube/streams/'+encodeURIComponent(id)).then(function(d){
      state.loading=false;state.current=d;var s=chooseStream(d);if(!s)throw new Error('no stream');
      video.src=prox(s.url);video.load();var p=video.play();if(p&&p.catch)p.catch(function(){});
      $('#ytWatchTitle').textContent=d.title||'YouTube';$('#ytWatchMeta').textContent=(d.uploader||'')+' · '+fmtNum(d.views)+' lượt xem';$('#ytWatchDesc').textContent=d.description||'';
      var rel=Array.isArray(d.relatedStreams)?d.relatedStreams:[],rh='';
      rel.slice(0,30).forEach(function(x,i){if(!x)return;rh+='<button class="ytRel" data-rel="'+i+'" type="button" tabindex="-1"><img class="ytRelThumb" src="'+esc(thumb(x))+'" alt=""><div class="ytRelText"><div class="ytRelTitle">'+esc(x.title||'')+'</div><div class="ytRelSub">'+esc(x.uploaderName||'')+'</div></div></button>'});
      $('#ytRelated').innerHTML=rh;var rb=$('#ytRelated').querySelectorAll('.ytRel');for(var j=0;j<rb.length;j++)rb[j].addEventListener('click',function(){var i=Number(this.dataset.rel);watch(rel[i]&&rel[i].url)});
      content.scrollTop=0;
    }).catch(function(e){state.loading=false;$('#ytWatchTitle').textContent='Không thể phát video';$('#ytWatchDesc').textContent='Backend YouTube không cung cấp luồng phát cho video này.';});
  };
  var closeWatch=function(){try{video.pause();video.removeAttribute('src');video.load()}catch(e){}$('#ytPlayer').classList.remove('open');state.current=null;focusGrid()};
  var nav=function(dx,dy){
    var a=grid.querySelectorAll('.ytCard');if(!a.length)return;
    var cols=5;if(window.matchMedia('(max-width:1100px)').matches)cols=4;if(window.matchMedia('(max-width:800px)').matches)cols=2;
    var idx=state.index;if(dx<0)idx=Math.max(0,idx-1);else if(dx>0)idx=Math.min(a.length-1,idx+1);else if(dy<0)idx=Math.max(0,idx-cols);else if(dy>0)idx=Math.min(a.length-1,idx+cols);
    state.index=idx;focusGrid();
  };
  $('#ytBack').onclick=closeState;$('#ytTopHome').onclick=loadTrending;$('#ytSearchBtn').onclick=function(){search(inp.value)};inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();search(inp.value)}});
  $('#ytCloseWatch').onclick=closeWatch;
  $('#ytFull').onclick=function(){var el=$('#ytVideoWrap');try{if(el.requestFullscreen)el.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen()}catch(e){}};
  $('#ytShare').onclick=function(){try{var id=videoId((state.current&&state.current.url)||'');navigator.clipboard&&navigator.clipboard.writeText('https://www.youtube.com/watch?v='+id);msg.textContent='Đã sao chép liên kết'}catch(e){}};
  document.querySelectorAll('[data-yt-nav]').forEach(function(b){b.addEventListener('click',function(){var n=b.dataset.ytNav;if(n==='home'||n==='trending')loadTrending();else if(n==='music')search('music');else msg.textContent='Lịch sử sẽ được bổ sung ở bản tiếp theo';})});
  document.querySelectorAll('[data-yt-chip]').forEach(function(b){b.addEventListener('click',function(){var q=b.dataset.ytChip;if(q==='all')loadTrending();else search(q);document.querySelectorAll('.ytChip').forEach(function(x){x.classList.toggle('active',x===b)})})});
  window.addEventListener('keydown',function(e){
    if(!state.open)return;
    var k=Number(e.keyCode||0),active=document.activeElement;
    if(k===27||k===10009||k===461||e.key==='Escape'||e.key==='Back'){
      e.preventDefault();e.stopPropagation();if($('#ytPlayer').classList.contains('open'))closeWatch();else closeState();return;
    }
    if(e.repeat)return;
    var side=active&&active.closest?active.closest('#ytSide'):null;
    var searchBtn=active&&active.id==='ytSearchBtn';
    var inSearch=active===inp;
    if(inSearch){
      if(k===40||e.key==='ArrowDown'){e.preventDefault();focusGrid();return}
      if(k===13||e.key==='Enter'){return}
      if(k===39||e.key==='ArrowRight'){e.preventDefault();try{$('#ytSearchBtn').focus()}catch(_){}return}
      if(k===37||e.key==='ArrowLeft'){e.preventDefault();try{$('#ytBack').focus()}catch(_){}return}
      return;
    }
    if(searchBtn){
      if(k===13||e.key==='Enter'){e.preventDefault();search(inp.value);return}
      if(k===38||e.key==='ArrowUp'){e.preventDefault();inp.focus();return}
      if(k===40||e.key==='ArrowDown'){e.preventDefault();focusGrid();return}
      return;
    }
    if(side){
      var sb=document.querySelectorAll('#ytSide .ytSideBtn'),si=Array.prototype.indexOf.call(sb,active);
      if(k===38||e.key==='ArrowUp'){e.preventDefault();si=Math.max(0,si-1);sb[si].focus();return}
      if(k===40||e.key==='ArrowDown'){e.preventDefault();si=Math.min(sb.length-1,si+1);sb[si].focus();return}
      if(k===39||e.key==='ArrowRight'){e.preventDefault();focusGrid();return}
      if(k===13||e.key==='Enter'){e.preventDefault();active.click();return}
      return;
    }
    if($('#ytPlayer').classList.contains('open')){
      if(k===38||e.key==='ArrowUp'){e.preventDefault();try{video.focus()}catch(_){}return}
      if(k===40||e.key==='ArrowDown'){e.preventDefault();var rr=$('#ytRelated .ytRel');if(rr)rr.focus();return}
    }
    if(k===37||e.key==='ArrowLeft'){
      e.preventDefault();
      var cards=grid.querySelectorAll('.ytCard');
      if(cards.length&&state.index%((window.matchMedia('(max-width:1100px)').matches?4:(window.matchMedia('(max-width:800px)').matches?2:5)))===0){
        var first=document.querySelector('#ytSide .ytSideBtn');if(first){first.focus();return}
      }
      if(active!==inp)nav(-1,0);return;
    }
    if(k===39||e.key==='ArrowRight'){e.preventDefault();if(active!==inp)nav(1,0);return}
    if(k===38||e.key==='ArrowUp'){
      e.preventDefault();
      if(state.index<((window.matchMedia('(max-width:1100px)').matches?4:(window.matchMedia('(max-width:800px)').matches?2:5)))){inp.focus();return}
      nav(0,-1);return;
    }
    if(k===40||e.key==='ArrowDown'){e.preventDefault();if($('#ytPlayer').classList.contains('open')){var rr2=$('#ytRelated .ytRel');if(rr2)rr2.focus();}else nav(0,1);return}
    if(k===13||e.key==='Enter'){var b=document.activeElement;if(b&&b!==inp&&b.click){e.preventDefault();b.click()}}
  },true);
  window.NM7YouTube={open:openState,close:closeState,search:search,watch:watch};
})();
})();