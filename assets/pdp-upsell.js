/* Upsell tiles (snippets/product-upsell-tiles.liquid): prices, pickers and
   the add-to-cart hand-off. One instance per product form. */
(function () {
  if (window.__pdpUpsellInit) return;
  window.__pdpUpsellInit = true;

  var states = [];

  function money(cents, symbol) {
    var v = (Math.round(cents) / 100).toFixed(2).replace('.', ',');
    return (symbol || '€') + v;
  }

  function init(root) {
    var choices = JSON.parse(root.querySelector('[data-upsell-choices]').textContent);
    var hostVariants = JSON.parse(root.querySelector('[data-host-variants]').textContent);
    var form = document.getElementById(root.getAttribute('data-form'));
    if (!form || !choices.length) return;
    var symbol = root.getAttribute('data-money') || '€';
    var shipThreshold = parseFloat(root.getAttribute('data-ship-threshold')) || 0;
    var tiles = Array.prototype.slice.call(root.querySelectorAll('.pdp-upsell__tile'));
    var isSizeName = function (name) { return /size|maat|größe/i.test(name); };
    /* Each choice is an offered variant: it fixes every option except the size,
       so only the variants sharing its non-size options stay, and a size is
       asked only when more than one is available. */
    choices.forEach(function (c) {
      c.fixed = c.variants.find(function (v) { return v.id === c.id; }) || c.variants[0];
      c.variants = c.variants.filter(function (v) {
        return c.options.every(function (o, i) { return isSizeName(o.name) || v.options[i] === c.fixed.options[i]; });
      });
      if (!c.variants.length) c.variants = [c.fixed];
      c.sizeOptions = c.options.filter(function (o, i) {
        if (!isSizeName(o.name)) return false;
        var values = {};
        c.variants.forEach(function (v) { if (v.available) values[v.options[i]] = true; });
        return Object.keys(values).length > 1;
      });
    });
    var askChoice = choices.length > 1;
    var state = { root: root, form: form, qty: 0, picks: [], choices: choices };
    states.push(state);

    /* "39-41" -> [39, 41]; "L" -> null */
    function range(label) {
      var m = String(label || '').match(/(\d+)\s*[-–\/]\s*(\d+)/);
      if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
      var n = String(label || '').match(/^\s*(\d+)\s*$/);
      return n ? [parseInt(n[1], 10), parseInt(n[1], 10)] : null;
    }
    /* the add-on size that overlaps most with the main product's size */
    function matchingSize(choice, option) {
      var idx = choice.options.indexOf(option);
      var hostLabel = currentHostSize();
      var host = range(hostLabel);
      var best = null, bestScore = -1;
      option.values.forEach(function (value) {
        var ok = choice.variants.some(function (v) { return v.available && v.options[idx] === value; });
        if (!ok) return;
        var score = 0;
        if (hostLabel && value === hostLabel) score = 1000;
        else if (host) {
          var r = range(value);
          if (r) score = Math.max(0, Math.min(host[1], r[1]) - Math.max(host[0], r[0]) + 1);
        }
        if (score > bestScore) { bestScore = score; best = value; }
      });
      return best;
    }
    function currentHostSize() {
      var idInput = form.querySelector('[name="id"]');
      var id = idInput ? parseInt(idInput.value, 10) : 0;
      var v = hostVariants.find(function (h) { return h.id === id; });
      if (!v || !v.options) return root.getAttribute('data-host-size') || '';
      var hostOptions = JSON.parse(root.getAttribute('data-host-options') || 'null');
      if (!hostOptions) return root.getAttribute('data-host-size') || '';
      for (var i = 0; i < hostOptions.length; i++) if (isSizeName(hostOptions[i])) return v.options[i];
      return root.getAttribute('data-host-size') || '';
    }

    function hostVariant() {
      var idInput = form.querySelector('[name="id"]');
      var id = idInput ? parseInt(idInput.value, 10) : 0;
      return hostVariants.find(function (h) { return h.id === id; }) || hostVariants[0];
    }
    function hostPrice() {
      var v = hostVariant();
      return v ? v.price : 0;
    }
    /* the main product's own saving (compare-at price minus price), 0 when not on sale */
    function hostSaving() {
      var v = hostVariant();
      return v && v.compare > v.price ? v.compare - v.price : 0;
    }
    /* a pick = { choice: index, sizes: { optionName: value } } */
    function variantFor(pick) {
      var c = choices[pick.choice] || choices[0];
      return c.variants.find(function (v) {
        return v.available && c.sizeOptions.every(function (o) {
          var idx = c.options.indexOf(o);
          return v.options[idx] === pick.sizes[o.name];
        });
      }) || (c.sizeOptions.length ? null : (c.fixed.available ? c.fixed : c.variants.find(function (v) { return v.available; })));
    }
    /* piece i starts on choice i (two pieces = two different products when offered) */
    function defaultPick(i) {
      var ci = Math.min(i || 0, choices.length - 1);
      if (!choices[ci].variants.some(function (v) { return v.available; })) {
        ci = Math.max(0, choices.findIndex(function (c) { return c.variants.some(function (v) { return v.available; }); }));
      }
      return { choice: ci, sizes: defaultSizes(choices[ci]) };
    }
    function defaultSizes(c) {
      var sizes = {};
      c.sizeOptions.forEach(function (o) {
        sizes[o.name] = matchingSize(c, o) || c.fixed.options[c.options.indexOf(o)];
      });
      return sizes;
    }
    function pieceVariant(i) {
      return variantFor(state.picks[i] || defaultPick(i));
    }

    function renderPieceImages() {
      tiles.forEach(function (tile) {
        tile.querySelectorAll('[data-upsell-piece-img]').forEach(function (img) {
          var i = parseInt(img.getAttribute('data-upsell-piece-img'), 10);
          var pick = state.picks[i] || defaultPick(i);
          var c = choices[pick.choice] || choices[0];
          if (c.image && img.getAttribute('src') !== c.image) img.setAttribute('src', c.image);
        });
      });
    }
    function renderHostImage() {
      var active = document.querySelector('.product-v2 .product__media-item.is-active img') || document.querySelector('.product-v2 .product__media-item:not([style*="display: none"]) img');
      if (!active) return;
      var src = active.currentSrc || active.src;
      if (!src) return;
      src = src.indexOf('width=') !== -1 ? src.replace(/width=\d+/, 'width=96') : src;
      root.querySelectorAll('[data-upsell-host-img]').forEach(function (img) { if (img.src !== src) img.src = src; });
    }
    function renderPrices() {
      renderHostImage();
      renderPieceImages();
      var host = hostPrice();
      var hostSave = hostSaving();
      tiles.forEach(function (tile) {
        var qty = parseInt(tile.getAttribute('data-qty'), 10);
        var pieces = 0;
        var pct = parseFloat(tile.getAttribute('data-pct')) || 0;
        for (var i = 0; i < qty; i++) {
          var v = pieceVariant(i);
          pieces += v ? v.price : (choices[0].fixed.price || 0);
        }
        /* rounded to cents first, the way the discount itself is applied */
        var bundleSave = Math.round(pieces * pct / 100);
        var total = host + pieces - bundleSave;
        /* Maximum saving on every tile: the main product's own sale saving
           (compare-at price) plus the bundle discount on the add-ons. */
        var saving = hostSave + bundleSave;
        var cmp = tile.querySelector('[data-upsell-compare]');
        if (cmp) cmp.textContent = saving > 0 ? money(total + saving, symbol) : '';
        var sv = tile.querySelector('[data-upsell-saving-text]');
        if (sv) {
          if (!sv.dataset.template) sv.dataset.template = sv.textContent;
          sv.textContent = saving > 0 ? sv.dataset.template.replace('__AMOUNT__', money(saving, symbol)) : '';
        }
        tile.querySelector('[data-upsell-total]').textContent = money(total, symbol);
        /* "Free shipping" when this tile's total reaches the market's threshold */
        var ship = tile.querySelector('[data-upsell-ship]');
        if (ship) ship.hidden = !(shipThreshold > 0 && total >= shipThreshold * 100);
      });
    }

    /* No pickers: piece n is choice n (the shop owner lists one-size products);
       a sized product silently gets the size closest to the main product's. */
    function renderPickers() {}

    tiles.forEach(function (tile) {
      tile.addEventListener('click', function () {
        state.qty = parseInt(tile.getAttribute('data-qty'), 10);
        tiles.forEach(function (t) {
          var on = t === tile;
          t.classList.toggle('is-selected', on);
          t.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        renderPickers();
        renderPrices();
      });
    });

    /* the main product's variant changes: prices follow */
    var idInput = form.querySelector('[name="id"]');
    if (idInput && window.MutationObserver) {
      new MutationObserver(renderPrices).observe(idInput, { attributes: true, attributeFilter: ['value'] });
    }
    form.addEventListener('change', function () {
      /* a new size on the main product: the add-on size follows again */
      state.picks = [];
      if (state.qty) renderPickers();
      renderPrices();
    });
    document.addEventListener('variant:change', renderPrices);
    /* the tile preselected in the markup (custom.upsell_default_qty) */
    var preselected = tiles.find(function (t) { return t.classList.contains('is-selected'); });
    if (preselected) {
      state.qty = parseInt(preselected.getAttribute('data-qty'), 10) || 0;
      if (state.qty) renderPickers();
    }
    renderPrices();

    state.items = function () {
      var items = [];
      for (var i = 0; i < state.qty; i++) {
        var v = pieceVariant(i);
        if (!v) continue;
        var existing = items.find(function (it) { return it.id === v.id; });
        if (existing) existing.quantity += 1;
        else items.push({ id: v.id, quantity: 1, properties: { _upsell_for: root.getAttribute('data-host-gid') } });
      }
      return items;
    };
  }

  document.querySelectorAll('[data-pdp-upsell]').forEach(init);

  /* Add to Cart: the add-on pieces go in first, then the main product
     through the theme's own handler (which also refreshes the cart drawer).
     The theme binds its handler on the form at construction, so a capture
     listener on the document runs before it and can hold it back. */
  document.addEventListener('submit', function (evt) {
    var form = evt.target;
    var state = states.find(function (s) { return s.form === form; });
    var items = state && state.qty ? state.items() : [];
    if (!items.length) return;
    var productForm = form.closest('product-form');
    if (!productForm || typeof productForm.onSubmitHandler !== 'function') return;
    var button = productForm.querySelector('[type="submit"]');
    if (button && button.getAttribute('aria-disabled') === 'true') { evt.preventDefault(); evt.stopImmediatePropagation(); return; }
    evt.preventDefault();
    evt.stopImmediatePropagation();
    if (button) button.classList.add('loading');
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ items: items }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.status) throw new Error(res.description || 'add-on failed');
        productForm.onSubmitHandler(evt);
      })
      .catch(function (err) {
        if (button) button.classList.remove('loading');
        if (productForm.handleErrorMessage) productForm.handleErrorMessage(err.message);
      });
  }, true);
})();
