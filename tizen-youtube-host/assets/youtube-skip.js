(function(){
  'use strict';
  if (window.__NM7_YT_SHIELD__) return;
  window.__NM7_YT_SHIELD__ = true;

  function clickSkips(){
    var selectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button'
    ];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        try { el.click(); } catch(e) {}
      });
    });
  }

  function removeOverlays(){
    [
      '.ytp-ad-overlay-container',
      '.ytp-ad-overlay-slot'
    ].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        try { el.remove(); } catch(e) {}
      });
    });
  }

  function skipCurrentVideoAd(){
    var adContainer = document.querySelector('.ad-showing');
    var video = document.querySelector('video');
    if (!adContainer || !video) return;

    try {
      if (isFinite(video.duration) &&
          video.duration > 0 &&
          video.currentTime + 0.5 < video.duration) {
        video.currentTime = Math.max(0, video.duration - 0.05);
      }
    } catch(e) {}
  }

  function pass(){
    clickSkips();
    skipCurrentVideoAd();
    removeOverlays();
  }

  try {
    new MutationObserver(pass).observe(document.documentElement, {
      subtree: true,
      childList: true
    });
  } catch(e) {}

  setInterval(pass, 250);
  pass();
})();
