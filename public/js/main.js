(function () {
  var CART_STORAGE_KEY = "store.cart.v1";
  var USER_STORAGE_KEY = "loggedInUser";
  var API_BASE_URL = "http://localhost:5000";

  function getLoggedInUser() {
    try {
      var raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.id) {
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function safeGames() {
    return Array.isArray(window.games) ? window.games : [];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizePathname() {
    var path = (window.location.pathname || "").toLowerCase();
    var clean = path.split("/").pop() || "index.html";
    return clean;
  }

  function formatCurrency(amount) {
    return "$" + Number(amount || 0).toFixed(2);
  }

  function findGameById(id) {
    var numericId = Number(id);
    return safeGames().find(function (game) {
      return Number(game.id) === numericId;
    }) || null;
  }

  function parseSearchQuery() {
    var query = new URLSearchParams(window.location.search || "");
    return (query.get("q") || "").trim().toLowerCase();
  }

  function normalizeToken(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseBrowseFilters() {
    var query = new URLSearchParams(window.location.search || "");
    return {
      q: (query.get("q") || "").trim().toLowerCase(),
      genre: normalizeToken(query.get("genre") || ""),
      platform: normalizeToken(query.get("platform") || "")
    };
  }

  function setQueryParam(urlParams, key, value) {
    if (!value) {
      urlParams.delete(key);
      return;
    }
    urlParams.set(key, value);
  }

  function updateBrowseUrl(filters) {
    var query = new URLSearchParams(window.location.search || "");
    setQueryParam(query, "genre", filters.genre);
    setQueryParam(query, "platform", filters.platform);
    var nextUrl = window.location.pathname + (query.toString() ? "?" + query.toString() : "");
    window.history.replaceState({}, "", nextUrl);
  }

  function getUniqueSortedValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function buildBrowseFilterOptions(games) {
    var genres = getUniqueSortedValues(games.map(function (game) {
      return game.genre;
    }));

    var platforms = getUniqueSortedValues(
      games
        .flatMap(function (game) {
          return String(game.platforms || "")
            .split(",")
            .map(function (platform) {
              return platform.trim();
            });
        })
    );

    return { genres: genres, platforms: platforms };
  }

  function hydrateSelectOptions(selectEl, values, selectedToken) {
    if (!selectEl) {
      return;
    }

    values.forEach(function (value) {
      var option = document.createElement("option");
      var token = normalizeToken(value);
      option.value = token;
      option.textContent = value;
      if (token === selectedToken) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });
  }

  function parseIdParam() {
    var query = new URLSearchParams(window.location.search || "");
    var raw = query.get("id");
    if (raw == null || raw === "") {
      return null;
    }
    var parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function CartManager() {
    this.items = this.readCart();
  }

  CartManager.prototype.readCart = function () {
    try {
      var raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map(function (item) {
          return {
            id: Number(item.id),
            qty: Math.max(1, Number(item.qty) || 1)
          };
        })
        .filter(function (item) {
          return Number.isFinite(item.id);
        });
    } catch (err) {
      return [];
    }
  };

  CartManager.prototype.persist = function () {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    this.updateNavCounter();
  };

  CartManager.prototype.syncAddToBackend = function (gameId, qty) {
    var user = getLoggedInUser();
    if (!user) {
      return;
    }

    fetch(API_BASE_URL + "/api/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user.id,
        gameId: Number(gameId),
        qty: Math.max(1, Number(qty) || 1)
      })
    }).catch(function () {
      // Keep local cart responsive even if backend call fails.
    });
  };

  CartManager.prototype.syncRemoveFromBackend = function (gameId) {
    var user = getLoggedInUser();
    if (!user) {
      return;
    }

    fetch(API_BASE_URL + "/api/cart/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user.id,
        gameId: Number(gameId)
      })
    }).catch(function () {
      // Keep local cart responsive even if backend call fails.
    });
  };

  CartManager.prototype.hydrateFromBackend = async function () {
    var user = getLoggedInUser();
    if (!user) {
      return;
    }

    try {
      var response = await fetch(API_BASE_URL + "/api/cart/" + encodeURIComponent(user.id));
      if (!response.ok) {
        return;
      }

      var data = await response.json();
      var remoteCart = Array.isArray(data.cart) ? data.cart : [];

      this.items = remoteCart
        .map(function (item) {
          return {
            id: Number(item.gameId),
            qty: Math.max(1, Number(item.qty) || 1)
          };
        })
        .filter(function (item) {
          return Number.isFinite(item.id);
        });

      this.persist();
    } catch (err) {
      // Ignore network errors and keep local cart fallback.
    }
  };

  CartManager.prototype.getItems = function () {
    return this.items.slice();
  };

  CartManager.prototype.getTotalItemCount = function () {
    return this.items.reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);
  };

  CartManager.prototype.calculateTotal = function () {
    return this.items.reduce(function (sum, item) {
      var game = findGameById(item.id);
      var price = game ? Number(game.price) : 0;
      return sum + (Number.isFinite(price) ? price * item.qty : 0);
    }, 0);
  };

  CartManager.prototype.addToCart = function (gameId, qty) {
    var requestedQty = Math.max(1, Number(qty) || 1);
    var existing = this.items.find(function (item) {
      return Number(item.id) === Number(gameId);
    });

    if (existing) {
      existing.qty += requestedQty;
    } else {
      this.items.push({ id: Number(gameId), qty: requestedQty });
    }

    this.persist();
    this.syncAddToBackend(gameId, requestedQty);
  };

  CartManager.prototype.removeFromCart = function (gameId) {
    var target = Number(gameId);
    this.items = this.items.filter(function (item) {
      return Number(item.id) !== target;
    });
    this.persist();
    this.syncRemoveFromBackend(gameId);
  };

  CartManager.prototype.updateNavCounter = function () {
    var cartCount = document.getElementById("cart-count");
    var count = this.getTotalItemCount();
    if (cartCount) {
      cartCount.textContent = String(count);
    }
    if (typeof window.updateCartCount === "function") {
      window.updateCartCount(count);
    }
  };

  var cartManager = new CartManager();

  function createGameCardTemplate(game) {
    var id = Number(game.id);
    var name = escapeHtml(game.name || "Unknown Game");
    var genre = escapeHtml(game.genre || "Genre");
    var rating = game.rating != null ? escapeHtml(game.rating) : "N/A";
    var price = formatCurrency(Number(game.price));
    var cover = escapeHtml(game.cover || "./assets/hero/placeholder.jpg");
    var surname = String(game.surname || "").toLowerCase();
    var customDetailsBySurname = {
      hollowknight: "../site2/index.html",
      limbo: "../Limbo/site1/index.html",
      outerwilds: "../Outerwild/index.html",
      undertale: "../undertale/index.html",
      minecraft: "../gamepages/game1.html",
      eldenring: "../gamepages/gamepage1.html",
      sekiro: "../gamepages/gamepage2.html",
      darksouls3: "../gamepages/gamepage3.html",
      subnautica: "../gamepages/game2.html"
    };
    var detailsHref = customDetailsBySurname[surname] || "game.html?id=" + id;

    return [
      '<article class="game-card-root game-card-item" aria-label="' + name + ' card">',
      '  <div class="game-card-media-wrap">',
      '    <a href="' + detailsHref + '" aria-label="Open ' + name + '">',
      '      <img class="game-card-media" src="' + cover + '" alt="' + name + ' cover art" loading="lazy" />',
      '    </a>',
      '    <span class="game-card-badge">Trending</span>',
      '  </div>',
      '  <div class="game-card-body">',
      '    <h3 class="game-card-title">' + name + '</h3>',
      '    <p class="game-card-subtitle">' + genre + '</p>',
      '    <div class="game-card-meta">',
      '      <span class="game-card-rating">Rating: ' + rating + '</span>',
      '      <span class="game-card-price">' + price + '</span>',
      '    </div>',
      '    <div class="game-card-actions">',
      '      <button class="game-card-btn game-card-btn-primary" type="button" data-action="add" data-id="' + id + '">Add to Cart</button>',
      '      <a class="game-card-btn game-card-btn-ghost" href="' + detailsHref + '">View</a>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join("\n");
  }

  function renderBrowsePage() {
    var container = document.getElementById("game-grid-container");
    var genreSelect = document.getElementById("browse-filter-genre");
    var platformSelect = document.getElementById("browse-filter-platform");
    var clearBtn = document.getElementById("browse-filter-clear");
    if (!container) {
      return;
    }

    var allGames = safeGames();
    var options = buildBrowseFilterOptions(allGames);
    var activeFilters = parseBrowseFilters();

    hydrateSelectOptions(genreSelect, options.genres, activeFilters.genre);
    hydrateSelectOptions(platformSelect, options.platforms, activeFilters.platform);

    function filterGames(filters) {
      return allGames.filter(function (game) {
        var name = String(game.name || "").toLowerCase();
        var gameGenreRaw = String(game.genre || "");
        var gameGenreToken = normalizeToken(gameGenreRaw);
        var platforms = String(game.platforms || "")
          .split(",")
          .map(function (platform) {
            return normalizeToken(platform.trim());
          });

        if (filters.q && name.indexOf(filters.q) === -1 && gameGenreRaw.toLowerCase().indexOf(filters.q) === -1) {
          return false;
        }

        if (filters.genre && gameGenreToken !== filters.genre) {
          return false;
        }

        if (filters.platform && platforms.indexOf(filters.platform) === -1) {
          return false;
        }

        return true;
      });
    }

    function repaintBrowse() {
      var gameList = filterGames(activeFilters);
      if (!gameList.length) {
        container.innerHTML = '<p class="cart-empty">No games match your active filters.</p>';
        return;
      }
      container.innerHTML = gameList.map(createGameCardTemplate).join("\n");
    }

    function applySelectFilters() {
      activeFilters.genre = genreSelect ? genreSelect.value : "";
      activeFilters.platform = platformSelect ? platformSelect.value : "";
      updateBrowseUrl(activeFilters);
      repaintBrowse();
    }

    if (genreSelect) {
      genreSelect.addEventListener("change", applySelectFilters);
    }

    if (platformSelect) {
      platformSelect.addEventListener("change", applySelectFilters);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        activeFilters.genre = "";
        activeFilters.platform = "";
        if (genreSelect) {
          genreSelect.value = "";
        }
        if (platformSelect) {
          platformSelect.value = "";
        }
        updateBrowseUrl(activeFilters);
        repaintBrowse();
      });
    }

    repaintBrowse();

    container.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.dataset.action !== "add") {
        return;
      }

      var gameId = Number(target.dataset.id);
      if (!Number.isFinite(gameId)) {
        return;
      }

      cartManager.addToCart(gameId, 1);
      target.textContent = "Added";
      window.setTimeout(function () {
        target.textContent = "Add to Cart";
      }, 800);
    });
  }

  function renderGamePage() {
    var gameId = parseIdParam();
    var game = findGameById(gameId);

    var page = document.getElementById("game-detail-page");
    var title = document.getElementById("game-detail-title");
    var cover = document.getElementById("game-detail-cover");
    var price = document.getElementById("game-detail-price");
    var genre = document.getElementById("game-detail-genre");
    var release = document.getElementById("game-detail-release");
    var platforms = document.getElementById("game-detail-platforms");
    var rating = document.getElementById("game-detail-rating");
    var description = document.getElementById("game-detail-description");
    var addBtn = document.getElementById("game-detail-add-btn");
    var actionsDiv = document.querySelector(".game-detail-actions");

    if (!page || !title || !cover || !price || !genre || !release || !platforms || !rating || !description || !addBtn) {
      return;
    }

    if (!game) {
      title.textContent = "Game not found";
      description.textContent = "The selected game could not be loaded.";
      addBtn.disabled = true;
      return;
    }

    title.textContent = game.name || "Unknown Game";
    cover.src = game.cover || "./assets/hero/placeholder.jpg";
    cover.alt = (game.name || "Unknown Game") + " cover";
    price.textContent = formatCurrency(Number(game.price));
    genre.textContent = game.genre || "-";
    release.textContent = game.release || "-";
    platforms.textContent = game.platforms || "-";
    rating.textContent = game.rating != null ? String(game.rating) : "-";
    description.textContent = game.desc || "No description available.";

    // Navigate to detailed page when clicking cover image
    if (game.detailedPageLink) {
      cover.style.cursor = "pointer";
      cover.title = "Click to view full details";
      cover.addEventListener("click", function () {
        window.location.href = game.detailedPageLink;
      });
      
      // Add "View Full Details" button
      if (actionsDiv) {
        var detailsLink = document.createElement("a");
        detailsLink.className = "game-detail-link";
        detailsLink.href = game.detailedPageLink;
        detailsLink.textContent = "View Full Details";
        detailsLink.style.backgroundColor = "#007bff";
        detailsLink.style.color = "white";
        detailsLink.style.padding = "10px 20px";
        detailsLink.style.borderRadius = "5px";
        detailsLink.style.display = "inline-block";
        detailsLink.style.marginLeft = "10px";
        detailsLink.style.textDecoration = "none";
        detailsLink.style.transition = "background-color 0.3s ease";
        detailsLink.addEventListener("mouseover", function() {
          detailsLink.style.backgroundColor = "#0056b3";
        });
        detailsLink.addEventListener("mouseout", function() {
          detailsLink.style.backgroundColor = "#007bff";
        });
        actionsDiv.insertBefore(detailsLink, addBtn.nextSibling);
      }
    }

    addBtn.addEventListener("click", function () {
      cartManager.addToCart(game.id, 1);
      addBtn.textContent = "Added to Cart";
      window.setTimeout(function () {
        addBtn.textContent = "Add to Cart";
      }, 900);
    });
  }

  function createCartItemTemplate(item) {
    var game = findGameById(item.id);
    if (!game) {
      return "";
    }

    var name = escapeHtml(game.name || "Unknown Game");
    var cover = escapeHtml(game.cover || "./assets/hero/placeholder.jpg");
    var qty = Math.max(1, Number(item.qty) || 1);
    var unitPrice = Number(game.price) || 0;
    var subtotal = unitPrice * qty;

    return [
      '<article class="cart-item-card cart-item-row">',
      '  <img class="cart-item-cover" src="' + cover + '" alt="' + name + ' cover" loading="lazy" />',
      '  <div class="cart-item-content">',
      '    <h2 class="cart-item-title">' + name + '</h2>',
      '    <p class="cart-item-price">Unit Price: ' + formatCurrency(unitPrice) + '</p>',
      '    <p class="cart-item-qty">Quantity: ' + qty + '</p>',
      '    <p class="cart-item-price">Subtotal: ' + formatCurrency(subtotal) + '</p>',
      '  </div>',
      '  <div class="cart-item-actions">',
      '    <button class="cart-item-btn" type="button" data-action="remove" data-id="' + Number(item.id) + '">Remove</button>',
      '  </div>',
      '</article>'
    ].join("\n");
  }

  function renderCartPage() {
    var container = document.getElementById("cart-items-container");
    var totalItemsEl = document.getElementById("cart-total-items");
    var totalPriceEl = document.getElementById("cart-total-price");
    var checkoutBtn = document.getElementById("cart-checkout-btn");

    if (!container || !totalItemsEl || !totalPriceEl) {
      return;
    }

    function repaint() {
      var items = cartManager.getItems();

      if (!items.length) {
        container.innerHTML = '<p class="cart-empty">Your cart is empty. Browse games to add your first title.</p>';
      } else {
        container.innerHTML = items.map(createCartItemTemplate).join("\n");
      }

      totalItemsEl.textContent = String(cartManager.getTotalItemCount());
      totalPriceEl.textContent = formatCurrency(cartManager.calculateTotal());
    }

    container.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.dataset.action !== "remove") {
        return;
      }

      var gameId = Number(target.dataset.id);
      if (!Number.isFinite(gameId)) {
        return;
      }

      cartManager.removeFromCart(gameId);
      repaint();
    });

    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () {
        if (cartManager.getItems().length === 0) {
          window.alert("Your cart is currently empty.");
          return;
        }
        window.alert("Checkout is not connected yet. This is a static MVP flow.");
      });
    }

    repaint();
  }

  function setupGlobalNavActions() {
    var cartBtn = document.getElementById("nav-cart-btn");
    if (cartBtn) {
      cartBtn.addEventListener("click", function () {
        window.location.href = "cart.html";
      });
    }

    window.addEventListener("storage", function (event) {
      if (event.key !== CART_STORAGE_KEY) {
        return;
      }
      cartManager.items = cartManager.readCart();
      cartManager.updateNavCounter();
    });
  }

  function routeByPathname() {
    var path = normalizePathname();

    if (path === "browse.html") {
      renderBrowsePage();
    }

    if (path === "game.html") {
      renderGamePage();
    }

    if (path === "cart.html") {
      renderCartPage();
    }
  }

  async function bootstrap() {
    await cartManager.hydrateFromBackend();
    setupGlobalNavActions();
    cartManager.updateNavCounter();
    routeByPathname();
  }

  bootstrap();
})();
