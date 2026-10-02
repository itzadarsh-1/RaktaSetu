const themeToggle = document.getElementById("themeToggle");


// Load saved theme
const savedTheme = localStorage.getItem("raktasetu-theme");

if (savedTheme === "dark") {

    document.body.classList.add("dark-mode");

}


// Update button icon
function updateThemeIcon() {

    if (!themeToggle) {
        return;
    }

    if (document.body.classList.contains("dark-mode")) {
        themeToggle.textContent = "☀️";
    } else {
        themeToggle.textContent = "🌙";
    }

}

updateThemeIcon();


// Theme button
if (themeToggle) {

    themeToggle.addEventListener("click", function () {

        document.body.classList.toggle("dark-mode");


        if (document.body.classList.contains("dark-mode")) {

            localStorage.setItem(
                "raktasetu-theme",
                "dark"
            );

        } else {

            localStorage.setItem(
                "raktasetu-theme",
                "light"
            );

        }


        updateThemeIcon();

    });

}