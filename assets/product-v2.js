if (!customElements.get('sticky-atc-v2')) {
  customElements.define('sticky-atc-v2', class StickyAtcV2 extends HTMLElement {
    constructor() {
      super();
      this.productSection = null;
      this.atcButton = null;
      this.modal = null;
      this.confirmBtn = null;
      this.changeBtn = null;
      this.backdrop = null;
      this.selectionDisplay = null;
      this.hasSizeOption = false;
    }

    connectedCallback() {
      this.productSection = document.querySelector('.product-v2');
      this.atcButton = this.querySelector('.product-v2-sticky-bar__atc-btn');
      this.modal = document.querySelector('.product-v2-size-modal');
      this.confirmBtn = document.querySelector('.product-v2-size-modal__confirm');
      this.changeBtn = document.querySelector('.product-v2-size-modal__change');
      this.backdrop = document.querySelector('.product-v2-size-modal__backdrop');
      this.selectionDisplay = document.querySelector('.product-v2-size-modal__selection');

      if (!this.atcButton) return;

      // Detect if product has a size option (more than 1 value)
      this.hasSizeOption = this._detectSizeOption();

      // Find the real ATC button in the product form
      const realAtcBtn = document.querySelector('.product-v2 product-form button[name="add"]');
      const observeTarget = realAtcBtn || this.productSection;
      if (!observeTarget) return;

      // Show sticky bar whenever the real ATC button is NOT visible in the viewport
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            this.classList.add('show');
            this.classList.remove('hidden');
          } else {
            this.classList.remove('show');
            this.classList.add('hidden');
          }
        });
      }, { threshold: 0 }).observe(observeTarget);

      // Click handler — different behavior based on size options
      this.atcButton.addEventListener('click', () => this._handleAtcClick());

      if (this.confirmBtn) {
        this.confirmBtn.addEventListener('click', () => this._confirmAndAdd());
      }
      if (this.changeBtn) {
        this.changeBtn.addEventListener('click', () => this._scrollToForm());
      }
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => this._hideModal());
      }
    }

    _detectSizeOption() {
      // Check for a "Size" option with more than 1 value
      const sizeFieldsets = document.querySelectorAll('.product-v2 .product-form__input');
      for (const fieldset of sizeFieldsets) {
        const legend = fieldset.querySelector('legend, label.form__label');
        if (!legend) continue;
        const label = legend.textContent.trim().toLowerCase().replace(/:$/, '');
        if (label === 'size' || label === 'maat') {
          const radios = fieldset.querySelectorAll('input[type="radio"]');
          const options = fieldset.querySelectorAll('select option');
          if (radios.length > 1 || options.length > 1) return true;
        }
      }
      return false;
    }

    _getForm() {
      return document.querySelector('product-form form[data-type="add-to-cart-form"]')
        || document.querySelector('product-form form');
    }

    _handleAtcClick() {
      const form = this._getForm();
      if (!form) return;

      if (!this.hasSizeOption) {
        // No size options — add directly to cart
        this._submitForm(form);
      } else {
        // Has size options — show confirmation modal
        this._showSizeModal(form);
      }
    }

    _showSizeModal(form) {
      if (!this.modal) return;

      // Find selected size
      let selectedSize = '';
      const sizeFieldsets = (this.productSection || document).querySelectorAll('.product-form__input');
      for (const fieldset of sizeFieldsets) {
        const legend = fieldset.querySelector('legend, label.form__label');
        if (!legend) continue;
        const label = legend.textContent.trim().toLowerCase().replace(/:$/, '');
        if (label === 'size' || label === 'maat') {
          const checked = fieldset.querySelector('input[type="radio"]:checked');
          const select = fieldset.querySelector('select');
          if (checked) selectedSize = checked.value;
          else if (select) selectedSize = select.value;
          break;
        }
      }

      if (this.selectionDisplay) {
        this.selectionDisplay.textContent = selectedSize || '';
      }

      this.modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    _hideModal() {
      if (!this.modal) return;
      this.modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    _confirmAndAdd() {
      this._hideModal();
      const form = this._getForm();
      if (form) this._submitForm(form);
    }

    _submitForm(form) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }

    _scrollToForm() {
      this._hideModal();
      const realBtn = document.querySelector('.product-v2 product-form button[name="add"]');
      if (realBtn) {
        realBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
}

/* Avada Volume Discount enhancements: fix prices + inject product image stack */
(function() {
  /**
   * Single function to fix all Avada price formatting:
   * 1. Strip € symbol
   * 2. Replace decimal period with comma (EU format: 12,34 instead of 12.34)
   * Runs on all Avada price elements + our injected savings lines.
   */
  function fixAvadaPrices() {
    document.querySelectorAll(
      '.product-v2 .AOV-Offer__DiscountPrice, .product-v2 .AOV-Offer__BasePrice, .product-v2 .Avada-Offer__PriceDiscount, .product-v2 .Avada-Offer__PriceDefault, .product-v2 .avada-savings-line strong'
    ).forEach(function(el) {
      el.childNodes.forEach(function(node) {
        if (node.nodeType === 3) {
          var t = node.textContent;
          var fixed = t.replace(/€\s*/g, '').replace(/(\d+)\.(\d{2})/g, '$1,$2');
          if (fixed !== t) node.textContent = fixed;
        }
      });
      /* Mark as fixed so CSS can reveal it */
      if (!el.closest('.avada-prices-ready')) {
        var body = el.closest('.Avada-Volume__Body, .AOV-Offer__Body');
        if (body) body.classList.add('avada-prices-ready');
      }
    });
  }

  function getActiveImageSrc() {
    // Get the currently active (visible) product image for the selected variant
    var activeItem = document.querySelector('.product-v2 .product__media-item.is-active img');
    if (!activeItem) activeItem = document.querySelector('.product-v2 .product__media-item:not([style*="display: none"]) img');
    if (!activeItem) activeItem = document.querySelector('.product-v2 .product__media-item img');
    if (!activeItem) return null;
    var src = activeItem.currentSrc || activeItem.src;
    if (src.indexOf('width=') !== -1) {
      src = src.replace(/width=\d+/, 'width=80');
    }
    return src;
  }

  function injectImageStacks(root) {
    var items = (root || document).querySelectorAll('.product-v2 .Avada-Volume__Item');
    if (!items.length) return;

    var imgSrc = getActiveImageSrc();
    if (!imgSrc) return;

    items.forEach(function(item) {
      // Skip if already injected
      if (item.querySelector('.avada-img-stack')) return;

      // Determine how many images to show based on tier quantity. Tiers
      // phrased as "3 + 1 free" need TWO counts (3 bought + 1 free) shown
      // as two separate groups with a "+" between them, matching the
      // text exactly — a plain digit match would only see the "3" and
      // miss the free item entirely.
      var qtyEl = item.querySelector('.Avada-Volume__Info--TriggerQty');
      var qtyText = qtyEl ? qtyEl.textContent.trim() : '';
      var plusMatch = qtyText.match(/(\d+)\s*\+\s*(\d+)/);
      var buyCount, freeCount;
      if (plusMatch) {
        buyCount = Math.min(parseInt(plusMatch[1], 10), 5);
        freeCount = Math.min(parseInt(plusMatch[2], 10), 5);
      } else {
        var singleMatch = qtyText.match(/(\d+)/);
        buyCount = singleMatch ? Math.min(parseInt(singleMatch[1], 10), 5) : 1;
        freeCount = 0;
      }

      function makeImg(overlap) {
        var img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '';
        img.loading = 'lazy';
        img.className = 'avada-img-stack__img';
        if (overlap) img.style.marginLeft = '-10px';
        return img;
      }

      // Create the image stack container
      var stack = document.createElement('div');
      stack.className = 'avada-img-stack';

      for (var i = 0; i < buyCount; i++) {
        stack.appendChild(makeImg(i > 0));
      }

      if (freeCount > 0) {
        var plusSign = document.createElement('span');
        plusSign.className = 'avada-img-stack__plus';
        plusSign.textContent = '+';
        stack.appendChild(plusSign);
        for (var j = 0; j < freeCount; j++) {
          stack.appendChild(makeImg(j > 0));
        }
      }

      // Insert after the info section, before the price
      var content = item.querySelector('.Avada-Volume__Content');
      var info = item.querySelector('.Avada-Volume__Info');
      if (content && info) {
        info.parentNode.insertBefore(stack, info.nextSibling);
      }
    });
  }

  function updateImageStacks() {
    var imgSrc = getActiveImageSrc();
    if (!imgSrc) return;
    document.querySelectorAll('.product-v2 .avada-img-stack__img').forEach(function(img) {
      img.src = imgSrc;
    });
  }

  function injectRadioDots(root) {
    var items = (root || document).querySelectorAll('.product-v2 .Avada-Volume__Item');
    if (!items.length) return;

    items.forEach(function(item) {
      // Skip if already injected
      if (item.querySelector('.avada-radio-dot')) return;

      var content = item.querySelector('.Avada-Volume__Content, .Avada-Volume__Content--Horizontal');
      if (!content) return;

      var dot = document.createElement('div');
      dot.className = 'avada-radio-dot';
      // Insert as first child of content
      content.insertBefore(dot, content.firstChild);
    });
  }

  function fixBadgeText() {
    document.querySelectorAll('.product-v2 .Avada-VolumeBoxBadge').forEach(function(badge) {
      if (badge.dataset.enhanced) return;
      badge.dataset.enhanced = '1';
      badge.textContent = 'UCI Warehouse Clearance - + 1 free';
    });
  }

  function enhanceTierLabels() {
    var isNl = window.location.pathname.indexOf('/nl') !== -1;
    var items = document.querySelectorAll('.product-v2 .Avada-Volume__Item');
    if (!items.length) return;

    items.forEach(function(item) {
      var qtyEl = item.querySelector('.Avada-Volume__Info--TriggerQty');
      var discountTextEl = item.querySelector('.Avada-Volume__DiscountText');
      var discountPrice = item.querySelector('.Avada-Offer__PriceDiscount');
      var originalPrice = item.querySelector('.Avada-Offer__PriceDefault');
      var priceArea = item.querySelector('.Avada-Offer__Price');

      if (!qtyEl) return;
      var qtyText = qtyEl.textContent.trim();
      var qtyMatch = qtyText.match(/(\d+)/);
      var qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      if (qty === 1) {
        if (discountTextEl && discountPrice && originalPrice) {
          var dp1 = parseFloat(discountPrice.textContent.replace(/[^\d,.]/g, '').replace(',', '.'));
          var op1 = parseFloat(originalPrice.textContent.replace(/[^\d,.]/g, '').replace(',', '.'));
          if (op1 > dp1) {
            var saved1 = (op1 - dp1).toFixed(2).replace('.', ',');
            var saleText = isNl ? '— Bespaar €' + saved1 : '— Save €' + saved1;
            if (discountTextEl.textContent.trim() !== saleText) {
              discountTextEl.textContent = saleText;
              discountTextEl.style.color = '#e45b30';
              discountTextEl.style.fontSize = '12px';
            }
            originalPrice.style.setProperty('display', 'block', 'important');
          } else {
            var stdText = isNl ? '— Standaardprijs' : '— Standard price';
            if (discountTextEl.textContent.trim() !== stdText) {
              discountTextEl.textContent = stdText;
              discountTextEl.style.color = '#888';
              discountTextEl.style.fontSize = '12px';
            }
          }
        }
      } else if (qty > 1 && discountPrice) {
        // Multi-pair: add /pair label via UnitPriceLabel span (survives Avada re-renders)
        var unitLabel = discountPrice.querySelector('.AOV-Offer__UnitPriceLabel');
        var pairText = isNl ? ' /paar' : ' /pair';
        if (unitLabel && unitLabel.textContent !== pairText) {
          unitLabel.textContent = pairText;
          unitLabel.className += ' avada-per-pair';
        }

        if (originalPrice) {
          originalPrice.style.setProperty('display', 'block', 'important');
        }

        // Calculate and show savings inside the price column (only inject once)
        if (originalPrice && !priceArea.querySelector('.avada-savings-line')) {
          var dp = parseFloat(discountPrice.textContent.replace(',', '.'));
          var op = parseFloat(originalPrice.textContent.replace(',', '.'));
          var totalSaved = (op - dp);
          if (totalSaved > 0) {
            var savingsEl = document.createElement('div');
            savingsEl.className = 'avada-savings-line';
            var savingsFormatted = totalSaved.toFixed(2).replace('.', ',');
            savingsEl.innerHTML = isNl
              ? 'Je bespaart <strong>€' + savingsFormatted + '</strong>'
              : 'You save <strong>€' + savingsFormatted + '</strong>';
            priceArea.appendChild(savingsEl);
          }
        }
      }
    });
  }

  /**
   * Force the "low stock" badge to always show (with generic, no-quantity
   * text) whenever the AOV "Buy More Save More" widget is active on this
   * product — regardless of real inventory level. The inline updateStock()
   * script in main-product-v2.liquid re-hides the badge on every variant
   * change when the real stock isn't low, so this must re-run AFTER that
   * script on every variant change too, not just once on load.
   */
  function forceStockBadgeForAov() {
    var aovActive = !!document.querySelector('.product-v2 .Avada-Volume__Item');
    if (!aovActive) return;
    var badge = document.querySelector('.product-v2 .product-v2__low-stock');
    if (!badge) return;
    var textEl = badge.querySelector('span[id^="low-stock-text-"]') || badge.querySelector('span');
    var genericText = badge.getAttribute('data-low-stock-generic');
    if (textEl && genericText) textEl.textContent = genericText;
    badge.style.display = 'flex';
  }

  function enhance() {
    fixAvadaPrices();
    injectRadioDots();
    injectImageStacks();
    fixBadgeText();
    enhanceTierLabels();
    forceStockBadgeForAov();
  }

  function needsEnhancement() {
    var items = document.querySelectorAll('.product-v2 .Avada-Volume__Item');
    if (!items.length) return false;
    // Check if any item is missing our injections
    for (var i = 0; i < items.length; i++) {
      if (!items[i].querySelector('.avada-radio-dot')) return true;
    }
    return false;
  }

  function init() {
    enhance();
    var container = document.querySelector('.product-v2');
    if (!container) return;

    /*
     * Poll instead of MutationObserver to avoid infinite loop.
     * Avada's own MutationObserver re-renders its tiles when we inject
     * elements, which would trigger our observer → enhance() → Avada
     * re-renders → observer → enhance() → infinite loop.
     * Polling every 800ms is safe and still feels responsive.
     */
    setInterval(function() {
      if (needsEnhancement()) enhance();
    }, 800);

    /* On variant change: fix Avada prices immediately + staggered delays to catch re-renders.
       forceStockBadgeForAov() runs on the same staggered delays, AFTER the
       inline updateStock() script in main-product-v2.liquid (which re-hides
       the badge for variants that aren't genuinely low-stock) so the forced
       generic text always wins the race, on every variant change. */
    var variantRadios = container.querySelector('variant-radios');
    if (variantRadios) {
      variantRadios.addEventListener('change', function() {
        fixAvadaPrices();
        setTimeout(function() { fixAvadaPrices(); updateImageStacks(); forceStockBadgeForAov(); }, 50);
        setTimeout(fixAvadaPrices, 150);
        setTimeout(function() { fixAvadaPrices(); forceStockBadgeForAov(); }, 300);
        setTimeout(fixAvadaPrices, 600);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
