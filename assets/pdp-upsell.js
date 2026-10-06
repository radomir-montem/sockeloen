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
    /* options worth asking for: more than one value among available variants */
    var options = data.options.filter(function (o, i) {
      var values = {};
      data.variants.forEach(function (v) { if (v.available) values[v.options[i]] = true; });
      return Object.keys(values).length > 1;
    });
    var state = { root: root, form: form, qty: 0, picks: [], data: data, options: options };
    states.push(state);

    function hostPrice() {
      var idInput = form.querySelector('[name="id"]');
      var id = idInput ? parseInt(idInput.value, 10) : 0;
      var v = hostVariants.find(function (h) { return h.id === id; }) || hostVariants[0];
      return v ? v.price : 0;
    }
    function variantFor(pick) {
      return data.variants.find(function (v) {
        return v.available && options.every(function (o) {
          var idx = data.options.indexOf(o);
          return v.options[idx] === pick[o.name];
        });
      });
    }
    function defaultPick() {
      var pick = {};
      var first = data.variants.find(function (v) { return v.available; }) || data.variants[0];
      options.forEach(function (o) { pick[o.name] = first.options[data.options.indexOf(o)]; });
      return pick;
    }
    function addOnPrice() {
      var v = data.variants.find(function (x) { return x.available; }) || data.variants[0];
      return v ? v.price : 0;
    }

    function renderPrices() {
      var host = hostPrice();
      tiles.forEach(function (tile) {
        var qty = parseInt(tile.getAttribute('data-qty'), 10);
        var total = host;
        if (qty > 0) {
          var pct = parseFloat(tile.getAttribute('data-pct')) || 0;
          var pieces = 0;
          for (var i = 0; i < qty; i++) {
            var v = variantFor(state.picks[i] || defaultPick());
            pieces += v ? v.price : addOnPrice();
          }
          var full = host + pieces;
          /* rounded to cents first, the way the discount itself is applied */
          var saving = Math.round(pieces * pct / 100);
          total = full - saving;
          var cmp = tile.querySelector('[data-upsell-compare]');
          if (cmp) cmp.textContent = money(full, symbol);
          var sv = tile.querySelector('[data-upsell-saving]');
          if (sv) sv.textContent = '(' + money(saving, symbol) + ')';
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
    form.addEventListener('change', renderPrices);
    document.addEventListener('variant:change', renderPrices);
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
