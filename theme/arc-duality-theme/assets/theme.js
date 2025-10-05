(function () {
  const body = document.body;
  const allowDark = body.dataset.themeAllowDark === 'true';
  const autoSync = body.dataset.themeAuto === 'true';
  const defaultMode = body.dataset.theme || 'light';
  const STORAGE_KEY = 'arc-theme-mode';
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getStoredMode() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeMode(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      /* noop */
    }
  }

  function applyMode(mode) {
    if (!allowDark) {
      mode = 'light';
    }
    root.setAttribute('data-theme', mode);
    body.setAttribute('data-theme', mode);
    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-pressed', mode === 'dark');
      const label = mode === 'dark' ? toggle.dataset.labelLight : toggle.dataset.labelDark;
      if (label) {
        toggle.querySelector('[data-theme-toggle-label]').textContent = label;
      }
    }
  }

  function resolveMode() {
    if (!allowDark) {
      return 'light';
    }
    const stored = getStoredMode();
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (autoSync) {
      return prefersDark.matches ? 'dark' : 'light';
    }
    return defaultMode;
  }

  function toggleMode() {
    if (!allowDark) {
      return;
    }
    const current = root.getAttribute('data-theme') || resolveMode();
    const next = current === 'dark' ? 'light' : 'dark';
    applyMode(next);
    storeMode(next);
  }

  applyMode(resolveMode());

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.addEventListener('click', toggleMode);
      toggle.addEventListener('keydown', function (event) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          toggleMode();
        }
      });
    }

    const skip = document.querySelector('.skip-to-content');
    if (skip) {
      skip.addEventListener('click', function (event) {
        const target = document.getElementById(skip.getAttribute('href').replace('#', ''));
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: false });
        }
      });
    }

    const announcement = document.querySelector('[data-announcement]');
    if (announcement) {
      const id = announcement.dataset.announcement;
      const dismissKey = `announcement-dismissed-${id}`;
      const dismissButton = announcement.querySelector('[data-announcement-dismiss]');
      if (dismissButton) {
        try {
          if (localStorage.getItem(dismissKey)) {
            announcement.setAttribute('hidden', 'hidden');
          }
        } catch (e) {
          /* noop */
        }
        dismissButton.addEventListener('click', function () {
          announcement.setAttribute('hidden', 'hidden');
          try {
            localStorage.setItem(dismissKey, 'true');
          } catch (e) {
            /* noop */
          }
        });
      }
    }

    updateCartCount();
  });

  if (allowDark && autoSync) {
    prefersDark.addEventListener('change', function (event) {
      const stored = getStoredMode();
      if (stored === null) {
        applyMode(event.matches ? 'dark' : 'light');
      }
    });
  }

  function updateCartCount(count) {
    const cartCountElements = document.querySelectorAll('[data-cart-count]');
    if (!cartCountElements.length) return;

    let value = typeof count === 'number' ? count : null;
    if (value === null && window.Shopify && window.Shopify.theme) {
      value = window.Shopify.theme.cartCount;
    }
    cartCountElements.forEach(function (el) {
      if (value && value > 0) {
        el.textContent = value;
        el.hidden = false;
      } else {
        el.textContent = '0';
        el.hidden = true;
      }
    });
  }

  document.addEventListener('cart:refresh', function (event) {
    var detail = event && event.detail;
    var cart = detail && detail.cart;
    var count = cart ? cart.item_count : null;
    updateCartCount(count);
  });
})();
