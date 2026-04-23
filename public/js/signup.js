(function () {
  var form = document.getElementById("signup-form");
  var statusEl = document.getElementById("signup-status");

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

    var emailInput = document.getElementById("signup-email");
    var passwordInput = document.getElementById("signup-password");
    var confirmPasswordInput = document.getElementById("signup-confirm-password");

    var email = emailInput ? emailInput.value.trim() : "";
    var password = passwordInput ? passwordInput.value : "";
    var confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

    if (!email || !password || !confirmPassword) {
      setStatus("Please fill all fields.", true);
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.", true);
      return;
    }

    if (password.length < 6) {
      setStatus("Password should be at least 6 characters.", true);
      return;
    }

    setStatus("Creating account...", false);

    try {
      var response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email, password: password }),
      });

      var data = await response.json();

      if (!response.ok) {
        setStatus(data.message || "Signup failed", true);
        return;
      }

      setStatus("Signup successful. Redirecting to login...", false);

      window.setTimeout(function () {
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      setStatus("Cannot connect to server. Make sure backend is running.", true);
    }
  });
})();
