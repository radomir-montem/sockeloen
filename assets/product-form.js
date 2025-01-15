if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super()

        this.form = this.querySelector('form')
        this.form.querySelector('[name=id]').disabled = false
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this))
        this.cart =
          document.querySelector('cart-notification') || document.querySelector('cart-drawer')
        this.submitButton = this.querySelector('[type="submit"]')
        if (document.querySelector('cart-drawer'))
          this.submitButton.setAttribute('aria-haspopup', 'dialog')
      }

      onSubmitHandler(evt) {
        evt.preventDefault()

        if (this.submitButton.getAttribute('aria-disabled') === 'true') return

        this.handleErrorMessage()

        this.submitButton.setAttribute('aria-disabled', true)
        this.submitButton.classList.add('loading')
        if (this.querySelector('.loading-overlay__spinner')) {
          this.querySelector('.loading-overlay__spinner').classList.remove('hidden')
        }

        const config = fetchConfig('javascript')
        config.headers['X-Requested-With'] = 'XMLHttpRequest'
        delete config.headers['Content-Type']

        const formData = new FormData(this.form)
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map(section => section.id),
          )
          formData.append('sections_url', window.location.pathname)
          this.cart.setActiveElement(document.activeElement)
        }
        config.body = formData

        fetch(`${routes.cart_add_url}`, config)
          .then(response => response.json())
          .then(response => {
            this.getFinalPrice()
            if (response.status) {
              this.handleErrorMessage(response.description)

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message')
              if (!soldOutMessage) return
              this.submitButton.setAttribute('aria-disabled', true)
              this.submitButton.disabled = true
              this.submitButton.querySelector('span').classList.add('hidden')
              soldOutMessage.classList.remove('hidden')
              this.error = true
              throw new Error(response)
            } else if (!this.cart) {
              window.location = window.routes.cart_url
              return
            }

            this.error = false
            const quickAddModal = this.closest('quick-add-modal')
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response)
                  })
                },
                { once: true },
              )
              quickAddModal.hide(true)
            } else {
              this.cart.renderContents(response)
            }
          })
          .catch(e => {
            console.error(e)
          })
          .finally(() => {
            this.submitButton.classList.remove('loading')
            if (!this.error) {
              fetch_upsells()
            }
            if (this.cart && this.cart.classList.contains('is-empty'))
              this.cart.classList.remove('is-empty')
            if (!this.error) this.submitButton.removeAttribute('aria-disabled')
            if (this.querySelector('.loading-overlay__spinner')) {
              this.querySelector('.loading-overlay__spinner').classList.add('hidden')
            }
          })
      }

      getFinalPrice() {
        fetch('/cart.json')
          .then(res => res.json())
          .then(res => {
            this.updateProgressBar(res.total_price)
          })
          .catch(err => console.error(err))
      }
      updateProgressBar(finalPrice) {
        const freeShipContainer = document.querySelectorAll('.free_shipping_container')

        if (freeShipContainer) {
          freeShipContainer.forEach(container => {
            const freeShipping = container.querySelector('.free_shipping')
            const limit_price = freeShipping.dataset.limit
            const progressBar = container.querySelector('.progressive_bar_shipping_price')
            const free_prev_text = container.querySelector('.free_shipping_prev_text')
            const free_text = container.querySelector('.free_shipping_text')
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
              free_text.innerHTML =
                "away from <span class='font-bold text-black uppercase'>free shipping!</span>"
              container.querySelector('.progressive_bar_shipping_price').style.width = `${
                (finalPrice / (limit_price * 100)) * 100
              }%`
              freeShipping.innerHTML = ((limit_price * 100 - finalPrice) / 100).toLocaleString(
                'en-GB',
                {
                style: 'currency',
                currency: 'EUR',
                },
              )
            }
          })
        }
      }

      handleErrorMessage(errorMessage = false) {
        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper')
        if (!this.errorMessageWrapper) return
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector('.product-form__error-message')

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage)

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage
        }
      }
    },
  )
}

async function fetch_upsells() {
  try {
    const request = await fetch(window.location.href)
    const response = await request.text()
    const innerHTML = new DOMParser().parseFromString(response, 'text/html')

    const new_upsell_list = innerHTML.querySelector('.upsell_list')
    const actual_upsell_list = document.querySelector('.upsell_list')
    actual_upsell_list.innerHTML = new_upsell_list.innerHTML

    const upsells = actual_upsell_list.querySelectorAll('li')
    const upsells_length = Array.from(upsells).length

    const upsells_container = document.querySelector('.upsells_container')

    if (upsells_length == 0) {
      upsells_container.classList.add('!hidden')
    } else {
      upsells_container.classList.remove('!hidden')
    }
  } catch (error) {
    console.log(error)
  }
}

window.fetch_upsells = fetch_upsells
