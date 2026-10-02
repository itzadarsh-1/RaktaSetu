// ==========================================
// CREATE BLOOD REQUEST
// ==========================================

const bloodRequestForm =
    document.getElementById("bloodRequestForm");

if (bloodRequestForm) {

    bloodRequestForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const patientName =
                document.getElementById("patientName").value.trim();

            const bloodGroup =
                document.getElementById("bloodGroup").value;

            const location =
                document.getElementById("location").value.trim();

            const requiredDate =
                document.getElementById("requiredDate").value;

            const emergencyLevel =
                document.getElementById("emergencyLevel").value;

            const contact =
                document.getElementById("contact").value.trim();

            const message =
                document.getElementById("message").value.trim();


            // Mobile validation

            if (!/^[0-9]{10}$/.test(contact)) {

                alert(
                    "Please enter a valid 10-digit mobile number."
                );

                return;
            }


            // Create request

            const bloodRequest = {

                id: Date.now(),

                patientName: patientName,

                bloodGroup: bloodGroup,

                location: location,

                requiredDate: requiredDate,

                emergencyLevel: emergencyLevel,

                contact: contact,

                message: message,

                status: "Pending",

                createdAt: new Date().toISOString()

            };


            // Get old requests

            let requests =
                JSON.parse(
                    localStorage.getItem(
                        "raktasetu-blood-requests"
                    )
                ) || [];


            // Add new request

            requests.push(bloodRequest);


            // Save

            localStorage.setItem(
                "raktasetu-blood-requests",
                JSON.stringify(requests)
            );


            alert(
                "Blood request created successfully!"
            );


            bloodRequestForm.reset();

        }
    );

}



// ==========================================
// LOAD REQUESTER DASHBOARD
// ==========================================

function loadRequesterDashboard() {

    const requestsList =
        document.getElementById("myRequestsList");

    if (!requestsList) {
        return;
    }


    // Get requests

    const requests =
        JSON.parse(
            localStorage.getItem(
                "raktasetu-blood-requests"
            )
        ) || [];


    // Statistics

    const total =
        requests.length;

    const pending =
        requests.filter(
            request =>
                request.status === "Pending"
        ).length;

    const accepted =
        requests.filter(
            request =>
                request.status === "Accepted"
        ).length;

    const rejected =
        requests.filter(
            request =>
                request.status === "Rejected"
        ).length;


    // Update stats

    document.getElementById(
        "totalRequests"
    ).textContent = total;

    document.getElementById(
        "pendingRequests"
    ).textContent = pending;

    document.getElementById(
        "acceptedRequests"
    ).textContent = accepted;

    document.getElementById(
        "rejectedRequests"
    ).textContent = rejected;


    // Empty state

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
                    You have not created any blood request yet.
                </p>

                <a
                    href="create-request.html"
                    class="create-new-request-btn"
                >
                    + Create Blood Request
                </a>

            </div>

        `;

        return;
    }


    // Clear old HTML

    requestsList.innerHTML = "";


    // Display requests

    requests
        .slice()
        .reverse()
        .forEach(function (request) {

            const statusClass =
                request.status.toLowerCase();


            const card = document.createElement("div");

            card.className =
                "my-request-card";


            card.innerHTML = `

                <div class="my-request-header">

                    <div>

                        <h3>
                            ${request.bloodGroup}
                            Blood Required
                        </h3>

                        <span class="request-id">
                            Request ID: ${request.id}
                        </span>

                    </div>

                    <span
                        class="my-request-status status-${statusClass}"
                    >
                        ${request.status}
                    </span>

                </div>


                <div class="my-request-details">


                    <div class="my-request-detail">

                        <span class="my-request-detail-icon">
                            👤
                        </span>

                        <div>

                            <small>
                                Patient
                            </small>

                            <strong>
                                ${request.patientName}
                            </strong>

                        </div>

                    </div>


                    <div class="my-request-detail">

                        <span class="my-request-detail-icon">
                            📍
                        </span>

                        <div>

                            <small>
                                Location
                            </small>

                            <strong>
                                ${request.location}
                            </strong>

                        </div>

                    </div>


                    <div class="my-request-detail">

                        <span class="my-request-detail-icon">
                            📅
                        </span>

                        <div>

                            <small>
                                Required Date
                            </small>

                            <strong>
                                ${formatRequestDate(
                                    request.requiredDate
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="my-request-detail">

                        <span class="my-request-detail-icon">
                            🚨
                        </span>

                        <div>

                            <small>
                                Emergency
                            </small>

                            <strong>
                                ${request.emergencyLevel}
                            </strong>

                        </div>

                    </div>


                </div>


                <div class="my-request-message">

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

            `;


            requestsList.appendChild(card);

        });

}



// ==========================================
// FORMAT DATE
// ==========================================

function formatRequestDate(date) {

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

                localStorage.removeItem(
                    "raktasetu-login-email"
                );

                window.location.href =
                    "../login.html";

            }

        }
    );

}



// ==========================================
// RUN DASHBOARD
// ==========================================

loadRequesterDashboard();