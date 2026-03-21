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

      // Find the real ATC button in the product form
      const realAtcBtn = document.querySelector('.product-v2 product-form button[name="add"]');
      const observeTarget = realAtcBtn || this.productSection;
      if (!observeTarget) return;

      // Show sticky bar when real ATC button scrolls out of viewport
      const handleIntersection = (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            this.classList.add('show');
            this.classList.remove('hidden');
          } else {
            this.classList.remove('show');
            this.classList.add('hidden');
          }
        });
      };

      new IntersectionObserver(handleIntersection, {
        threshold: 0
      }).observe(observeTarget);

      // Event listeners
      this.atcButton.addEventListener('click', () => this.showSizeModal());

      if (this.confirmBtn) {
        this.confirmBtn.addEventListener('click', () => this.confirmAddToCart());
      }
      if (this.changeBtn) {
        this.changeBtn.addEventListener('click', () => this.scrollToVariants());
      }
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => this.hideModal());
      }
    }

    showSizeModal() {
      if (!this.modal) return;

      // Read currently selected variant options
      const form = document.querySelector('product-form form[data-type="add-to-cart-form"]');
      if (!form) {
        // Fallback: try any product-form form
        const fallbackForm = document.querySelector('product-form form');
        if (fallbackForm) {
          this._submitForm(fallbackForm);
        }
        return;
      }

      const selectedOptions = [];

      // Check radio buttons (pill-style variant picker)
      form.querySelectorAll('.product-form__input--pill').forEach((group) => {
        const legend = group.querySelector('legend, label.form__label');
        const checked = group.querySelector('input[type="radio"]:checked');
        if (legend && checked) {
          const label = legend.textContent.trim().replace(/:$/, '');
          selectedOptions.push(label + ': ' + checked.value);
        }
      });

      // Check select dropdowns (dropdown variant picker)
      if (selectedOptions.length === 0) {
        form.querySelectorAll('.product-form__input select').forEach((select) => {
          const label = select.closest('.product-form__input')?.querySelector('label');
          if (label && select.value) {
            selectedOptions.push(label.textContent.trim().replace(/:$/, '') + ': ' + select.value);
          }
        });
      }

      if (this.selectionDisplay) {
        this.selectionDisplay.textContent = selectedOptions.length
          ? selectedOptions.join('  |  ')
          : '';
      }

      this.modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    hideModal() {
      if (!this.modal) return;
      this.modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    confirmAddToCart() {
      this.hideModal();

      const form = document.querySelector('product-form form[data-type="add-to-cart-form"]')
        || document.querySelector('product-form form');

      if (form) {
        this._submitForm(form);
      }
    }

    _submitForm(form) {
      // Trigger the submit event that product-form.js listens for
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }

    scrollToVariants() {
      this.hideModal();

      const variantSelector = document.querySelector(
        '.product-v2 .product-form__input--pill, .product-v2 .product-form__input select'
      );

      if (variantSelector) {
        const target = variantSelector.closest('.product-form__input') || variantSelector;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
}
