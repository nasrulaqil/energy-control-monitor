// ==================================================
// SMART ENERGY MONITOR - GLOBAL THEME
// ==================================================


// ==================================================
// GET ELEMENTS
// ==================================================

const themeToggle =
    document.getElementById("themeToggle");

const themeIcon =
    document.getElementById("themeIcon");

const themeText =
    document.getElementById("themeText");


// ==================================================
// APPLY THEME
// ==================================================

function applyTheme(theme) {

    if (theme === "dark") {

        document.body.classList.add("dark-mode");

        if (themeIcon) {

            themeIcon.className =
                "bi bi-sun-fill";

        }

        if (themeText) {

            themeText.textContent =
                "Light Mode";

        }

    } else {

        document.body.classList.remove(
            "dark-mode"
        );

        if (themeIcon) {

            themeIcon.className =
                "bi bi-moon-fill";

        }

        if (themeText) {

            themeText.textContent =
                "Dark Mode";

        }

    }

}


// ==================================================
// LOAD SAVED THEME
// ==================================================

const savedTheme =
    localStorage.getItem(
        "smartEnergyTheme"
    );


if (savedTheme === "dark") {

    applyTheme("dark");

} else {

    applyTheme("light");

}


// ==================================================
// CHANGE THEME
// ==================================================

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        function() {


            const isDark =
                document.body.classList.contains(
                    "dark-mode"
                );


            if (isDark) {

                applyTheme("light");

                localStorage.setItem(
                    "smartEnergyTheme",
                    "light"
                );

            } else {

                applyTheme("dark");

                localStorage.setItem(
                    "smartEnergyTheme",
                    "dark"
                );

            }

        }
    );

}