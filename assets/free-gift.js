;(function () {
  function getRewardContainer() {
    return document.querySelector('.free_shipping_container[data-has-free-gift="true"]')
  }

  function findGiftLine() {
    return document.querySelector('[data-free-gift-line="true"]')
  }

  function isStandaloneCartPage() {
    return !!document.getElementById('main-cart-items')
  }

  function showRemovedNotice() {
    document.querySelectorAll('[data-free-gift-removed-notice]').forEach(el => {
      el.classList.remove('hidden')
    })
  }

  function autoRemoveIfBelowThreshold() {
    const container = getRewardContainer()
    if (!container) return

    const total = parseInt(container.dataset.total, 10)
    const giftLimit = parseInt(container.dataset.giftLimit, 10) * 100
    if (isNaN(total) || isNaN(giftLimit) || total >= giftLimit) return

    const giftLine = findGiftLine()
    if (!giftLine) return

    const line = giftLine.dataset.line
    if (!line) return

    if (isStandaloneCartPage()) {
      fetch(`${window.routes.cart_change_url}`, {
        ...fetchConfig(),
        body: JSON.stringify({ line, quantity: 0 }),
      })
        .then(() => window.location.reload())
        .catch(err => console.error(err))
      return
    }

    const cartDrawer = document.querySelector('cart-drawer')
    const sections = cartDrawer ? cartDrawer.getSectionsToRender().map(section => section.id) : []

    fetch(`${window.routes.cart_change_url}`, {
      ...fetchConfig(),
      body: JSON.stringify({ line, quantity: 0, sections: sections.join(',') }),
    })
      .then(res => res.json())
      .then(response => {
        if (cartDrawer) cartDrawer.renderContents(response)
        showRemovedNotice()
      })
      .catch(err => console.error(err))
  }

  function addGift(variantId, button) {
    const cartDrawer = document.querySelector('cart-drawer')
    const onCartPage = isStandaloneCartPage()
    if (button) {
      button.disabled = true
      button.classList.add('loading')
    }

    const existingGift = findGiftLine()
    const removeExisting =
      existingGift && existingGift.dataset.variantId !== String(variantId)
        ? fetch(`${window.routes.cart_change_url}`, {
            ...fetchConfig(),
            body: JSON.stringify({ line: existingGift.dataset.line, quantity: 0 }),
          })
        : Promise.resolve()

    removeExisting
      .then(() => {
        const formData = new FormData()
        formData.append('id', variantId)
        formData.append('quantity', 1)
        formData.append('properties[_free_gift]', 'true')
        if (cartDrawer && !onCartPage) {
          formData.append('sections', cartDrawer.getSectionsToRender().map(section => section.id))
          formData.append('sections_url', window.location.pathname)
        }

        const config = fetchConfig('javascript')
        config.headers['X-Requested-With'] = 'XMLHttpRequest'
        delete config.headers['Content-Type']
        config.body = formData

        return fetch(`${window.routes.cart_add_url}`, config)
      })
      .then(response => response.json())
      .then(response => {
        if (onCartPage) {
          window.location.reload()
        } else if (cartDrawer) {
          cartDrawer.renderContents(response)
        }
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (button) {
          button.disabled = false
          button.classList.remove('loading')
        }
      })
  }

  document.addEventListener('click', event => {
    const addBtn = event.target.closest('[data-free-gift-add]')
    if (!addBtn || addBtn.disabled) return
    event.preventDefault()
    addGift(addBtn.dataset.variantId, addBtn)
  })

  const observerTarget = document.getElementById('CartDrawer')
  if (observerTarget && window.MutationObserver) {
    let debounceTimer
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(autoRemoveIfBelowThreshold, 150)
    })
    observer.observe(observerTarget, { childList: true, subtree: true })
    autoRemoveIfBelowThreshold()
  }
})()
