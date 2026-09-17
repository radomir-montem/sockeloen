/* Card colour row: tap a swatch to switch the card to that colour
   (image, subtitle, link) without leaving the page. */
(function () {
  if (window.__ccrInit) return;
  window.__ccrInit = true;

  function swap(sw) {
    var card = sw.closest('.card-wrapper');
    var row = sw.closest('.ccr');
    if (!card || !row) return;
    row.querySelectorAll('.ccr__swatch').forEach(function (s) {
      s.classList.toggle('is-selected', s === sw);
    });
    var url = sw.getAttribute('data-url');
    if (url) {
      if (card.tagName === 'A') card.setAttribute('href', url);
      card.querySelectorAll('a[href*="/products/"]').forEach(function (a) { a.setAttribute('href', url); });
    }
    var media = card.querySelector('.card__media .media');
    var image = sw.getAttribute('data-image');
    if (media && image) {
      var imgs = media.querySelectorAll(':scope > img');
      if (imgs[0]) {
        imgs[0].removeAttribute('srcset');
        imgs[0].removeAttribute('sizes');
        imgs[0].src = image;
        imgs[0].alt = sw.getAttribute('data-alt') || sw.getAttribute('data-color') || '';
      }
      /* the hover image belonged to the previous colour */
      for (var i = 1; i < imgs.length; i++) imgs[i].remove();
      media.classList.add('no-has-second-image');
    }
    var sub = card.querySelector('.card-title-color');
    if (sub) sub.textContent = sw.getAttribute('data-color') || '';
  }

  /* ---- Colour sampling for swatches that only have a photo ----
     The variant photo is drawn on a small canvas; pixels in the middle of
     the image are classified as coloured (kept, grouped by hue) or as
     background/neutral. The dominant coloured group wins; a sock without
     any colour becomes white, black or grey from its lightness. Results
     are cached per image in localStorage. A hex from the colour table or
     the shop metafield always takes precedence (those swatches never
     reach this code). */
  var cacheKey = 'ccr-color:';
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function dominantColor(img) {
    var w = 48, h = 48;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    var data;
    try { data = ctx.getImageData(0, 0, w, h).data; } catch (err) { return null; }
    var bins = {}, total = 0, neutralL = 0, neutralN = 0;
    for (var y = Math.floor(h * 0.2); y < h * 0.8; y++) {
      for (var x = Math.floor(w * 0.25); x < w * 0.75; x++) {
        var i = (y * w + x) * 4;
        if (data[i + 3] < 200) continue;
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var hsl = rgbToHsl(r, g, b);
        total++;
        if (hsl[1] > 0.28 && hsl[2] > 0.1 && hsl[2] < 0.92) {
          var k = Math.round(hsl[0] * 18) % 18;
          var bin = bins[k] || (bins[k] = { n: 0, r: 0, g: 0, b: 0 });
          bin.n++; bin.r += r; bin.g += g; bin.b += b;
        } else {
          neutralL += hsl[2]; neutralN++;
        }
      }
    }
    if (!total) return null;
    var best = null;
    Object.keys(bins).forEach(function (k) { if (!best || bins[k].n > best.n) best = bins[k]; });
    if (best && best.n / total >= 0.08) {
      return 'rgb(' + Math.round(best.r / best.n) + ',' + Math.round(best.g / best.n) + ',' + Math.round(best.b / best.n) + ')';
    }
    if (!neutralN) return null;
    var l = neutralL / neutralN;
    if (l > 0.82) return '#f4f4f4';
    if (l < 0.3) return '#151515';
    var v = Math.round(l * 255);
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }
  function applySampled(el, color) {
    el.style.background = color;
    el.classList.add('is-sampled');
  }
  function sampleSwatch(el) {
    var img = el.querySelector('img');
    if (!img) return;
    var src = img.currentSrc || img.src;
    if (!src) return;
    var key = cacheKey + src;
    var cached = null;
    try { cached = localStorage.getItem(key); } catch (err) {}
    if (cached) { applySampled(el, cached); return; }
    var probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = function () {
      var color = dominantColor(probe);
      if (!color) return;
      try { localStorage.setItem(key, color); } catch (err) {}
      applySampled(el, color);
    };
    probe.src = src;
  }
  function sampleAll(root) {
    (root || document).querySelectorAll('.ccr__swatch:not([style*="background"]):not(.is-sampled), .product-v2 .color-dot--swatch.color-dot--image:not(.is-sampled)').forEach(sampleSwatch);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { sampleAll(); });
  else sampleAll();
  /* cards that arrive later (filters, load more, recently viewed) */
  new MutationObserver(function (muts) {
    var seen = false;
    muts.forEach(function (m) { if (m.addedNodes.length) seen = true; });
    if (seen) sampleAll();
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', function (e) {
    var sw = e.target.closest && e.target.closest('.ccr__swatch');
    if (!sw) return;
    e.preventDefault();
    e.stopPropagation();
    swap(sw);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var sw = e.target.closest && e.target.closest('.ccr__swatch');
    if (!sw) return;
    e.preventDefault();
    e.stopPropagation();
    swap(sw);
  }, true);
})();
