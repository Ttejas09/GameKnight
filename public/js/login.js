(function () {
  var form = document.getElementById("login-form");
  var statusEl = document.getElementById("login-status");

  if (!form) {
    return;
  }

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.style.color = isError ? "#ffb7b7" : "#cde6ff";
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    var emailInput = document.getElementById("login-email");
    var passwordInput = document.getElementById("login-password");

    var email = emailInput ? emailInput.value.trim() : "";
    var password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      setStatus("Please enter both email and password.", true);
      return;
    }

    setStatus("Signing in...", false);

    try {
      var response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email, password: password }),
      });

      var data = await response.json();

      if (!response.ok) {
        setStatus(data.message || "Login failed", true);
        return;
      }

      localStorage.setItem("loggedInUser", JSON.stringify(data.user));
      setStatus("Login successful. Redirecting to store...", false);

      window.setTimeout(function () {
        window.location.href = "index.html";
      }, 1000);
    } catch (error) {
      setStatus("Cannot connect to server. Make sure backend is running.", true);
    }
  });
})();
