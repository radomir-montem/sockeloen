if (!customElements.get('custom-quick-add')) {
    customElements.define(
      'custom-quick-add',
      class CustomquickAdd extends HTMLElement {
        constructor() {
            super()
            this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer')
            this.querySelectorAll('.cqa-add-to-cart').forEach(item=>{
                item.addEventListener('click', this.addToCart.bind(this));
            })
        }

        addToCart(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            const id = evt.currentTarget.dataset.id;
            const url = evt.currentTarget.dataset.url;
        
            const formData = {
                'id': Number(id),
                'quantity': 1,
                'sections': ['cart-drawer','cart-icon-bubble'],
                'sections_url': url
            };
        
            const config = fetchConfig('javascript');
            config.headers['X-Requested-With'] = 'XMLHttpRequest';
            config.headers['Content-Type'] = 'application/json'; // Set Content-Type
            config.body = JSON.stringify(formData);
        
            fetch(`${routes.cart_add_url}`, config)
            .then(response => {
                return response.json();
            })
            .then(response => {
                if (!this.cart) {
                    window.location = window.routes.cart_url;
                    return;
                }
                this.cart.renderContents(response);
            })
            .catch(function(err) {
                console.error(err);
            });
        }
        
      },
    )
}