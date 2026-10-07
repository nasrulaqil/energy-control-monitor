const loginForm = document.getElementById("loginForm");
const email = document.getElementById("username");
const password = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const showPassword = document.getElementById("showPassword");
const passwordIcon = document.getElementById("passwordIcon");
const rememberMe = document.getElementById("rememberMe");
const loginButton = document.getElementById("loginButton");

const loginPanel = document.getElementById("loginPanel");
const forgotPanel = document.getElementById("forgotPanel");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const backToLogin = document.getElementById("backToLogin");
const forgotForm = document.getElementById("forgotForm");
const resetEmail = document.getElementById("resetEmail");
const resetMessage = document.getElementById("resetMessage");
const resetButton = document.getElementById("resetButton");

const signupPanel = document.getElementById("signupPanel");
const openSignupBtn = document.getElementById("openSignupBtn");
const backFromSignup = document.getElementById("backFromSignup");
const signupToLogin = document.getElementById("signupToLogin");
const signupForm = document.getElementById("signupForm");
const signupName = document.getElementById("signupName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupConfirmPassword = document.getElementById("signupConfirmPassword");
const signupMessage = document.getElementById("signupMessage");
const signupButton = document.getElementById("signupButton");

function showMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = `auth-message ${type === "success" ? "auth-success" : "auth-error"}`;
  element.hidden = false;
}

function hideMessage(element) {
  element.hidden = true;
  element.textContent = "";
}

function setButtonLoading(button, loading, normalText) {
  button.disabled = loading;
  button.querySelector("span").textContent = loading ? "Please wait..." : normalText;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(loginMessage);

  const emailValue = email.value.trim();
  if (!emailValue || !password.value) {
    showMessage(loginMessage, "Please enter your email and password.");
    return;
  }

  try {
    setButtonLoading(loginButton, true, "Login");
    await firebase.auth().setPersistence(
      rememberMe.checked
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION
    );
    await firebase.auth().signInWithEmailAndPassword(emailValue, password.value);
    window.location.href = "pages/setup-device.html";
  } catch (error) {
    console.error("Login error:", error.code || error.message);
    showMessage(loginMessage, "Login failed. Please check your email and password.");
  } finally {
    setButtonLoading(loginButton, false, "Login");
  }
});

showPassword.addEventListener("click", () => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  passwordIcon.className = showing ? "bi bi-eye-slash" : "bi bi-eye";
  showPassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

forgotPasswordBtn.addEventListener("click", () => {
  resetEmail.value = email.value.trim();
  hideMessage(resetMessage);
  loginPanel.hidden = true;
  forgotPanel.hidden = false;
  setTimeout(() => resetEmail.focus(), 0);
});

backToLogin.addEventListener("click", () => {
  forgotPanel.hidden = true;
  loginPanel.hidden = false;
  hideMessage(resetMessage);
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(resetMessage);
  const emailValue = resetEmail.value.trim();

  if (!emailValue) {
    showMessage(resetMessage, "Please enter your email address.");
    return;
  }

  try {
    setButtonLoading(resetButton, true, "Continue");
    await firebase.auth().sendPasswordResetEmail(emailValue);
    showMessage(resetMessage, "Password reset link sent. Please check your email.", "success");
  } catch (error) {
    console.error("Password reset error:", error.code || error.message);
    showMessage(resetMessage, "Unable to send reset email. Check the email address and try again.");
  } finally {
    setButtonLoading(resetButton, false, "Continue");
  }
});


function showLoginPanel() {
  signupPanel.hidden = true;
  forgotPanel.hidden = true;
  loginPanel.hidden = false;
}

openSignupBtn.addEventListener("click", () => {
  loginPanel.hidden = true;
  forgotPanel.hidden = true;
  signupPanel.hidden = false;
  hideMessage(signupMessage);
  setTimeout(() => signupName.focus(), 0);
});

backFromSignup.addEventListener("click", showLoginPanel);
signupToLogin.addEventListener("click", showLoginPanel);

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(signupMessage);

  const name = signupName.value.trim();
  const emailValue = signupEmail.value.trim().toLowerCase();
  const passwordValue = signupPassword.value;
  const confirmValue = signupConfirmPassword.value;

  if (!name || !emailValue || !passwordValue || !confirmValue) {
    showMessage(signupMessage, "Please complete all required fields.");
    return;
  }
  if (passwordValue.length < 6) {
    showMessage(signupMessage, "Password must be at least 6 characters.");
    return;
  }
  if (passwordValue !== confirmValue) {
    showMessage(signupMessage, "Passwords do not match.");
    return;
  }

  try {
    setButtonLoading(signupButton, true, "Create Account");
    const response = await fetch(window.smartEnergyApiBase + "/api/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name, email: emailValue, password: passwordValue})
    });
    const result = await response.json();
    if (!response.ok || result.status !== "OK") throw new Error(result.message || "Registration failed");

    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await firebase.auth().signInWithEmailAndPassword(emailValue, passwordValue);
    window.location.href = "pages/setup-device.html";
  } catch (error) {
    console.error("Registration error:", error.message);
    showMessage(signupMessage, error.message || "Unable to create account.");
  } finally {
    setButtonLoading(signupButton, false, "Create Account");
  }
});

firebase.auth().onAuthStateChanged((user) => {
  if (user) window.location.href = "pages/setup-device.html";
});
