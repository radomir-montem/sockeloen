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
    var data = JSON.parse(root.querySelector('[data-upsell-product]').textContent);
    var hostVariants = JSON.parse(root.querySelector('[data-host-variants]').textContent);
    var form = document.getElementById(root.getAttribute('data-form'));
    if (!form) return;
    var symbol = root.getAttribute('data-money') || '€';
    var tiles = Array.prototype.slice.call(root.querySelectorAll('.pdp-upsell__tile'));
    var pickers = root.querySelector('[data-upsell-pickers]');
    /* The offered variant (metafield) fixes every option except the size:
       only variants sharing its non-size options are offered. */
    var isSizeName = function (name) { return /size|maat|größe/i.test(name); };
    var fixedId = parseInt(root.getAttribute('data-upsell-variant') || '0', 10);
    var fixedVariant = data.variants.find(function (v) { return v.id === fixedId; });
    if (fixedVariant) {
      data.variants = data.variants.filter(function (v) {
        return data.options.every(function (o, i) { return isSizeName(o.name) || v.options[i] === fixedVariant.options[i]; });
      });
      if (!data.variants.length) data.variants = [fixedVariant];
    }
    /* options worth asking for: size options with more than one available value */
    var options = data.options.filter(function (o, i) {
      if (!isSizeName(o.name)) return false;
      var values = {};
      data.variants.forEach(function (v) { if (v.available) values[v.options[i]] = true; });
      return Object.keys(values).length > 1;
    });
    var state = { root: root, form: form, qty: 0, picks: [], data: data, options: options };
    states.push(state);

    /* "39-41" -> [39, 41]; "L" -> null */
    function range(label) {
      var m = String(label || '').match(/(\d+)\s*[-–\/]\s*(\d+)/);
      if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
      var n = String(label || '').match(/^\s*(\d+)\s*$/);
      return n ? [parseInt(n[1], 10), parseInt(n[1], 10)] : null;
    }
    /* the add-on size that overlaps most with the main product's size */
    function matchingSize(option) {
      var idx = data.options.indexOf(option);
      var hostLabel = currentHostSize();
      var host = range(hostLabel);
      var best = null, bestScore = -1;
      option.values.forEach(function (value) {
        var ok = data.variants.some(function (v) { return v.available && v.options[idx] === value; });
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
    function variantFor(pick) {
      return data.variants.find(function (v) {
        return v.available && options.every(function (o) {
          var idx = data.options.indexOf(o);
          return v.options[idx] === pick[o.name];
        });
      }) || (options.length ? null : (fixedVariant && fixedVariant.available ? fixedVariant : data.variants.find(function (v) { return v.available; })));
    }
    function defaultPick() {
      var pick = {};
      var first = fixedVariant || data.variants.find(function (v) { return v.available; }) || data.variants[0];
      options.forEach(function (o) {
        pick[o.name] = matchingSize(o) || first.options[data.options.indexOf(o)];
      });
      return pick;
    }
    function addOnPrice() {
      var v = data.variants.find(function (x) { return x.available; }) || data.variants[0];
      return v ? v.price : 0;
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
      var host = hostPrice();
      var hostSave = hostSaving();
      tiles.forEach(function (tile) {
        var qty = parseInt(tile.getAttribute('data-qty'), 10);
        var pieces = 0;
        var pct = parseFloat(tile.getAttribute('data-pct')) || 0;
        for (var i = 0; i < qty; i++) {
          var v = variantFor(state.picks[i] || defaultPick());
          pieces += v ? v.price : addOnPrice();
        }
        /* rounded to cents first, the way the discount itself is applied */
        var bundleSave = Math.round(pieces * pct / 100);
        var total = host + pieces - bundleSave;
        var saving = hostSave + bundleSave;
        var cmp = tile.querySelector('[data-upsell-compare]');
        if (cmp) cmp.textContent = saving > 0 ? money(total + saving, symbol) : '';
        var sv = tile.querySelector('[data-upsell-saving-text]');
        if (sv) {
          if (!sv.dataset.template) sv.dataset.template = sv.textContent;
          sv.textContent = saving > 0 ? sv.dataset.template.replace('__AMOUNT__', money(saving, symbol)) : '';
        }
        tile.querySelector('[data-upsell-total]').textContent = money(total, symbol);
      });
    }

    function renderPickers() {
      pickers.innerHTML = '';
      if (!state.qty || !options.length) { pickers.hidden = true; return; }
      pickers.hidden = false;
      for (var i = 0; i < state.qty; i++) {
        (function (i) {
          if (!state.picks[i]) state.picks[i] = defaultPick();
          var row = document.createElement('div');
          row.className = 'pdp-upsell__row';
          var label = document.createElement('span');
          label.className = 'pdp-upsell__row-label';
          label.textContent = (root.getAttribute('data-label') || '') + (state.qty > 1 ? ' ' + (i + 1) : '');
          label.textContent += ' · ' + (options[0] ? options[0].name : '');
          row.appendChild(label);
          options.forEach(function (o) {
            var idx = data.options.indexOf(o);
            var select = document.createElement('select');
            select.className = 'pdp-upsell__select';
            select.setAttribute('aria-label', o.name);
            o.values.forEach(function (value) {
              var ok = data.variants.some(function (v) { return v.available && v.options[idx] === value; });
              if (!ok) return;
              var opt = document.createElement('option');
              opt.value = value;
              opt.textContent = value;
              if (state.picks[i][o.name] === value) opt.selected = true;
              select.appendChild(opt);
            });
            select.addEventListener('change', function () {
              state.picks[i][o.name] = select.value;
              if (!variantFor(state.picks[i])) {
                /* this combination does not exist: fall back to the first one with this value */
                var v = data.variants.find(function (x) { return x.available && x.options[idx] === select.value; });
                if (v) options.forEach(function (q) { state.picks[i][q.name] = v.options[data.options.indexOf(q)]; });
                renderPickers();
              }
              renderPrices();
            });
            row.appendChild(select);
          });
          pickers.appendChild(row);
        })(i);
      }
    }

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
        var v = variantFor(state.picks[i] || defaultPick());
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
