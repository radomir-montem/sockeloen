/* v2 product gallery on touch devices: tap a photo to open a full-screen
   zoom with pinch, drag and double-tap. (Swiping between photos is the
   slider in main-product-v2.liquid.) */
(function () {
  if (window.__pdpGalleryInit) return;
  window.__pdpGalleryInit = true;

  function init() {
    var gallery = document.querySelector('.product-v2 media-gallery');
    var list = document.querySelector('.product-v2 .product__media-list');
    if (!gallery || !list) return;

    /* ---- swipe ---- */
    var startX = 0, startY = 0, moved = false, multi = false;
    function visibleItems() {
      return Array.prototype.filter.call(list.querySelectorAll('.product__media-item'), function (i) {
        return i.style.display !== 'none';
      });
    }
    list.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { multi = true; return; }
      multi = false; moved = false;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, { passive: true });
    list.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) multi = true;
      var dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
    }, { passive: true });
    list.addEventListener('touchend', function (e) {
      if (multi) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX, dy = t.clientY - startY;
      /* the swipe itself is handled by the slider in main-product-v2.liquid */
      if (!moved) {
        var img = e.target.closest ? e.target.closest('img') : null;
        if (img && list.contains(img)) openZoom(img);
      }
    });

    /* ---- zoom overlay ---- */
    var overlay, stage, zimg, scale = 1, tx = 0, ty = 0;
    var pinchStart = 0, pinchScale = 1, pan = null, lastTap = 0, zMoved = false;
    function build() {
      overlay = document.createElement('div');
      overlay.className = 'pdp-zoom';
      overlay.innerHTML = '<button type="button" class="pdp-zoom__close" aria-label="Close">&times;</button><div class="pdp-zoom__stage"><img alt=""></div>';
      document.body.appendChild(overlay);
      stage = overlay.querySelector('.pdp-zoom__stage');
      zimg = overlay.querySelector('img');
      overlay.querySelector('.pdp-zoom__close').addEventListener('click', closeZoom);
      stage.addEventListener('touchstart', onStart, { passive: false });
      stage.addEventListener('touchmove', onMove, { passive: false });
      stage.addEventListener('touchend', onEnd);
      stage.addEventListener('dblclick', function (e) { e.preventDefault(); toggle(e.clientX, e.clientY); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeZoom(); });
    }
    function dist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    function apply() { zimg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; }
    function clamp() {
      scale = Math.min(4, Math.max(1, scale));
      if (scale === 1) { tx = 0; ty = 0; return; }
      var s = stage.getBoundingClientRect();
      var maxX = Math.max(0, (zimg.offsetWidth * scale - s.width) / 2);
      var maxY = Math.max(0, (zimg.offsetHeight * scale - s.height) / 2);
      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));
    }
    function toggle(cx, cy) {
      if (scale > 1) { scale = 1; tx = 0; ty = 0; }
      else {
        scale = 2.5;
        var s = stage.getBoundingClientRect();
        tx = (s.left + s.width / 2 - cx) * (scale - 1);
        ty = (s.top + s.height / 2 - cy) * (scale - 1);
      }
      clamp(); apply();
    }
    function onStart(e) {
      zMoved = false;
      if (e.touches.length === 2) { pinchStart = dist(e.touches); pinchScale = scale; pan = null; e.preventDefault(); return; }
      pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: tx, ty: ty };
    }
    function onMove(e) {
      if (e.touches.length === 2 && pinchStart) {
        scale = pinchScale * dist(e.touches) / pinchStart; clamp(); apply(); zMoved = true; e.preventDefault(); return;
      }
      if (pan && scale > 1) {
        tx = pan.tx + (e.touches[0].clientX - pan.x); ty = pan.ty + (e.touches[0].clientY - pan.y);
        clamp(); apply(); zMoved = true; e.preventDefault();
      } else if (pan) {
        if (Math.abs(e.touches[0].clientX - pan.x) > 8 || Math.abs(e.touches[0].clientY - pan.y) > 8) zMoved = true;
      }
    }
    function onEnd(e) {
      if (e.touches.length === 0) pinchStart = 0;
      if (zMoved) return;
      var now = Date.now();
      var t = e.changedTouches[0];
      if (now - lastTap < 300) { toggle(t.clientX, t.clientY); lastTap = 0; }
      else lastTap = now;
    }
    function openZoom(img) {
      if (!overlay) build();
      var src = (img.currentSrc || img.src).replace(/([?&])width=\d+/, '$1width=1600');
      zimg.src = src; zimg.alt = img.alt || '';
      scale = 1; tx = 0; ty = 0; apply();
      overlay.classList.add('is-open');
      document.documentElement.classList.add('pdp-zoom-open');
    }
    function closeZoom() {
      overlay.classList.remove('is-open');
      document.documentElement.classList.remove('pdp-zoom-open');
    }
    window.__pdpOpenZoom = openZoom; /* for tests */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
