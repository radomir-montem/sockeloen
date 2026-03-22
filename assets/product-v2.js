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

/* Avada Volume Discount enhancements: strip € symbol + inject product image stack */
(function() {
  function stripEuro(root) {
    (root || document).querySelectorAll(
      '.product-v2 .AOV-Offer__DiscountPrice, .product-v2 .AOV-Offer__BasePrice, .product-v2 .Avada-Offer__PriceDiscount, .product-v2 .Avada-Offer__PriceDefault'
    ).forEach(function(el) {
      el.childNodes.forEach(function(node) {
        if (node.nodeType === 3 && node.textContent.includes('€')) {
          node.textContent = node.textContent.replace(/€/g, '');
        }
      });
      if (el.children.length === 0 && el.textContent.includes('€')) {
        el.textContent = el.textContent.replace(/€/g, '');
      }
    });
  }

  function injectImageStacks(root) {
    var items = (root || document).querySelectorAll('.product-v2 .Avada-Volume__Item');
    if (!items.length) return;

    // Get first product image src (transparent bg)
    var firstImg = document.querySelector('.product-v2 .product__media-item img');
    if (!firstImg) return;
    var imgSrc = firstImg.currentSrc || firstImg.src;
    // Request a small version
    if (imgSrc.indexOf('width=') !== -1) {
      imgSrc = imgSrc.replace(/width=\d+/, 'width=80');
    }

    items.forEach(function(item) {
      // Skip if already injected
      if (item.querySelector('.avada-img-stack')) return;

      // Determine how many images to show based on tier quantity
      var qtyEl = item.querySelector('.Avada-Volume__Info--TriggerQty');
      var qtyText = qtyEl ? qtyEl.textContent.trim() : '';
      var count = 1;
      var match = qtyText.match(/(\d+)/);
      if (match) count = Math.min(parseInt(match[1], 10), 5);

      // Create the image stack container
      var stack = document.createElement('div');
      stack.className = 'avada-img-stack';

      for (var i = 0; i < count; i++) {
        var img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '';
        img.loading = 'lazy';
        img.className = 'avada-img-stack__img';
        if (i > 0) img.style.marginLeft = '-10px';
        stack.appendChild(img);
      }

      // Insert after the info section, before the price
      var content = item.querySelector('.Avada-Volume__Content');
      var info = item.querySelector('.Avada-Volume__Info');
      if (content && info) {
        info.parentNode.insertBefore(stack, info.nextSibling);
      }
    });
  }

  function enhance() {
    stripEuro();
    injectImageStacks();
  }

  function init() {
    enhance();
    var container = document.querySelector('.product-v2');
    if (!container) return;
    new MutationObserver(function() { enhance(); })
      .observe(container, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
