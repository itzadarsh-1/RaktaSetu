// ==========================================
// RAKTASETU - DONOR DATA
// ==========================================


// Default donor data

const defaultDonor = {

    name: "Adarsh Kumar",

    email: "donor@example.com",

    mobile: "9876543210",

    blood: "O+",

    location: "Dehradun",

    lastDonation: "",

    available: true,

    donations: 5,

    requests: 2

};


// Get donor data from localStorage

let donorData =
    JSON.parse(
        localStorage.getItem("raktasetu-donor")
    );


// If no data exists

if (!donorData) {

    donorData = defaultDonor;

    localStorage.setItem(
        "raktasetu-donor",
        JSON.stringify(donorData)
    );

}



// ==========================================
// DONOR DASHBOARD
// ==========================================

function loadDonorDashboard() {


    const dashboardName =
        document.getElementById(
            "dashboardName"
        );


    const dashboardBlood =
        document.getElementById(
            "dashboardBlood"
        );


    const profileName =
        document.getElementById(
            "profileName"
        );


    const profileBlood =
        document.getElementById(
            "profileBlood"
        );


    const profileLocation =
        document.getElementById(
            "profileLocation"
        );


    const profileMobile =
        document.getElementById(
            "profileMobile"
        );


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );


    const profileAvailability =
        document.getElementById(
            "profileAvailability"
        );


    const donationCount =
        document.getElementById(
            "donationCount"
        );


    const requestCount =
        document.getElementById(
            "requestCount"
        );


    const dashboardAvailability =
        document.getElementById(
            "dashboardAvailability"
        );



    // Name

    if (dashboardName) {

        dashboardName.textContent =
            donorData.name;

    }


    // Blood Group

    if (dashboardBlood) {

        dashboardBlood.textContent =
            donorData.blood;

    }


    if (profileBlood) {

        profileBlood.textContent =
            donorData.blood;

    }


    // Name

    if (profileName) {

        profileName.textContent =
            donorData.name;

    }


    // Location

    if (profileLocation) {

        profileLocation.textContent =
            donorData.location;

    }


    // Mobile

    if (profileMobile) {

        profileMobile.textContent =
            maskMobile(donorData.mobile);

    }


    // Email

    if (profileEmail) {

        profileEmail.textContent =
            donorData.email;

    }


    // Donations

    if (donationCount) {

        donationCount.textContent =
            donorData.donations || 0;

    }


    // Requests

    if (requestCount) {

        requestCount.textContent =
            donorData.requests || 0;

    }



    // Availability

    if (profileAvailability) {

        if (donorData.available) {

            profileAvailability.textContent =
                "Available";

            profileAvailability.className =
                "available-text";

        } else {

            profileAvailability.textContent =
                "Not Available";

            profileAvailability.className =
                "unavailable-text";

        }

    }



    // Dashboard availability badge

    if (dashboardAvailability) {

        if (donorData.available) {

            dashboardAvailability.textContent =
                "🟢 Available for Donation";

            dashboardAvailability.classList.remove(
                "not-available"
            );

        } else {

            dashboardAvailability.textContent =
                "🔴 Not Available";

            dashboardAvailability.classList.add(
                "not-available"
            );

        }

    }

}



// ==========================================
// MOBILE NUMBER MASK
// ==========================================

function maskMobile(mobile) {

    if (!mobile) {
        return "Not available";
    }


    if (mobile.length === 10) {

        return (
            mobile.substring(0, 2) +
            "XXXXXX" +
            mobile.substring(8)
        );

    }


    return mobile;

}



// ==========================================
// DONOR PROFILE
// ==========================================

const donorProfileForm =
    document.getElementById(
        "donorProfileForm"
    );


if (donorProfileForm) {


    // Load existing data

    document.getElementById(
        "donorName"
    ).value = donorData.name;


    document.getElementById(
        "donorEmail"
    ).value = donorData.email;


    document.getElementById(
        "donorMobile"
    ).value = donorData.mobile;


    document.getElementById(
        "donorBlood"
    ).value = donorData.blood;


    document.getElementById(
        "donorLocation"
    ).value = donorData.location;


    document.getElementById(
        "lastDonation"
    ).value = donorData.lastDonation || "";



    // Save profile

    donorProfileForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const name =
                document.getElementById(
                    "donorName"
                ).value.trim();


            const email =
                document.getElementById(
                    "donorEmail"
                ).value.trim();


            const mobile =
                document.getElementById(
                    "donorMobile"
                ).value.trim();


            const blood =
                document.getElementById(
                    "donorBlood"
                ).value;


            const location =
                document.getElementById(
                    "donorLocation"
                ).value.trim();


            const lastDonation =
                document.getElementById(
                    "lastDonation"
                ).value;



            // Validation

            if (mobile.length !== 10) {

                alert(
                    "Please enter a valid 10 digit mobile number."
                );

                return;

            }


            if (name === "") {

                alert(
                    "Please enter your name."
                );

                return;

            }


            if (blood === "") {

                alert(
                    "Please select your blood group."
                );

                return;

            }


            if (location === "") {

                alert(
                    "Please enter your location."
                );

                return;

            }



            // Update donor data

            donorData.name =
                name;

            donorData.email =
                email;

            donorData.mobile =
                mobile;

            donorData.blood =
                blood;

            donorData.location =
                location;

            donorData.lastDonation =
                lastDonation;



            // Save

            localStorage.setItem(
                "raktasetu-donor",
                JSON.stringify(donorData)
            );


            alert(
                "Profile updated successfully! ✅"
            );


            // Go to dashboard

            window.location.href =
                "donor-dashboard.html";

        }
    );

}



// ==========================================
// AVAILABILITY TOGGLE
// ==========================================

const availabilityToggle =
    document.getElementById(
        "availabilityToggle"
    );


if (availabilityToggle) {


    availabilityToggle.checked =
        donorData.available;


    updateAvailabilityUI();



    availabilityToggle.addEventListener(
        "change",
        function () {


            donorData.available =
                availabilityToggle.checked;


            localStorage.setItem(
                "raktasetu-donor",
                JSON.stringify(donorData)
            );


            updateAvailabilityUI();


            if (donorData.available) {

                alert(
                    "You are now available for blood donation. 🟢"
                );

            } else {

                alert(
                    "You are now unavailable for donation. 🔴"
                );

            }

        }
    );

}



// ==========================================
// AVAILABILITY UI
// ==========================================

function updateAvailabilityUI() {


    const icon =
        document.getElementById(
            "availabilityIcon"
        );


    const title =
        document.getElementById(
            "availabilityTitle"
        );


    const text =
        document.getElementById(
            "availabilityText"
        );


    if (!icon || !title || !text) {
        return;
    }


    if (donorData.available) {

        icon.textContent =
            "🟢";

        title.textContent =
            "Available";

        text.textContent =
            "You are currently available for blood donation requests.";

    } else {

        icon.textContent =
            "🔴";

        title.textContent =
            "Not Available";

        text.textContent =
            "You are currently not available for blood donation requests.";

    }

}



// ==========================================
// LOAD DASHBOARD
// ==========================================

loadDonorDashboard();

// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );

            if (confirmLogout) {

                // Login session remove
                localStorage.removeItem(
                    "raktasetu-login-email"
                );

                // Login page par redirect
                window.location.href =
                    "../login.html";
            }

        }
    );

}
// ==========================================
// REQUEST ACTIONS
// ==========================================
// ==========================================
// DYNAMIC BLOOD REQUESTS
// ==========================================

function loadBloodRequests() {

    const requestsList =
        document.getElementById("requestsList");

    if (!requestsList) {
        return;
    }

    const requests =
        JSON.parse(
            localStorage.getItem(
                "raktasetu-blood-requests"
            )
        ) || [];


    if (requests.length === 0) {

        requestsList.innerHTML = `
            <div class="empty-requests">

                <div class="empty-requests-icon">
                    🩸
                </div>

                <h3>
                    No Blood Requests
                </h3>

                <p>
                    There are currently no blood requests available.
                </p>

            </div>
        `;

        return;
    }


    displayBloodRequests(requests);
}



// ==========================================
// DISPLAY REQUESTS
// ==========================================

function displayBloodRequests(requests) {

    const requestsList =
        document.getElementById("requestsList");

    if (!requestsList) {
        return;
    }

    requestsList.innerHTML = "";


    requests.forEach(function (request) {

        const card =
            document.createElement("div");

        card.className = "request-card";


        let emergencyClass = "";

        if (request.emergencyLevel === "Medium") {
            emergencyClass = "medium";
        }


        let emergencyText = "LOW";

        if (request.emergencyLevel === "High") {
            emergencyText = "🚨 HIGH";
        }

        if (request.emergencyLevel === "Medium") {
            emergencyText = "⚠ MEDIUM";
        }


        let statusClass = "pending";

        if (request.status === "Accepted") {
            statusClass = "accepted";
        }

        if (request.status === "Rejected") {
            statusClass = "rejected";
        }


        card.innerHTML = `

            <div class="request-card-header">

                <div>

                    <span class="emergency-badge ${emergencyClass}">
                        ${emergencyText}
                    </span>

                    <h2>
                        ${request.bloodGroup} Blood Required
                    </h2>

                </div>


                <span class="request-status ${statusClass}">
                    ${request.status}
                </span>

            </div>


            <div class="request-details">

                <div class="detail-item">

                    <span>👤</span>

                    <div>

                        <small>
                            Patient
                        </small>

                        <strong>
                            ${request.patientName}
                        </strong>

                    </div>

                </div>


                <div class="detail-item">

                    <span>📍</span>

                    <div>

                        <small>
                            Location
                        </small>

                        <strong>
                            ${request.location}
                        </strong>

                    </div>

                </div>


                <div class="detail-item">

                    <span>🩸</span>

                    <div>

                        <small>
                            Blood Group
                        </small>

                        <strong>
                            ${request.bloodGroup}
                        </strong>

                    </div>

                </div>


                <div class="detail-item">

                    <span>📅</span>

                    <div>

                        <small>
                            Required Date
                        </small>

                        <strong>
                            ${formatDonorRequestDate(
                                request.requiredDate
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="request-message">

                <strong>
                    Message
                </strong>

                <p>
                    ${
                        request.message ||
                        "No additional message."
                    }
                </p>

            </div>


            <div class="request-actions">

                <button
                    class="accept-btn"
                    data-action="accept"
                    data-id="${request.id}"
                    ${request.status !== "Pending" ? "disabled" : ""}
                >
                    ✓ Accept Request
                </button>


                <button
                    class="reject-btn"
                    data-action="reject"
                    data-id="${request.id}"
                    ${request.status !== "Pending" ? "disabled" : ""}
                >
                    ✕ Reject
                </button>

            </div>

        `;


        requestsList.appendChild(card);

    });

}



// ==========================================
// ACCEPT / REJECT BUTTON
// ==========================================

const requestsList =
    document.getElementById("requestsList");


if (requestsList) {

    requestsList.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest("button[data-action]");


            if (!button) {
                return;
            }


            const requestId =
                Number(button.dataset.id);


            const action =
                button.dataset.action;


            if (action === "accept") {

                updateRequestStatus(
                    requestId,
                    "Accepted"
                );

            }


            if (action === "reject") {

                updateRequestStatus(
                    requestId,
                    "Rejected"
                );

            }

        }
    );

}



// ==========================================
// UPDATE REQUEST STATUS
// ==========================================

function updateRequestStatus(
    requestId,
    newStatus
) {

    let requests =
        JSON.parse(
            localStorage.getItem(
                "raktasetu-blood-requests"
            )
        ) || [];


    const request =
        requests.find(function (item) {

            return Number(item.id) === requestId;

        });


    if (!request) {

        alert(
            "Request not found."
        );

        return;

    }


    request.status =
        newStatus;


    localStorage.setItem(
        "raktasetu-blood-requests",
        JSON.stringify(requests)
    );


    if (newStatus === "Accepted") {

        alert(
            "Blood request accepted successfully! ✅"
        );

    } else {

        alert(
            "Blood request rejected."
        );

    }


    loadBloodRequests();

}



// ==========================================
// FILTER
// ==========================================

const bloodFilter =
    document.getElementById("bloodFilter");

const locationFilter =
    document.getElementById("locationFilter");


function applyRequestFilters() {

    const requests =
        JSON.parse(
            localStorage.getItem(
                "raktasetu-blood-requests"
            )
        ) || [];


    const selectedBlood =
        bloodFilter
            ? bloodFilter.value
            : "all";


    const locationText =
        locationFilter
            ? locationFilter.value
                .trim()
                .toLowerCase()
            : "";


    const filteredRequests =
        requests.filter(function (request) {

            const bloodMatch =
                selectedBlood === "all" ||
                request.bloodGroup === selectedBlood;


            const locationMatch =
                request.location
                    .toLowerCase()
                    .includes(locationText);


            return bloodMatch && locationMatch;

        });


    displayBloodRequests(
        filteredRequests
    );

}


if (bloodFilter) {

    bloodFilter.addEventListener(
        "change",
        applyRequestFilters
    );

}


if (locationFilter) {

    locationFilter.addEventListener(
        "input",
        applyRequestFilters
    );

}



// ==========================================
// FORMAT DATE
// ==========================================

function formatDonorRequestDate(date) {

    if (!date) {
        return "-";
    }


    const dateObject =
        new Date(date);


    return dateObject.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}



// ==========================================
// LOAD REQUESTS
// ==========================================

loadBloodRequests();