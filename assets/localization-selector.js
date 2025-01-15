if (!customElements.get('localization-selector')) {
    customElements.define(
      'localization-selector',
      class LocalizationSelector extends HTMLElement {
        constructor() {
          super();
          this.elements = {
            button: this.querySelector('label'),
            panel: this.querySelector('.localization-list'),
            form: this.querySelector('form')
          };
          this.elements.button.addEventListener('click', this.openSelector.bind(this));
          this.elements.button.addEventListener('focusout', this.closeSelector.bind(this));
  
          this.querySelectorAll('a').forEach((item) => item.addEventListener('click', this.onItemClick.bind(this)));
        }

        onItemClick(event) {
            event.preventDefault();
            event.stopPropagation();
            const countryCode = event.currentTarget.dataset.countryCode;
            const language = event.currentTarget.dataset.language;
            this.elements.form.querySelector('[name="country_code"]').value = countryCode;
            this.elements.form.querySelector('[name="locale_code"]').value = language;
            this.elements.form.submit();
        }

        openSelector(event) {
            event.preventDefault();
            event.stopPropagation();
            this.elements.button.focus();
            this.elements.panel.classList.toggle('hidden');
        }
    
        closeSelector(event) {
            const isChild = this.elements.panel.contains(event.relatedTarget) || this.elements.button.contains(event.relatedTarget);
            if (!event.relatedTarget || !isChild) {
                this.elements.panel.classList.add('hidden');
            }
        }
      }
    );
}