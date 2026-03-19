const BASE_URL = "http://localhost:5000/api";

function showAlert(message, type = "danger") {
  const alertBox = document.getElementById("alertBox");
  alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Registration failed");

    showAlert("Registration successful! Please log in.", "success");
    document.getElementById("registerForm").reset();

    const loginTab = new bootstrap.Tab(document.getElementById("login-tab"));
    loginTab.show();

  } catch (err) {
    showAlert(err.message);
  }
});


document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Login failed");

    localStorage.setItem("token", data.token);

    showAlert("Login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);

  } catch (err) {
    showAlert(err.message);
  }
});
