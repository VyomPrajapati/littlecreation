// =============================================================
// Little Creation Theme – Global JS v4.0
// =============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Scroll Animations (IntersectionObserver) ----
  const initScrollAnimations = () => {
    const elems = document.querySelectorAll('.animate-on-scroll');
    if (!elems.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -50px 0px', threshold: 0.05 });
    elems.forEach(el => observer.observe(el));
  };

  // ---- Mouse Drag-to-Scroll for Horizontal Carousels ----
  const initDragToScroll = () => {
    const sliders = document.querySelectorAll('.features-grid__wrapper, .reviews-grid, .staggered-collections__grid, .spotlight-grid__secondary, .featured-collection__grid');
    sliders.forEach(slider => {
      let isDown = false, startX, scrollLeft;
      slider.addEventListener('mousedown', (e) => { isDown = true; slider.classList.add('is-dragging'); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
      slider.addEventListener('mouseleave', () => { isDown = false; slider.classList.remove('is-dragging'); });
      slider.addEventListener('mouseup', () => { isDown = false; slider.classList.remove('is-dragging'); });
      slider.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); slider.scrollLeft = scrollLeft - (e.pageX - slider.offsetLeft - startX) * 2; });
    });
  };

  // ---- Cart Utilities ----
  const CartDrawer = window.CartDrawer = {
    drawer: document.querySelector('[data-cart-drawer]'),
    body: document.getElementById('CartDrawerBody'),
    footer: document.getElementById('CartDrawerFooter'),
    subtotal: document.getElementById('CartDrawerSubtotal'),
    countEl: document.getElementById('CartDrawerCount'),

    open() {
      if (!this.drawer) return;
      this.drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    },
    close() {
      if (!this.drawer) return;
      this.drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    },

    // Fetch fresh cart HTML via Section Rendering API and inject it
    async refresh() {
      if (this.body) this.body.classList.add('is-loading');
      try {
        const [cartRes, sectionRes] = await Promise.all([
          fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
          fetch('/?sections=cart-drawer-section', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        ]);
        const cart = await cartRes.json();
        const sections = await sectionRes.json();

        // Update body HTML
        if (this.body && sections['cart-drawer-section']) {
          this.body.innerHTML = sections['cart-drawer-section'];
          this.body.classList.remove('is-loading');
          this.bindItemControls();
        }

        // Update subtotal
        if (this.subtotal) this.subtotal.textContent = this.formatMoney(cart.total_price);

        // Show/hide footer
        if (this.footer) this.footer.style.display = cart.item_count > 0 ? 'block' : 'none';

        // Update count in header
        this.updateCount(cart.item_count);

      } catch(e) {
        if (this.body) this.body.classList.remove('is-loading');
        console.error('Cart refresh failed', e);
      }
    },

    updateCount(count) {
      if (this.countEl) this.countEl.textContent = count > 0 ? `(${count})` : '';
      document.querySelectorAll('.header__cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    },

    formatMoney(cents) {
      return '£' + (cents / 100).toFixed(2);
    },

    async changeLineQty(line, quantity) {
      try {
        await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ line, quantity })
        });
        await this.refresh();
      } catch(e) { console.error(e); }
    },

    // Wire up qty +/- and remove buttons inside the drawer
    bindItemControls() {
      this.body.querySelectorAll('.cart-item-qty').forEach(qtyEl => {
        const line = parseInt(qtyEl.dataset.line);
        const valEl = qtyEl.querySelector('.cart-item-qty__val');

        qtyEl.querySelectorAll('[data-qty-change]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const currentQty = parseInt(valEl.textContent);
            const delta = parseInt(btn.dataset.qtyChange);
            const newQty = Math.max(0, currentQty + delta);
            await this.changeLineQty(line, newQty);
          });
        });
      });

      this.body.querySelectorAll('[data-remove-line]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const line = parseInt(btn.dataset.removeLine);
          await this.changeLineQty(line, 0);
        });
      });
    }
  };

  // ---- Cart Drawer Toggle ----
  const initCartDrawer = () => {
    document.querySelectorAll('[data-cart-toggle]').forEach(t => {
      t.addEventListener('click', e => { e.preventDefault(); CartDrawer.open(); CartDrawer.refresh(); });
    });
    document.querySelectorAll('[data-close-cart]').forEach(c => {
      c.addEventListener('click', e => { e.preventDefault(); CartDrawer.close(); });
    });
    // Close on Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape') CartDrawer.close(); });
  };

  // ---- AJAX Add to Cart (product page form) ----
  const initAjaxCart = () => {
    document.querySelectorAll('form[action="/cart/add"]').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('[type="submit"]');
        const originalHTML = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<span>Adding…</span>'; }

        try {
          const giftCheckbox = form.querySelector('.gifting-checkbox');
          if (giftCheckbox && giftCheckbox.checked) {
            const formData = new FormData(form);
            const mainVariantId = formData.get('id');
            const qty = parseInt(formData.get('quantity') || 1);

            let giftVariantId = form.querySelector('[data-gift-variant-id]')?.dataset?.giftVariantId;
            if (!giftVariantId || giftVariantId === '') {
              try {
                const giftRes = await fetch('/products/customised-gift-box.js');
                if (giftRes.ok) {
                  const giftData = await giftRes.json();
                  if (giftData.variants && giftData.variants.length > 0) {
                    giftVariantId = giftData.variants[0].id;
                  }
                }
              } catch(e) {}
            }

            const mainProperties = {};
            for (let [key, val] of formData.entries()) {
              if (key.startsWith('properties[')) {
                const propName = key.replace('properties[', '').replace(']', '');
                if (val) mainProperties[propName] = val;
              }
            }

            const itemsPayload = [
              {
                id: parseInt(mainVariantId),
                quantity: qty,
                properties: mainProperties
              }
            ];

            if (giftVariantId) {
              itemsPayload.push({
                id: parseInt(giftVariantId),
                quantity: 1
              });
            }

            const res = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
              body: JSON.stringify({ items: itemsPayload })
            });
            if (!res.ok) throw new Error('Add to cart failed');
          } else {
            const res = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
              body: new FormData(form)
            });
            if (!res.ok) throw new Error('Add to cart failed');
          }
          await CartDrawer.refresh();
          CartDrawer.open();
        } catch(err) {
          window.location.href = '/cart';
        } finally {
          if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
        }
      });
    });
  };

  // ---- Quick-Add from product cards ----
  const initQuickAdd = () => {
    document.querySelectorAll('[data-quick-add]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const variantId = btn.dataset.variantId;
        if (!variantId) return;
        btn.disabled = true;

        try {
          const res = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ id: parseInt(variantId), quantity: 1 })
          });
          if (!res.ok) throw new Error('Add failed');
          await CartDrawer.refresh();
          CartDrawer.open();
        } catch(err) {
          window.location.href = '/cart';
        } finally {
          btn.disabled = false;
        }
      });
    });
  };

  // ---- Custom Variant Radios web component ----
  if (!customElements.get('variant-radios')) {
    class VariantRadios extends HTMLElement {
      constructor() {
        super();
        this.addEventListener('change', this.onVariantChange.bind(this));
      }
      onVariantChange() {
        const form = this.closest('form') || document.getElementById('product-form-' + this.dataset.section);
        if (!form) return;
        // Update the hidden variant ID input
        const selected = Array.from(this.querySelectorAll('input[type="radio"]:checked')).map(i => i.value);
        fetch(this.dataset.url + '.js')
          .then(r => r.json())
          .then(product => {
            const variant = product.variants.find(v =>
              v.options.every((opt, i) => opt === selected[i])
            );
            if (variant) {
              const input = form.querySelector('input[name="id"]');
              if (input) input.value = variant.id;
              // Update Add to Bag button state
              const btn = form.querySelector('[type="submit"]');
              if (btn) {
                btn.disabled = !variant.available;
                btn.querySelector('span').textContent = variant.available ? 'Add to Bag' : 'Sold Out';
              }
              // Update price display
              const priceEl = document.getElementById('price-' + this.dataset.section);
              if (priceEl && variant.price) {
                const sale = priceEl.querySelector('.price-item--sale');
                const regular = priceEl.querySelector('.price-item--regular');
                const badge = priceEl.querySelector('.price__badge--sale');
                if (variant.compare_at_price && variant.compare_at_price > variant.price) {
                  if (regular) regular.textContent = '£' + (variant.compare_at_price/100).toFixed(2);
                  if (sale) sale.textContent = '£' + (variant.price/100).toFixed(2);
                  if (badge) badge.style.display = 'inline-block';
                } else {
                  if (regular) regular.textContent = '£' + (variant.price/100).toFixed(2);
                  if (sale) { sale.textContent = ''; sale.style.display = 'none'; }
                  if (badge) badge.style.display = 'none';
                }
              }
            }
          })
          .catch(() => {});
      }
    }
    customElements.define('variant-radios', VariantRadios);
  }

  // ---- Quantity Stepper (product page) ----
  document.querySelectorAll('.qty-stepper').forEach(stepper => {
    const input = stepper.querySelector('.qty-stepper__input');
    const minusBtn = stepper.querySelector('[name="minus"]');
    const plusBtn  = stepper.querySelector('[name="plus"]');
    if (!input) return;
    minusBtn && minusBtn.addEventListener('click', () => { const v = parseInt(input.value,10); if (v > 1) input.value = v - 1; });
    plusBtn  && plusBtn.addEventListener('click',  () => { input.value = parseInt(input.value,10) + 1; });
  });

  // ---- Login Popup Toggle ----
  const initLoginPopup = () => {
    const loginToggles = document.querySelectorAll('[data-login-toggle]');
    const loginPopup   = document.querySelector('[data-login-popup]');
    const closeLogins  = document.querySelectorAll('[data-close-login]');
    if (!loginPopup) return;
    const open  = () => { loginPopup.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { loginPopup.classList.remove('is-open'); document.body.style.overflow = ''; };
    loginToggles.forEach(t => t.addEventListener('click', e => {
      if (!t.getAttribute('href').includes('/account')) return;
      if (document.body.classList.contains('customer-logged-in')) return;
      e.preventDefault(); open();
    }));
    closeLogins.forEach(c => c.addEventListener('click', e => { e.preventDefault(); close(); }));
  };

  // ---- Product Gallery Thumbnails ----
  const initProductGallery = () => {
    document.querySelectorAll('.product__thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const src = btn.dataset.src;
        const mainImage = document.querySelector('.product__main-image');
        if (mainImage && src) {
          mainImage.src = src;
          // Update active state
          document.querySelectorAll('.product__thumb-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        }
      });
    });
  };

  // ---- Initialise ----
  initScrollAnimations();
  initDragToScroll();
  initCartDrawer();
  initAjaxCart();
  initQuickAdd();
  initLoginPopup();
  initProductGallery();
});
