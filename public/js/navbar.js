(function () {
  var AUTH_STORAGE_KEY = "loggedInUser";
  var CART_STORAGE_KEY = "store.cart.v1";
  var cartCountEl = document.getElementById("cart-count");
  var cartBtn = document.getElementById("nav-cart-btn");
  var searchForm = document.getElementById("nav-search-form");
  var authLink = document.querySelector(".nav-login");

  function getLoggedInUser() {
    try {
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
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

  function getCartCount() {
    try {
      var raw = localStorage.getItem("cartItems");
      if (!raw) return 0;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (err) {
      return 0;
    }
  }

  function setCartCount(count) {
    if (cartCountEl) {
      cartCountEl.textContent = String(count);
    }
  }

  setCartCount(getCartCount());

  window.updateCartCount = function (count) {
    setCartCount(Number.isFinite(count) ? count : 0);
  };

  if (cartBtn) {
    cartBtn.addEventListener("click", function () {
      window.dispatchEvent(new CustomEvent("cart:open"));
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function () {
      var input = document.getElementById("nav-search-input");
      if (!input) return;
      var value = input.value.trim();
      input.value = value;
    });
  }

  if (authLink) {
    var user = getLoggedInUser();

    if (user) {
      authLink.textContent = "Logout";
      authLink.setAttribute("href", "#");
      authLink.setAttribute("aria-label", "Logout");

      authLink.addEventListener("click", function (event) {
        event.preventDefault();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem("cartItems");
        window.location.href = "login.html";
      });
    } else {
      authLink.textContent = "Login";
      authLink.setAttribute("href", "login.html");
      authLink.setAttribute("aria-label", "Open login page");
    }
  }
})();
