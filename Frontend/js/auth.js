
const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const mobile = document.getElementById("mobile").value.trim();
        const role = document.getElementById("role").value;
        const bloodGroup = document.getElementById("bloodGroup").value;
        const location = document.getElementById("location").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;


        // Name
        if (name.length < 3) {
            alert("Please enter your full name.");
            return;
        }


        // Email
        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }


        // Mobile
        if (!/^[0-9]{10}$/.test(mobile)) {
            alert("Please enter a valid 10 digit mobile number.");
            return;
        }


        // Role
        if (role === "") {
            alert("Please select your role.");
            return;
        }


        // Blood Group
        if (role === "DONOR" && bloodGroup === "") {
            alert("Please select your blood group.");
            return;
        }


        // Location
        if (location.length < 2) {
            alert("Please enter your location.");
            return;
        }


        // Password
        if (password.length < 6) {
            alert("Password must contain at least 6 characters.");
            return;
        }


        // Confirm Password
        if (password !== confirmPassword) {
            alert("Password and Confirm Password do not match.");
            return;
        }


        // ==================================
        // SAVE USER
        // ==================================

        const registeredUser = {
            name: name,
            email: email,
            mobile: mobile,
            role: role,
            bloodGroup: bloodGroup,
            location: location,
            password: password
        };


        localStorage.setItem(
            "raktasetu-user",
            JSON.stringify(registeredUser)
        );


        console.log(
            "Registered User:",
            registeredUser
        );


        alert(
            "Registration successful! 🎉\n\n" +
            "Welcome to RaktaSetu, " +
            name +
            "."
        );


        // Go to Login
        window.location.href = "login.html";

    });

}


// ============================
// LOGIN
// ============================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;


        // Email validation
        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {

            alert("Please enter a valid email address.");

            return;
        }


        // Password validation
        if (password.length < 6) {

            alert(
                "Password must contain at least 6 characters."
            );

            return;
        }


        // ==================================
        // GET REGISTERED USER
        // ==================================

        const storedUser =
            JSON.parse(
                localStorage.getItem(
                    "raktasetu-user"
                )
            );


        if (!storedUser) {

            alert(
                "No registered account found.\n\n" +
                "Please register first."
            );

            return;
        }


        // Check Email
        if (storedUser.email !== email) {

            alert(
                "Email not found.\n\n" +
                "Please use your registered email."
            );

            return;
        }


        // Check Password
        if (storedUser.password !== password) {

            alert(
                "Incorrect password."
            );

            return;
        }


        // Save login information
        localStorage.setItem(
            "raktasetu-login-email",
            email
        );

        localStorage.setItem(
            "raktasetu-login-role",
            storedUser.role
        );


        alert(
            "Login successful! 🎉\n\n" +
            "Welcome, " +
            storedUser.name
        );


        // ==================================
        // ROLE BASED REDIRECT
        // ==================================

        if (storedUser.role === "DONOR") {

            window.location.href =
                "donor/donor-dashboard.html";

        }

        else if (storedUser.role === "REQUESTER") {

            window.location.href =
                "requester/requester-dashboard.html";

        }

        else {

            alert("Invalid user role.");

        }

    });


    // ============================
    // SHOW / HIDE PASSWORD
    // ============================

    const togglePassword =
        document.getElementById("togglePassword");

    const passwordInput =
        document.getElementById("loginPassword");


    if (togglePassword) {

        togglePassword.addEventListener(
            "click",
            function () {

                if (passwordInput.type === "password") {

                    passwordInput.type = "text";

                    togglePassword.textContent = "🙈";

                }

                else {

                    passwordInput.type = "password";

                    togglePassword.textContent = "👁️";

                }

            }
        );

    }


    // ============================
    // FORGOT PASSWORD
    // ============================

    const forgotPassword =
        document.getElementById("forgotPassword");


    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                alert(
                    "Forgot Password feature will be connected with the backend later."
                );

            }
        );

    }

}