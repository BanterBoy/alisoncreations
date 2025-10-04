
(function () {
  const state = {
    productsPromise: null,
    mediaPromise: null,
    productMap: null
  };

  function handleError(err) {
    console.error(err);
    alert('Something went wrong. Please try again.');
  }

  async function loadProducts() {
    if (!state.productsPromise) {
      if (!window.ArcShopify) {
        throw new Error('ArcShopify helper not loaded');
      }
      state.productsPromise = window.ArcShopify.fetchAllProducts().then(function (products) {
        state.productMap = {};
        products.forEach(function (product) {
          state.productMap[product.handle] = product;
        });
        return products;
      });
    }
    return state.productsPromise;
  }

  async function loadMedia() {
    if (!state.mediaPromise) {
      state.mediaPromise = fetch('assets/data/product-media.json')
        .then(function (resp) {
          if (!resp.ok) {
            throw new Error('Unable to load product-media.json');
          }
          return resp.json();
        })
        .catch(function (err) {
          console.warn('Media map unavailable', err);
          return { videos: {} };
        });
    }
    return state.mediaPromise;
  }

  function derivePriceRange(product) {
    if (!product.variants || product.variants.length === 0) {
      return null;
    }
    const amounts = product.variants
      .map(function (variant) {
        return Number(variant.price ? variant.price.amount : variant.price);
      })
      .filter(function (value) {
        return !Number.isNaN(value);
      });
    if (amounts.length === 0) {
      return null;
    }
    const min = Math.min.apply(Math, amounts);
    const max = Math.max.apply(Math, amounts);
    return {
      min: min,
      max: max,
      currency: product.variants[0].price ? product.variants[0].price.currencyCode : 'USD'
    };
  }

  function extractColors(product) {
    const colors = new Set();
    if (!product.variants) {
      return colors;
    }
    product.variants.forEach(function (variant) {
      if (!variant.selectedOptions) return;
      variant.selectedOptions.forEach(function (opt) {
        if (opt.name && opt.name.toLowerCase() === 'color') {
          colors.add(opt.value);
        }
      });
    });
    return colors;
  }

  function formatPriceRange(range) {
    if (!range) {
      return 'Price on request';
    }
    const money = window.ArcShopify.formatMoney;
    if (!money) {
      return range.min === range.max ? range.min.toFixed(2) : range.min.toFixed(2) + ' - ' + range.max.toFixed(2);
    }
    if (range.min === range.max) {
      return money(range.min, range.currency);
    }
    return money(range.min, range.currency) + ' - ' + money(range.max, range.currency);
  }

  function renderProductCard(product) {
    const colors = Array.from(extractColors(product));
    const range = formatPriceRange(derivePriceRange(product));
    const primaryImage = product.featuredImage || (product.images && product.images[0]);
    const variantOptions = product.variants || [];
    var variantSelect = '';
    if (variantOptions.length > 1) {
      variantSelect = '<label class="visually-hidden" for="select-' + product.handle + '">Select variant</label>' +
        '<select data-variant-select="' + product.handle + '" id="select-' + product.handle + '">' +
        variantOptions.map(function (variant) {
          const label = variant.selectedOptions && variant.selectedOptions.length
            ? variant.selectedOptions.map(function (opt) { return opt.value; }).join(' / ')
            : variant.title;
          return '<option value="' + variant.id + '">' + label + '</option>';
        }).join('') +
        '</select>';
    }

    return [
      '<article class="product-card" data-product="' + product.handle + '">',
      primaryImage ? '<img src="' + primaryImage.url + '" alt="' + (primaryImage.altText || product.title) + '">' : '',
      '<h3>' + product.title + '</h3>',
      '<div class="price">' + range + '</div>',
      colors.length ? '<div class="badge">' + colors.join(', ') + '</div>' : '',
      variantSelect,
      '<div class="hero-cta">',
      '<button class="arc-button" data-add-to-cart="' + (variantOptions[0] ? variantOptions[0].id : '') + '">Add to Cart</button>',
      '<a class="arc-button secondary" href="product.html?handle=' + encodeURIComponent(product.handle) + '">View Details</a>',
      '</div>',
      '</article>'
    ].join('');
  }

  async function refreshCartBadge() {
    const badge = document.querySelector('[data-cart-count]');
    if (!badge || !window.ArcShopify) {
      return;
    }
    const cartId = (function () {
      try { return localStorage.getItem('arc-cart-id'); } catch (err) { return null; }
    })();
    if (!cartId) {
      badge.textContent = '0';
      return;
    }
    try {
      const cart = await window.ArcShopify.retrieveCart(cartId);
      if (!cart || !cart.lines) {
        badge.textContent = '0';
        return;
      }
      var total = 0;
      cart.lines.edges.forEach(function (edge) {
        total += edge.node.quantity;
      });
      badge.textContent = String(total);
    } catch (err) {
      console.warn('Unable to refresh cart badge', err);
      badge.textContent = '0';
    }
  }

  function wireVariantSelectors(container) {
    container.addEventListener('change', function (event) {
      const target = event.target;
      if (target.matches('select[data-variant-select]')) {
        const handle = target.getAttribute('data-variant-select');
        const wrapper = container.querySelector('[data-product="' + handle + '"]');
        if (!wrapper) return;
        const button = wrapper.querySelector('[data-add-to-cart]');
        if (button) {
          button.setAttribute('data-add-to-cart', target.value);
        }
      }
    });
  }

  function wireAddToCart(container) {
    container.addEventListener('click', function (event) {
      const button = event.target.closest('[data-add-to-cart]');
      if (!button) return;
      const variantId = button.getAttribute('data-add-to-cart');
      if (!variantId) {
        alert('Please select an option first.');
        return;
      }
      button.disabled = true;
      button.textContent = 'Adding…';
      window.ArcShopify.addLines(variantId, 1)
        .then(function () {
          button.textContent = 'Added';
          setTimeout(function () {
            button.textContent = 'Add to Cart';
            button.disabled = false;
          }, 1400);
          refreshCartBadge();
        })
        .catch(function (err) {
          button.disabled = false;
          button.textContent = 'Add to Cart';
          handleError(err);
        });
    });
  }

  async function renderIndex() {
    const container = document.getElementById('featured-grid');
    if (!container) return;
    const products = await loadProducts();
    const featured = products.slice(0, 4);
    container.innerHTML = featured.map(renderProductCard).join('');
    wireVariantSelectors(container);
    wireAddToCart(container);
  }

  function filterProducts(products, query, color, tag) {
    const q = (query || '').trim().toLowerCase();
    const colorFilter = (color || '').toLowerCase();
    const tagFilter = (tag || '').toLowerCase();
    return products.filter(function (product) {
      const matchesQuery = !q || product.title.toLowerCase().includes(q) || (product.description || '').toLowerCase().includes(q);
      const matchesColor = !colorFilter || Array.from(extractColors(product)).some(function (c) { return c.toLowerCase() === colorFilter; });
      const matchesTag = !tagFilter || (product.tags || []).some(function (t) { return t.toLowerCase() === tagFilter; });
      return matchesQuery && matchesColor && matchesTag;
    });
  }

  async function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const products = await loadProducts();

    const searchInput = document.querySelector('[data-filter="search"]');
    const colorSelect = document.querySelector('[data-filter="color"]');
    const tagSelect = document.querySelector('[data-filter="tag"]');

    function populateFilters() {
      const colorSet = new Set();
      const tagSet = new Set();
      products.forEach(function (product) {
        extractColors(product).forEach(function (color) { colorSet.add(color); });
        (product.tags || []).forEach(function (tag) { tagSet.add(tag); });
      });
      colorSet.forEach(function (color) {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
      });
      tagSet.forEach(function (tag) {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
      });
    }

    function applyFilters() {
      const filtered = filterProducts(products, searchInput.value, colorSelect.value, tagSelect.value);
      if (!filtered.length) {
        grid.innerHTML = '<p class="notice">No products match the current filters.</p>';
        return;
      }
      grid.innerHTML = filtered.map(renderProductCard).join('');
      wireVariantSelectors(grid);
    }

    populateFilters();
    applyFilters();
    wireAddToCart(grid);

    [searchInput, colorSelect, tagSelect].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', applyFilters);
      el.addEventListener('change', applyFilters);
    });
  }

  async function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    const products = await loadProducts();
    const media = await loadMedia();

    const cards = products.map(function (product) {
      const primaryImage = product.featuredImage || (product.images && product.images[0]);
      const videos = (media.videos && media.videos[product.handle]) || [];
      return [
        '<article class="gallery-card">',
        primaryImage ? '<img src="' + primaryImage.url + '" alt="' + (primaryImage.altText || product.title) + '">' : '',
        '<div class="arc-container" style="padding:1rem 1.2rem;">',
        '<h3>' + product.title + '</h3>',
        videos.length ? videos.map(function (entry) {
          return '<video controls preload="none" style="margin-top:1rem;border-radius:12px;">' +
                   '<source src="' + entry.url + '" type="video/mp4">' +
                   'Your browser does not support the video tag.' +
                 '</video>';
        }).join('') : '',
        '<a class="arc-button secondary" href="product.html?handle=' + encodeURIComponent(product.handle) + '" style="margin-top:1rem;">View Product</a>',
        '</div>',
        '</article>'
      ].join('');
    });

    grid.innerHTML = cards.join('');
  }

  function buildOptionButtons(variants, activeId) {
    return variants.map(function (variant) {
      const option = variant.selectedOptions && variant.selectedOptions.length ? variant.selectedOptions[0].value : variant.title;
      const active = variant.id === activeId ? ' active' : '';
      return '<button type="button" class="' + active + '" data-variant-choice="' + variant.id + '">' + option + '</button>';
    }).join('');
  }

  async function renderProductPage() {
    const container = document.getElementById('product-detail');
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const handle = params.get('handle');
    if (!handle) {
      container.innerHTML = '<p class="notice">Product handle missing.</p>';
      return;
    }

    try {
      const product = await window.ArcShopify.fetchProductByHandle(handle);
      if (!product) {
        container.innerHTML = '<p class="notice">Product not found.</p>';
        return;
      }
      const media = await loadMedia();
      const videos = (media.videos && media.videos[handle]) || [];
      const variants = product.variants || [];
      const firstVariant = variants[0];
      const money = window.ArcShopify.formatMoney;
      var currentPrice = firstVariant && firstVariant.price ? money(firstVariant.price.amount, firstVariant.price.currencyCode) : 'Price on request';

      const mainImage = (product.images && product.images[0]) || product.featuredImage;
      const thumbnails = product.images || [];

      container.innerHTML = [
        '<div class="product-layout">',
        '<section class="product-media">',
        mainImage ? '<img id="hero-image" src="' + mainImage.url + '" alt="' + (mainImage.altText || product.title) + '">' : '',
        thumbnails.length > 1 ? ('<div class="thumb-row">' + thumbnails.map(function (image, index) {
          return '<img ' + (index === 0 ? 'class="active" ' : '') + 'data-thumb-index="' + index + '" src="' + image.url + '" alt="' + (image.altText || product.title) + '">';
        }).join('') + '</div>') : '',
        videos.length ? videos.map(function (video) {
          return '<video controls preload="none" style="border-radius:12px;">' +
                 '<source src="' + video.url + '" type="video/mp4">Your browser does not support the video tag.' +
                 '</video>';
        }).join('') : '',
        '</section>',
        '<section class="product-copy">',
        '<h1>' + product.title + '</h1>',
        '<p class="price" data-product-price>' + currentPrice + '</p>',
        product.descriptionHtml || '<p>' + (product.description || '') + '</p>',
        product.metafield && product.metafield.value ? '<blockquote class="quote">' + product.metafield.value + '</blockquote>' : '',
        variants.length > 1 ? '<div class="option-select" data-option-buttons>' + buildOptionButtons(variants, firstVariant.id) + '</div>' : '',
        '<div class="hero-cta">',
        '<button class="arc-button" data-add-product="' + (firstVariant ? firstVariant.id : '') + '">Add to Cart</button>',
        '<a class="arc-button secondary" href="shop.html">Back to Shop</a>',
        '</div>',
        '</section>',
        '</div>'
      ].join('');

      const heroImage = container.querySelector('#hero-image');
      const thumbRow = container.querySelector('.thumb-row');
      if (thumbRow && heroImage) {
        thumbRow.addEventListener('click', function (event) {
          const thumb = event.target.closest('img[data-thumb-index]');
          if (!thumb) return;
          thumbRow.querySelectorAll('img').forEach(function (img) { img.classList.remove('active'); });
          thumb.classList.add('active');
          const index = Number(thumb.getAttribute('data-thumb-index'));
          if (!Number.isNaN(index) && thumbnails[index]) {
            heroImage.src = thumbnails[index].url;
            heroImage.alt = thumbnails[index].altText || product.title;
          }
        });
      }

      const optionButtons = container.querySelector('[data-option-buttons]');
      const priceEl = container.querySelector('[data-product-price]');
      const addButton = container.querySelector('[data-add-product]');
      if (optionButtons && addButton) {
        optionButtons.addEventListener('click', function (event) {
          const button = event.target.closest('[data-variant-choice]');
          if (!button) return;
          optionButtons.querySelectorAll('button').forEach(function (btn) { btn.classList.remove('active'); });
          button.classList.add('active');
          const variantId = button.getAttribute('data-variant-choice');
          addButton.setAttribute('data-add-product', variantId);
          const variant = variants.find(function (item) { return item.id === variantId; });
          if (variant && variant.price && priceEl) {
            priceEl.textContent = money(variant.price.amount, variant.price.currencyCode);
          }
        });
      }

      if (addButton) {
        addButton.addEventListener('click', function () {
          const variantId = addButton.getAttribute('data-add-product');
          if (!variantId) return;
          addButton.disabled = true;
          addButton.textContent = 'Adding…';
          window.ArcShopify.addLines(variantId, 1)
            .then(function () {
              addButton.textContent = 'Added';
              setTimeout(function () {
                addButton.textContent = 'Add to Cart';
                addButton.disabled = false;
              }, 1400);
              refreshCartBadge();
            })
            .catch(function (err) {
              addButton.disabled = false;
              addButton.textContent = 'Add to Cart';
              handleError(err);
            });
        });
      }
    } catch (err) {
      container.innerHTML = '<p class="notice">We could not load this product. Please try again later.</p>';
      console.error(err);
    }
  }

  async function renderCart() {
    const table = document.getElementById('cart-table');
    if (!table) return;
    const summary = document.getElementById('cart-summary');
    const emptyState = document.getElementById('cart-empty');

    const cartId = (function () {
      try { return localStorage.getItem('arc-cart-id'); } catch (err) { return null; }
    })();

    if (!cartId) {
      table.style.display = 'none';
      summary.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    try {
      const cart = await window.ArcShopify.retrieveCart(cartId);
      if (!cart || !cart.lines || cart.lines.edges.length === 0) {
        table.style.display = 'none';
        summary.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      const rows = cart.lines.edges.map(function (edge) {
        const line = edge.node;
        const merchandise = line.merchandise;
        const productTitle = merchandise && merchandise.product ? merchandise.product.title : 'Product';
        const options = merchandise && merchandise.selectedOptions ? merchandise.selectedOptions.map(function (opt) { return opt.value; }).join(', ') : '';
        const price = line.cost && line.cost.amountPerQuantity ? window.ArcShopify.formatMoney(line.cost.amountPerQuantity.amount, line.cost.amountPerQuantity.currencyCode) : '';
        const total = line.cost && line.cost.totalAmount ? window.ArcShopify.formatMoney(line.cost.totalAmount.amount, line.cost.totalAmount.currencyCode) : '';
        const imageUrl = merchandise && merchandise.image ? merchandise.image.url : '';
        return [
          '<tr data-cart-line="' + line.id + '">',
          '<td style="width:120px;">' + (imageUrl ? '<img src="' + imageUrl + '" alt="' + productTitle + '">' : '') + '</td>',
          '<td><strong>' + productTitle + '</strong>' + (options ? '<div class="muted">' + options + '</div>' : '') + '</td>',
          '<td>' + price + '</td>',
          '<td><input type="number" min="1" value="' + line.quantity + '" data-cart-qty></td>',
          '<td>' + total + '</td>',
          '<td><button class="arc-button secondary" data-remove-line>Remove</button></td>',
          '</tr>'
        ].join('');
      }).join('');

      table.querySelector('tbody').innerHTML = rows;
      summary.querySelector('[data-cart-subtotal]').textContent = cart.cost && cart.cost.subtotalAmount
        ? window.ArcShopify.formatMoney(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)
        : '';
      summary.querySelector('[data-cart-total]').textContent = cart.cost && cart.cost.totalAmount
        ? window.ArcShopify.formatMoney(cart.cost.totalAmount.amount, cart.cost.totalAmount.currencyCode)
        : '';
      const checkoutButton = summary.querySelector('[data-checkout]');
      if (checkoutButton) {
        checkoutButton.href = cart.checkoutUrl;
      }

      table.style.display = '';
      summary.style.display = 'flex';
      emptyState.style.display = 'none';

      if (!table.dataset.cartBound) {
        table.addEventListener('input', function (event) {
          if (!event.target.matches('input[data-cart-qty]')) return;
          const row = event.target.closest('tr[data-cart-line]');
          const lineId = row.getAttribute('data-cart-line');
          const newQty = Number(event.target.value);
          window.ArcShopify.updateLine(lineId, newQty)
            .then(function () {
              renderCart();
              refreshCartBadge();
            })
            .catch(function (err) {
              handleError(err);
              renderCart();
            });
        });

        table.addEventListener('click', function (event) {
          const button = event.target.closest('[data-remove-line]');
          if (!button) return;
          const row = button.closest('tr[data-cart-line]');
          const lineId = row.getAttribute('data-cart-line');
          window.ArcShopify.removeLines([lineId])
            .then(function () {
              renderCart();
              refreshCartBadge();
            })
            .catch(handleError);
        });
        table.dataset.cartBound = 'true';
      }
    } catch (err) {
      table.style.display = 'none';
      summary.style.display = 'none';
      emptyState.style.display = 'block';
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    refreshCartBadge();
    const page = document.body.getAttribute('data-page');
    if (page === 'index') {
      renderIndex().catch(handleError);
    } else if (page === 'gallery') {
      renderGallery().catch(handleError);
    } else if (page === 'shop') {
      renderShop().catch(handleError);
    } else if (page === 'product') {
      renderProductPage();
    } else if (page === 'cart') {
      renderCart();
    }
  });
})();
