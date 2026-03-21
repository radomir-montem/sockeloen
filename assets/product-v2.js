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
      this.modal = this.querySelector('.product-v2-size-modal');
      this.confirmBtn = this.querySelector('.product-v2-size-modal__confirm');
      this.changeBtn = this.querySelector('.product-v2-size-modal__change');
      this.backdrop = this.querySelector('.product-v2-size-modal__backdrop');
      this.selectionDisplay = this.querySelector('.product-v2-size-modal__selection');

      if (!this.atcButton) return;

      // Detect if product has a size option (more than 1 value)
      this.hasSizeOption = this._detectSizeOption();

      // Find the real ATC button in the product form
      const realAtcBtn = document.querySelector('.product-v2 product-form button[name="add"]');
      const observeTarget = realAtcBtn || this.productSection;
      if (!observeTarget) return;

      // Show sticky bar when real ATC button scrolls out of viewport
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
      const sizeFieldsets = form.querySelectorAll('.product-form__input');
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
