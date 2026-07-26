// =============================================================
// Little Creation Theme – Global JS v3.0
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
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.05
    });

    elems.forEach(el => observer.observe(el));
  };

  // ---- Mouse Drag-to-Scroll for Horizontal Carousels ----
  const initDragToScroll = () => {
    const sliders = document.querySelectorAll('.features-grid__wrapper, .reviews-grid, .staggered-collections__grid, .spotlight-grid__secondary, .featured-collection__grid');

    sliders.forEach(slider => {
      let isDown = false;
      let startX;
      let scrollLeft;

      slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('is-dragging');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      });

      slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('is-dragging');
      });

      slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('is-dragging');
      });

      slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; // scroll speed multiplier
        slider.scrollLeft = scrollLeft - walk;
      });
    });
  };

  // ---- Cart Drawer Toggle ----
  const initCartDrawer = () => {
    const cartToggles = document.querySelectorAll('[data-cart-toggle]');
    const cartDrawer  = document.querySelector('[data-cart-drawer]');
    const closeCarts  = document.querySelectorAll('[data-close-cart]');

    if (!cartDrawer) return;

    const open  = () => { cartDrawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { cartDrawer.classList.remove('is-open'); document.body.style.overflow = ''; };

    cartToggles.forEach(t => t.addEventListener('click', e => { e.preventDefault(); open(); }));
    closeCarts.forEach(c  => c.addEventListener('click', e => { e.preventDefault(); close(); }));
  };

  // ---- AJAX Add to Cart (product page form) ----
  const initAjaxCart = () => {
    const forms = document.querySelectorAll('form[action="/cart/add"]');
    forms.forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<span>Adding…</span>'; }

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: new FormData(form)
        })
        .then(r => r.json())
        .then(() => {
          return fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        })
        .then(r => r.json())
        .then(cart => {
          // Update cart count badge
          document.querySelectorAll('.header__cart-count').forEach(el => {
            el.textContent = cart.item_count;
            el.style.display = cart.item_count > 0 ? 'flex' : 'none';
          });
          // Open cart drawer
          const drawer = document.querySelector('[data-cart-drawer]');
          if (drawer) { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
        })
        .catch(() => { window.location.href = '/cart'; })
        .finally(() => {
          if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
        });
      });
    });
  };

  // ---- Quick-Add from product cards ----
  const initQuickAdd = () => {
    document.querySelectorAll('[data-quick-add]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const variantId = btn.dataset.variantId;
        if (!variantId) return;
        btn.disabled = true;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ id: variantId, quantity: 1 })
        })
        .then(r => r.json())
        .then(() => fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }))
        .then(r => r.json())
        .then(cart => {
          document.querySelectorAll('.header__cart-count').forEach(el => {
            el.textContent = cart.item_count;
            el.style.display = cart.item_count > 0 ? 'flex' : 'none';
          });
          const drawer = document.querySelector('[data-cart-drawer]');
          if (drawer) { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
        })
        .catch(() => { window.location.href = '/cart'; })
        .finally(() => { btn.disabled = false; });
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
        const data = new URLSearchParams(new FormData(form));
        fetch(this.dataset.url + '.js', { method: 'POST', body: data })
          .catch(() => {});
      }
    }
    customElements.define('variant-radios', VariantRadios);
  }

  // ---- Quantity Stepper ----
  document.querySelectorAll('.qty-stepper').forEach(stepper => {
    const input    = stepper.querySelector('.qty-stepper__input');
    const minusBtn = stepper.querySelector('[name="minus"]');
    const plusBtn  = stepper.querySelector('[name="plus"]');
    if (!input) return;
    minusBtn && minusBtn.addEventListener('click', () => {
      const v = parseInt(input.value, 10);
      if (v > 1) input.value = v - 1;
    });
    plusBtn && plusBtn.addEventListener('click', () => {
      input.value = parseInt(input.value, 10) + 1;
    });
  });

  // ---- Login / Signup Popup Toggle ----
  const initLoginPopup = () => {
    const loginToggles = document.querySelectorAll('[data-login-toggle]');
    const loginPopup   = document.querySelector('[data-login-popup]');
    const closeLogins  = document.querySelectorAll('[data-close-login]');

    if (!loginPopup) return;

    const open  = () => { loginPopup.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { loginPopup.classList.remove('is-open'); document.body.style.overflow = ''; };

    loginToggles.forEach(t => t.addEventListener('click', e => {
      // If customer is not logged in, open popup modal
      if (!t.getAttribute('href').includes('/account/login') && !t.getAttribute('href').includes('/account')) return;
      if (document.body.classList.contains('customer-logged-in')) return;
      e.preventDefault();
      open();
    }));
    closeLogins.forEach(c => c.addEventListener('click', e => { e.preventDefault(); close(); }));
  };

  // ---- Initialise ----
  initScrollAnimations();
  initDragToScroll();
  initCartDrawer();
  initAjaxCart();
  initQuickAdd();
  initLoginPopup();
});
