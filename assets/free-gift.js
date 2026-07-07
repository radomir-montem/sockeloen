;(function () {
  window.__freeGiftDebug = { ran: true, log: [] }
  function debugLog() {
    window.__freeGiftDebug.log.push(Array.prototype.slice.call(arguments))
  }

  function getRewardContainer() {
    return document.querySelector('.free_shipping_container[data-has-free-gift="true"]')
  }

  function findGiftLine() {
    return document.querySelector('[data-free-gift-line="true"]')
  }

  function isStandaloneCartPage() {
    return !!document.getElementById('main-cart-items')
  }

  function refreshCartDrawer(onDone) {
    if (isStandaloneCartPage()) {
      window.location.reload()
      return
    }

    const cartDrawer = document.querySelector('cart-drawer')
    if (!cartDrawer) return
    const sections = cartDrawer.getSectionsToRender().map(section => section.id)

    fetch(`${window.routes.cart_url}.js?sections=${sections.join(',')}`)
      .then(res => res.json())
      .then(response => {
        cartDrawer.renderContents(response)
        if (typeof onDone === 'function') onDone()
      })
      .catch(err => console.error(err))
  }

  function showRemovedNotice() {
    document.querySelectorAll('[data-free-gift-removed-notice]').forEach(el => {
      el.classList.remove('hidden')
    })
  }

  function autoRemoveIfBelowThreshold() {
    debugLog('autoRemoveIfBelowThreshold called')
    const container = getRewardContainer()
    debugLog('container', !!container)
    if (!container) return

    const total = parseInt(container.dataset.total, 10)
    const giftLimit = parseInt(container.dataset.giftLimit, 10) * 100
    debugLog('total', total, 'giftLimit', giftLimit)
    if (isNaN(total) || isNaN(giftLimit) || total >= giftLimit) return

    const giftLine = findGiftLine()
    debugLog('giftLine', !!giftLine)
    if (!giftLine) return

    const line = giftLine.dataset.line
    if (!line) return

    debugLog('removing line', line)
    fetch(`${window.routes.cart_change_url}`, {
      ...fetchConfig(),
      body: JSON.stringify({ line, quantity: 0 }),
    })
      .then(res => res.json())
      .then(() => {
        debugLog('removed, refreshing')
        refreshCartDrawer(showRemovedNotice)
      })
      .catch(err => debugLog('ERROR', String(err)))
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
  debugLog('observerTarget', !!observerTarget)
  if (observerTarget && window.MutationObserver) {
    let debounceTimer
    const observer = new MutationObserver(() => {
      debugLog('mutation observed')
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(autoRemoveIfBelowThreshold, 200)
    })
    observer.observe(observerTarget, { childList: true, subtree: true })
    autoRemoveIfBelowThreshold()
  }
})()
