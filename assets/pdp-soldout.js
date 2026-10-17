/* Sold-out alternatives on the v2 product page (snippets/product-soldout-alternatives.liquid).
   When the selected variant is sold out, the upsell tiles / AOV bundle widget make way for a
   text tile plus at most 2 backup products that have the customer's size in stock. */
(function () {
  var root = document.querySelector('[data-pdp-soldout]');
  if (!root) return;
  var data;
  try {
    data = JSON.parse(root.querySelector('[data-soldout-data]').textContent);
  } catch (e) {
    return;
  }
  var MAX_ALTS = 2;
  var scope = root.closest('.product-v2') || document.body;
  var textEl = root.querySelector('[data-soldout-text]');
  var titleEl = root.querySelector('[data-soldout-title]');
  var tiles = root.querySelector('.pdp-soldout__tiles');

  function selectedVariant() {
    var picker = scope.querySelector('variant-radios');
    if (picker) {
      var values = Array.prototype.map.call(picker.querySelectorAll('fieldset'), function (fs) {
        var c = fs.querySelector('input[type="radio"]:checked');
        return c ? c.value : null;
      });
      var hit = data.variants.find(function (v) {
        return v.options.every(function (o, i) { return o === values[i]; });
      });
      if (hit) return hit;
    }
    var id = parseInt(new URLSearchParams(location.search).get('variant'), 10);
    return data.variants.find(function (v) { return v.id === id; }) || (data.variants.length === 1 ? data.variants[0] : null);
  }

  /* "39-41" -> [39, 41], "46" -> [46, 46], "M" -> null */
  function range(s) {
    s = String(s || '');
    var m = s.match(/(\d+(?:[.,]\d+)?)\s*[-–\/]\s*(\d+(?:[.,]\d+)?)/);
    if (m) return [parseFloat(m[1].replace(',', '.')), parseFloat(m[2].replace(',', '.'))];
    m = s.match(/^\s*(\d+(?:[.,]\d+)?)\s*$/);
    if (m) { var n = parseFloat(m[1].replace(',', '.')); return [n, n]; }
    return null;
  }

  function isOneSize(s) {
    return !s || /one\s*-?\s*size|onesize|universal/i.test(s);
  }

  /* How well an alternative size fits the sold-out size: 0 = not at all, higher = more overlap */
  function fit(hostSize, altSize) {
    if (isOneSize(altSize)) return 1;
    var a = range(hostSize), b = range(altSize);
    if (a && b) {
      var ov = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
      return ov < 0 ? 0 : ov + 1;
    }
    return String(hostSize).trim().toLowerCase() === String(altSize).trim().toLowerCase() ? 1 : 0;
  }

  function matches(hostSize) {
    var out = [];
    data.alts.forEach(function (alt) {
      if (out.length >= MAX_ALTS) return;
      var best = null, bestFit = 0;
      alt.variants.forEach(function (v) {
        if (!v.available) return;
        var f = hostSize === '' ? (v.size === '' || isOneSize(v.size) ? 1 : 0) : fit(hostSize, v.size);
        if (f > bestFit) { best = v; bestFit = f; }
      });
      if (best) out.push({ alt: alt, variant: best });
    });
    return out;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function tile(m) {
    var a = el('a', 'pdp-soldout__alt');
    a.href = m.alt.url + (m.alt.url.indexOf('?') === -1 ? '?' : '&') + 'variant=' + m.variant.id;
    var imgWrap = el('span', 'pdp-soldout__img');
    var img = el('img');
    img.src = m.variant.img;
    img.alt = '';
    img.width = 37;
    img.height = 46;
    img.loading = 'lazy';
    imgWrap.appendChild(img);
    var text = el('span', 'pdp-soldout__alt-text');
    text.appendChild(el('span', 'pdp-soldout__alt-title', m.alt.title));
    var sizeLine = m.variant.size && !isOneSize(m.variant.size)
      ? root.dataset.sizeLine.replace('__SIZE__', m.variant.size)
      : root.dataset.inStock;
    text.appendChild(el('span', 'pdp-soldout__alt-sub', sizeLine));
    var price = el('span', 'pdp-soldout__price');
    price.appendChild(el('span', 'pdp-soldout__total', m.variant.price));
    if (m.variant.compare) price.appendChild(el('s', 'pdp-soldout__compare', m.variant.compare));
    var chev = el('span', 'pdp-soldout__chevron');
    chev.setAttribute('aria-hidden', 'true');
    a.appendChild(imgWrap);
    a.appendChild(text);
    a.appendChild(price);
    a.appendChild(chev);
    return a;
  }

  /* Other colours of this product that are in stock in the same size (all other options equal) */
  function otherColours(v) {
    var ci = data.colorIndex;
    if (ci < 0) return [];
    var seen = {};
    return data.variants.filter(function (o) {
      if (!o.available || o.disabled || o.options[ci] === v.options[ci] || seen[o.options[ci]]) return false;
      var same = o.options.every(function (opt, i) { return i === ci || opt === v.options[i]; });
      if (same) seen[o.options[ci]] = true;
      return same;
    }).map(function (o) { return o.options[ci]; });
  }

  function selectColour(name) {
    var radio = Array.prototype.find.call(scope.querySelectorAll('variant-radios fieldset input[type="radio"]'), function (r) {
      return r.value === name && r.closest('fieldset').classList.contains('color-input');
    });
    if (radio && radio.nextElementSibling) radio.nextElementSibling.click();
  }

  /* "A", "A and B", "A, B and C" as buttons that switch the colour */
  function colourList(names) {
    var frag = document.createDocumentFragment();
    names.forEach(function (n, i) {
      if (i > 0) frag.appendChild(document.createTextNode(i === names.length - 1 ? ' ' + root.dataset.and + ' ' : ', '));
      var b = el('button', 'pdp-soldout__colour', n);
      b.type = 'button';
      b.addEventListener('click', function () { selectColour(n); });
      frag.appendChild(b);
    });
    return frag;
  }

  function hide() {
    root.hidden = true;
    scope.classList.remove('pdp-soldout-active');
  }

  function update() {
    var v = selectedVariant();
    if (!v || v.available || v.disabled) return hide();
    var hostSize = data.sizeIndex >= 0 ? v.options[data.sizeIndex] : '';
    var found = matches(hostSize);
    root.querySelectorAll('.pdp-soldout__alt').forEach(function (n) { n.remove(); });
    found.forEach(function (m) { tiles.appendChild(tile(m)); });
    titleEl.textContent = hostSize ? root.dataset.title.replace('__SIZE__', hostSize) : root.dataset.titleNosize;
    if (!found.length) textEl.textContent = root.dataset.textNone;
    else if (hostSize) textEl.textContent = root.dataset.text.replace('__SIZE__', hostSize);
    else textEl.textContent = root.dataset.textNosize;
    var colours = otherColours(v);
    if (colours.length) {
      var tpl = root.dataset.colours.split('__COLOURS__');
      textEl.appendChild(document.createTextNode(' ' + tpl[0]));
      textEl.appendChild(colourList(colours));
      textEl.appendChild(document.createTextNode(tpl[1] || ''));
    }
    root.hidden = false;
    scope.classList.add('pdp-soldout-active');
  }

  var timer;
  function schedule() {
    clearTimeout(timer);
    /* after the theme's own change handlers (size re-selection, global.js) have run */
    timer = setTimeout(update, 60);
  }

  var picker = scope.querySelector('variant-radios');
  if (picker) picker.addEventListener('change', schedule);
  window.addEventListener('popstate', schedule);
  update();
  /* global.js re-checks the variant ~500ms after load and may change the selection */
  setTimeout(update, 700);
})();
