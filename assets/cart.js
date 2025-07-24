class CartRemoveButton extends HTMLElement {
  constructor() {
    super()
    this.addEventListener('click', event => {
      event.preventDefault()
      const cartItems = this.closest('cart-items') ?? this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0)
    })
  }
}

customElements.define('cart-remove-button', CartRemoveButton)

class CartItems extends HTMLElement {
  constructor() {
    super()

    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') ||
      document.getElementById('CartDrawer-LineItemStatus')

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]')).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0,
    )

    this.debouncedOnChange = debounce(event => {
      this.onChange(event)
    }, 300)

    this.addEventListener('change', this.debouncedOnChange.bind(this))
  }

  onChange(event) {

    const target = event.target

    if(target.hasAttribute('update-variant-id')) return;

    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement.getAttribute('name'),
    )

  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ]
  }

  updateQuantity(line, quantity, name) {
    
    this.enableLoading(line)

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map(section => section.section),
      sections_url: window.location.pathname,
    })

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then(response => {
        return response.text()
      })
      .then(state => {
        
        window.fetch_upsells && window.fetch_upsells()

        const parsedState = JSON.parse(state)
        this.classList.toggle('is-empty', parsedState.item_count === 0)
        const cartDrawerWrapper = document.querySelector('cart-drawer')
        const cartFooter = document.getElementById('main-cart-footer')

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0)
        if (cartDrawerWrapper)
          cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0)

        this.getSectionsToRender().forEach(section => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) ||
            document.getElementById(section.id)
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector,
          )
        })

        this.updateLiveRegions(line, parsedState.item_count)
        const lineItem =
          document.getElementById(`CartItem-${line}`) ||
          document.getElementById(`CartDrawer-Item-${line}`)
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus()
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper.querySelector('.drawer__inner-empty'),
            cartDrawerWrapper.querySelector('a'),
          )
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'))
        }
        // this.updateProgressBar(parsedState.total_price)
        this.disableLoading()
      })
      .catch(err => {
        console.error(err)
        this.querySelectorAll('.loading-overlay').forEach(overlay =>
          overlay.classList.add('hidden'),
        )
        const errors =
          document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors')
        errors.textContent = window.cartStrings.error
        this.disableLoading()
      })
  }

  updateProgressBar(finalPrice) {
    

    const freeShipContainer = document.querySelectorAll('.free_shipping_container')

    if (freeShipContainer) {
      freeShipContainer.forEach(container => {
        const freeShipping = container.querySelector('.free_shipping')
        const limit_price = freeShipping.dataset.limit
        const free_prev_text = container.querySelector('.free_shipping_prev_text')
        const free_text = container.querySelector('.free_shipping_text')
        const progressBar = container.querySelector('.progressive_bar_shipping_price')
        const its_free = document.querySelector('#its_free')
        const span_free = its_free.parentElement.querySelector('.money')
        if (finalPrice >= limit_price * 100) {
          span_free.classList.add('!line-through')
          its_free.classList.remove('hidden')
          // freeShipping.classList.add('!hidden')
          free_prev_text.classList.add('hidden')
          free_text.classList.add('ml-0')
          free_text.textContent = 'Your order is ready for free shipping!'
          progressBar.classList.remove('bg-[#c0533f]')
          progressBar.classList.add('bg-green')
          progressBar.style.width = `${(finalPrice / (limit_price * 100)) * 100}%`
          // freeShipping.innerHTML = formatMoney(limit_price*100 - finalPrice, )
          freeShipping.innerHTML = ''
        } else {
          span_free.classList.remove('!line-through')
          its_free.classList.add('hidden')
          free_prev_text.classList.remove('hidden')
          free_text.classList.remove('ml-0')
          freeShipping.classList.remove('!hidden')
          progressBar.classList.remove('bg-green')
          progressBar.classList.add('bg-[#c0533f]')
          free_text.innerHTML =
            "away from <span class='font-bold text-black uppercase'>free shipping!</span>"
          container.querySelector('.progressive_bar_shipping_price').style.width = `${
            (finalPrice / (limit_price * 100)) * 100
          }%`
          freeShipping.innerHTML = ((limit_price * 100 - finalPrice) / 100).toLocaleString(
            'en-UK',
            {
              style: 'currency',
              currency: 'EUR',
            },
          )
        }
      })
    }
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) ||
        document.getElementById(`CartDrawer-LineItemError-${line}`)
      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`)
      lineItemError.querySelector('.cart-item__error-text').innerHTML =
        window.cartStrings.quantityError.replace('[quantity]', quantityElement.value)
    }

    this.currentItemCount = itemCount
    this.lineItemStatusElement.setAttribute('aria-hidden', true)

    const cartStatus =
      document.getElementById('cart-live-region-text') ||
      document.getElementById('CartDrawer-LiveRegionText')
    cartStatus.setAttribute('aria-hidden', false)

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true)
    }, 1000)
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML
  }

  enableLoading(line) {
    const mainCartItems =
      document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems')
    mainCartItems.classList.add('cart__items--disabled')

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`)
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`,
    )

    ;[...cartItemElements, ...cartDrawerItemElements].forEach(overlay =>
      overlay.classList.remove('hidden'),
    )

    document.activeElement.blur()
    this.lineItemStatusElement.setAttribute('aria-hidden', false)
  }

  disableLoading() {
    const mainCartItems =
      document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems')
    mainCartItems.classList.remove('cart__items--disabled')
  }
}

customElements.define('cart-items', CartItems)

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super()
        this.addEventListener(
          'change',
          debounce(event => {
            const body = JSON.stringify({ note: event.target.value })
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
          }, 300),
        )
      }
    },
  )
}
