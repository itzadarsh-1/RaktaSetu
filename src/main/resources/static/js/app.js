
'use strict';

// ============================================
// COMMON HELPERS
// ============================================

const $ = s => document.querySelector(s);

const esc = s => String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c])
);

const csrf = () => {
    let meta = document.querySelector('meta[name="_csrf"]');

    if (meta && meta.content) return meta.content;

    let c = document.cookie.split('; ')
        .find(x => x.startsWith('XSRF-TOKEN='));

    return c
        ? decodeURIComponent(c.split('=').slice(1).join('='))
        : '';
};

async function api(url, opts = {}) {
    let h = {
        'Content-Type': 'application/json',
        ...(opts.headers || {})
    };

    if (
        opts.method &&
        !['GET', 'HEAD'].includes(opts.method.toUpperCase())
    ) {
        h['X-XSRF-TOKEN'] = csrf();
    }

    let res = await fetch(url, {
        credentials: 'same-origin',
        ...opts,
        headers: h
    });

    let obj = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw Error(
            obj.message ||
            obj.detail ||
            `Request failed (${res.status})`
        );
    }

    return obj;
}

function feedback(el, msg, ok = false) {
    if (!el) return;

    el.textContent = msg;
    el.classList.toggle('ok', ok);
}

function payload(f) {
    return Object.fromEntries(new FormData(f).entries());
}

const bloodOptions = [
    'A+', 'A-', 'B+', 'B-',
    'AB+', 'AB-', 'O+', 'O-'
];

let me = null;
let donors = [];
let map = null;
let markers = null;


// ============================================
// MAIN INITIALIZATION
// ============================================

async function init() {

    if ($('#csrfLogin')) {
        $('#csrfLogin').value = csrf();

        if (location.search.includes('error')) {
            feedback(
                $('#loginStatus'),
                'Incorrect email or password.'
            );
        }
    }

    document.querySelectorAll('.csrf-field')
        .forEach(e => e.value = csrf());


    // REGISTRATION

    if ($('#registerForm')) {

        const roleInput = () =>
            document.querySelector(
                'input[name="role"]:checked'
            ).value;

        const display = () => {
            let donor = roleInput() === 'DONOR';

            $('#bloodField').hidden = !donor;
            $('#bloodField select').required = donor;
        };

        document.querySelectorAll('input[name="role"]')
            .forEach(x =>
                x.addEventListener('change', display)
            );

        
        // ============================================
        // HOMEPAGE REGISTRATION ROLE SELECTION
        // Supports:
        // /register?role=DONOR
        // /register?role=REQUESTER
        // ============================================

        const selectedRole = new URLSearchParams(
            window.location.search
        ).get('role');

        if (
            selectedRole === 'DONOR' ||
            selectedRole === 'REQUESTER'
        ) {
            const roleRadio = document.querySelector(
                `input[name="role"][value="${selectedRole}"]`
            );

            if (roleRadio) {
                roleRadio.checked = true;
            }
        }

        // Update donor-specific registration fields
        display();


        $('#registerForm').addEventListener(
            'submit',
            async e => {

                e.preventDefault();

                let p = payload(e.target);

                if (
                    !p.password ||
                    p.password.trim().length === 0
                ) {
                    return feedback(
                        $('#message'),
                        'Password cannot be empty.'
                    );
                }

                if (p.password.length > 128) {
                    return feedback(
                        $('#message'),
                        'Password is too long.'
                    );
                }

                if (p.password !== p.confirm) {
                    return feedback(
                        $('#message'),
                        'Passwords do not match.'
                    );
                }

                delete p.confirm;
                p.role = roleInput();

                try {
                    let r = await api(
                        '/api/auth/register',
                        {
                            method: 'POST',
                            body: JSON.stringify(p)
                        }
                    );

                    feedback(
                        $('#message'),
                        r.message +
                        ' Redirecting to login...',
                        true
                    );

                    setTimeout(() => {
                        location.href = '/login';
                    }, 1200);

                } catch (err) {
                    feedback(
                        $('#message'),
                        err.message
                    );
                }
            }
        );
    }


    // DASHBOARD INITIALIZATION

    if (!document.body.dataset.role) return;

    try {
        me = await api('/api/me');

        if ($('#sideName')) {
            $('#sideName').textContent = me.name;
        }

       
        loadProfilePhoto();
        setupPhotoUpload();

        fillProfile();
        setupProfile();


        if (me.role === 'DONOR') {
            await loadDonor();
        }

        if (me.role === 'REQUESTER') {
            await loadRequester();
        }

        if (me.role === 'ADMIN') {
            await loadAdmin();
        }

    } catch (err) {
        console.error(err);

        if (err.message.includes('401')) {
            location.href = '/login';
        } else {
            alert(
                'Failed to load dashboard: ' +
                err.message
            );
        }
    }
}


// ============================================
// PROFILE MANAGEMENT
// ============================================

function fillProfile() {
    let f = $('#profileForm');

    if (!f) return;

    ['name', 'mobile', 'city', 'bloodGroup']
        .forEach(k => {
            if (f.elements[k]) {
                f.elements[k].value = me[k] ?? '';
            }
        });
}

function setupProfile() {
    const form = $('#profileForm');

    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            me = await api('/api/me', {
                method: 'PUT',
                body: JSON.stringify(payload(e.target))
            });

            feedback(
                $('#profileMessage'),
                'Profile updated.',
                true
            );

            if ($('#sideName')) {
                $('#sideName').textContent = me.name;
            }

        } catch (err) {
            feedback(
                $('#profileMessage'),
                err.message
            );
        }
    });
}


// ============================================
// DONOR DASHBOARD - SEPARATE PAGES
// ============================================

function donorPage() {
    return document.body.dataset.page || 'dashboard';
}

function donorRequestHtml(r) {
    const pending = r.status === 'PENDING';

    return `
        <div class="requestrow">

            <strong>
                ${esc(r.bloodGroup)} · ${esc(r.city)}
            </strong>

            <span class="pill ${esc(r.status)}">
                ${esc(r.status)}
            </span>

            <p>
                ${esc(
                    r.hospital ||
                    'Hospital not specified'
                )}
                · ${esc(r.urgency || 'NORMAL')}
                · ${esc(r.unitsRequired ?? 'N/A')}
                unit(s)
            </p>

            ${r.message ? `
                <p>${esc(r.message)}</p>
            ` : ''}

            ${pending ? `
                <div class="actions">

                    <button
                        type="button"
                        class="btn"
                        data-request-id="${esc(r.id)}"
                        data-decision="ACCEPTED">
                        Accept
                    </button>

                    <button
                        type="button"
                        class="btn outline"
                        data-request-id="${esc(r.id)}"
                        data-decision="REJECTED">
                        Reject
                    </button>

                </div>
            ` : ''}

        </div>
    `;
}

async function loadDonor() {
    const page = donorPage();

    document.querySelectorAll('.sidebar [data-nav]')
        .forEach(link => {

            const active =
                link.dataset.nav === page;

            link.classList.toggle('active', active);

            if (active) {
                link.setAttribute(
                    'aria-current',
                    'page'
                );
            } else {
                link.removeAttribute(
                    'aria-current'
                );
            }
        });

    if (page === 'dashboard') {
        await loadDonorRequests(true);
    }

    else if (page === 'requests') {
        await loadDonorRequests(false);
    }

    else if (page === 'availability') {
        setupDonorAvailability();
        setupDonorLocation();
    }

    // Profile uses fillProfile() and setupProfile().
}

async function loadDonorRequests(
    recentOnly = false
) {
    const group = $('#statGroup');

    if (group) {
        group.textContent =
            me.bloodGroup || '--';
    }

    const list = $('#requestList');

    if (list) {
        list.innerHTML =
            '<p class="muted">Loading blood requests...</p>';
    }

    try {
        const reqs = await api(
            '/api/donor/requests'
        );

        if (!Array.isArray(reqs)) {
            throw Error(
                'Invalid requests response.'
            );
        }

        const total = reqs.length;

        const pending = reqs.filter(
            r => r.status === 'PENDING'
        ).length;

        const accepted = reqs.filter(
            r => r.status === 'ACCEPTED'
        ).length;

        if ($('#statTotal')) {
            $('#statTotal').textContent = total;
        }

        if ($('#statPending')) {
            $('#statPending').textContent = pending;
        }

        if ($('#statAccepted')) {
            $('#statAccepted').textContent =
                accepted;
        }

        if (!list) return;

        const sorted = [...reqs].sort(
            (a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
        );

        const visible = recentOnly
            ? sorted.slice(0, 5)
            : sorted;

        list.innerHTML = visible.length
            ? visible.map(donorRequestHtml).join('')
            : `
                <p class="muted">
                    No matching requests yet.
                </p>
            `;

        list.querySelectorAll(
            '[data-request-id][data-decision]'
        ).forEach(button => {

            button.addEventListener(
                'click',
                async () => {

                    const id = Number(
                        button.dataset.requestId
                    );

                    const decision =
                        button.dataset.decision;

                    await respond(id, decision);
                }
            );
        });

    } catch (err) {
        console.error(
            'Donor requests error:',
            err
        );

        if (list) {
            list.textContent = err.message;
        }

        feedback(
            $('#requestActionMessage'),
            err.message
        );
    }
}


// ============================================
// DONOR AVAILABILITY
// ============================================

function setupDonorAvailability() {
    const toggle = $('#availabilityToggle');

    if (!toggle) return;

    toggle.checked = Boolean(me.available);

    toggle.addEventListener(
        'change',
        async () => {

            const previous =
                Boolean(me.available);

            const requested =
                toggle.checked;

            toggle.disabled = true;

            try {
                const updated = await api(
                    '/api/me',
                    {
                        method: 'PUT',
                        body: JSON.stringify({
                            available: requested
                        })
                    }
                );

                me = updated;

                toggle.checked =
                    Boolean(me.available);

                feedback(
                    $('#availabilityMessage'),
                    me.available
                        ? 'You are now available to donate.'
                        : 'You are now unavailable to donate.',
                    true
                );

            } catch (err) {

                toggle.checked = previous;

                feedback(
                    $('#availabilityMessage'),
                    err.message
                );

            } finally {
                toggle.disabled = false;
            }
        }
    );
}


// ============================================
// DONOR LOCATION SHARING
// ============================================

function setupDonorLocation() {
    const button = $('#shareLocation');

    if (!button) return;

    button.addEventListener('click', () => {

        if (!navigator.geolocation) {
            feedback(
                $('#locationMessage'),
                'Geolocation is not supported by this browser.'
            );
            return;
        }

        button.disabled = true;

        feedback(
            $('#locationMessage'),
            'Getting your current location...'
        );

        navigator.geolocation.getCurrentPosition(

            async position => {

                try {
                    me = await api('/api/me', {
                        method: 'PUT',
                        body: JSON.stringify({
                            latitude:
                                position.coords.latitude,
                            longitude:
                                position.coords.longitude
                        })
                    });

                    feedback(
                        $('#locationMessage'),
                        'Your map location has been saved successfully.',
                        true
                    );

                } catch (err) {
                    feedback(
                        $('#locationMessage'),
                        err.message
                    );

                } finally {
                    button.disabled = false;
                }
            },

            error => {

                let message =
                    'Unable to get your location.';

                if (error.code === 1) {
                    message =
                        'Location permission denied.';
                } else if (error.code === 2) {
                    message =
                        'Location unavailable.';
                } else if (error.code === 3) {
                    message =
                        'Location request timed out.';
                }

                feedback(
                    $('#locationMessage'),
                    message
                );

                button.disabled = false;
            },

            {
                enableHighAccuracy: false,
                timeout: 12000,
                maximumAge: 0
            }
        );
    });
}


// ============================================
// DONOR ACCEPT / REJECT
// ============================================

async function respond(id, decision) {

    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        feedback(
            $('#requestActionMessage'),
            'Invalid request ID.'
        );
        return;
    }

    if (
        !['ACCEPTED', 'REJECTED']
            .includes(decision)
    ) {
        return;
    }

    const action =
        decision === 'ACCEPTED'
            ? 'accept'
            : 'reject';

    if (
        !confirm(
            `Are you sure you want to ${action} this blood request?`
        )
    ) {
        return;
    }

    const buttons = document.querySelectorAll(
        '[data-request-id][data-decision]'
    );

    buttons.forEach(button => {
        button.disabled = true;
    });

    try {
        await api(
            `/api/donor/requests/${id}/respond?decision=${decision}`,
            {
                method: 'POST'
            }
        );

        feedback(
            $('#requestActionMessage'),
            `Request ${decision.toLowerCase()} successfully.`,
            true
        );

        await loadDonorRequests(
            donorPage() === 'dashboard'
        );

    } catch (err) {

        feedback(
            $('#requestActionMessage'),
            err.message
        );

        alert(
            'Request update failed: ' +
            err.message
        );

    } finally {
        buttons.forEach(button => {
            button.disabled = false;
        });
    }
}

window.respond = respond;


// ============================================
// REQUESTER DASHBOARD - SEPARATE PAGES
// ============================================

function requesterPage() {
    return document.body.dataset.page || 'dashboard';
}

function requesterRequestHtml(r) {
    const created = r.createdAt
        ? new Date(r.createdAt).toLocaleString()
        : 'Unknown';

    return `
        <div class="requestrow">

            <strong>
                ${esc(r.bloodGroup)} · ${esc(r.city)}
            </strong>

            <span class="pill ${esc(r.status)}">
                ${esc(r.status)}
            </span>

            <p>
                Hospital:
                ${esc(r.hospital || 'Not specified')}
                · Urgency:
                ${esc(r.urgency || 'NORMAL')}
            </p>

            <p>
                Donor:
                ${esc(
                    r.donor?.name ||
                    'Awaiting donor'
                )}
            </p>

            <p class="muted">
                Created: ${esc(created)}
            </p>
                
            ${r.status === 'PENDING' ? `
                <div class="actions" style="margin-top: 12px;">
                    <button
                        type="button"
                        class="btn outline"
                        data-cancel-request="${esc(r.id)}">
                        Cancel Request
                    </button>
                </div>
            ` : ''}

        </div>
    `;
}

async function loadRequester() {
    const page = requesterPage();

    document.querySelectorAll('.sidebar [data-nav]')
        .forEach(link => {

            const active =
                link.dataset.nav === page;

            link.classList.toggle(
                'active',
                active
            );

            if (active) {
                link.setAttribute(
                    'aria-current',
                    'page'
                );
            } else {
                link.removeAttribute(
                    'aria-current'
                );
            }
        });

    if (
        page === 'dashboard' ||
        page === 'my-requests'
    ) {
        await refreshRequests();
    }

    else if (page === 'raise-request') {
        setupRequesterForm();
    }

    else if (page === 'find-donors') {
        const form = $('#searchForm');

        if (form) {
            form.addEventListener(
                'submit',
                async e => {
                    e.preventDefault();
                    await searchDonors();
                }
            );

            await searchDonors();
        }
    }

    // Profile uses fillProfile() and setupProfile().
}


// ============================================
// REQUESTER RAISE REQUEST
// ============================================

function setupRequesterForm() {
    const form = $('#requestForm');

    if (!form) return;

    if (
        me?.city &&
        !form.elements.city.value
    ) {
        form.elements.city.value = me.city;
    }

    const params = new URLSearchParams(
        location.search
    );

    const donorId =
        params.get('donorId');

    const bloodGroup =
        params.get('bloodGroup');

    const city =
        params.get('city');

    if (bloodOptions.includes(bloodGroup)) {
        form.elements.bloodGroup.value =
            bloodGroup;
    }

    if (city) {
        form.elements.city.value = city;
    }

    if (
        donorId &&
        /^[1-9]\d*$/.test(donorId)
    ) {
        form.dataset.donorId = donorId;

        feedback(
            $('#requestMessage'),
            'Selected donor ID: ' +
            donorId +
            '. Fill the form to send the request.'
        );
    }

    form.addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            if (!form.reportValidity()) return;

            const data = payload(form);

            data.unitsRequired = Number(
                data.unitsRequired
            );

            if (
                !Number.isInteger(
                    data.unitsRequired
                ) ||
                data.unitsRequired < 1 ||
                data.unitsRequired > 20
            ) {
                feedback(
                    $('#requestMessage'),
                    'Units required must be between 1 and 20.'
                );
                return;
            }

            if (form.dataset.donorId) {
                data.donorId = Number(
                    form.dataset.donorId
                );
            }

            const button = form.querySelector(
                'button[type="submit"]'
            );

            if (button) {
                button.disabled = true;
            }

            try {
                await api(
                    '/api/requester/requests',
                    {
                        method: 'POST',
                        body: JSON.stringify(data)
                    }
                );

                feedback(
                    $('#requestMessage'),
                    'Blood request submitted successfully.',
                    true
                );

                form.reset();

                delete form.dataset.donorId;

                history.replaceState(
                    null,
                    '',
                    location.pathname
                );

                if (me?.city) {
                    form.elements.city.value =
                        me.city;
                }

            } catch (err) {
                feedback(
                    $('#requestMessage'),
                    err.message
                );

            } finally {
                if (button) {
                    button.disabled = false;
                }
            }
        }
    );
}


// ============================================
// REQUESTER MY REQUESTS
// ============================================

async function refreshRequests() {
    const reqs = await api(
        '/api/requester/requests'
    );

    if (!Array.isArray(reqs)) {
        throw Error(
            'Invalid requests response'
        );
    }

    if ($('#statTotal')) {
        $('#statTotal').textContent =
            reqs.length;
    }

    if ($('#statPending')) {
        $('#statPending').textContent =
            reqs.filter(
                r => r.status === 'PENDING'
            ).length;
    }

    if ($('#statAccepted')) {
        $('#statAccepted').textContent =
            reqs.filter(
                r => r.status === 'ACCEPTED'
            ).length;
    }

    const list = $('#requestList');

    if (!list) return;

    const sorted = [...reqs].sort(
        (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
    );

    const visible =
        requesterPage() === 'dashboard'
            ? sorted.slice(0, 5)
            : sorted;

    list.innerHTML = visible.length
        ? visible.map(
            requesterRequestHtml
        ).join('')
        : `
            <p class="muted">
                No requests yet.
                <a href="/dashboard/raise-request">
                    Raise a request
                </a>.
            </p>

         `;
         
    // CANCEL REQUEST BUTTON EVENTS

    list.querySelectorAll('[data-cancel-request]')
        .forEach(button => {

            button.addEventListener('click', async () => {

                const id = Number(
                    button.dataset.cancelRequest
                );

                if (!Number.isSafeInteger(id) || id <= 0) {
                    alert('Invalid request ID.');
                    return;
                }

                if (!confirm(
                    'Are you sure you want to cancel this blood request?'
                )) {
                    return;
                }

                button.disabled = true;

                try {

                    await api(
                        `/api/requester/requests/${id}/cancel`,
                        {
                            method: 'PUT'
                        }
                    );

                    await refreshRequests();

                    alert(
                        'Blood request cancelled successfully.'
                    );

                } catch (error) {

                    alert(
                        'Unable to cancel request: ' +
                        error.message
                    );

                    button.disabled = false;
                }
            });
        });

}


// ============================================
// REQUESTER FIND DONORS
// ============================================

async function searchDonors() {
    const form = $('#searchForm');
    const results = $('#donorResults');

    if (!form || !results) return;

    results.innerHTML =
        '<p class="muted">Searching donors...</p>';

    try {
        donors = await api(
            '/api/public/donors?' +
            new URLSearchParams(
                payload(form)
            )
        );

        if (!Array.isArray(donors)) {
            throw Error(
                'Invalid donors response'
            );
        }

        results.innerHTML = donors.length
            ? donors.map(d => `
                <div class="donorrow">

                    <strong>
                        ${esc(d.name)}
                    </strong>

                    <span class="pill">
                        ${esc(d.bloodGroup)}
                    </span>

                    <p>
                        ${esc(
                            d.city || 'Unknown'
                        )}
                        ${d.state
                            ? ', ' + esc(d.state)
                            : ''}
                    </p>

                    <button
                        type="button"
                        class="btn"
                        data-donor-id="${esc(d.id)}">
                        Request Donor
                    </button>

                </div>
            `).join('')
            : `
                <p class="muted">
                    No available donors matching your search.
                </p>
            `;

        results.querySelectorAll(
            '[data-donor-id]'
        ).forEach(button => {

            button.addEventListener(
                'click',
                () => {
                    requestDonor(
                        Number(
                            button.dataset.donorId
                        )
                    );
                }
            );
        });

        renderMap();

    } catch (err) {
        results.textContent = err.message;
    }
}

function requestDonor(id) {
    const d = donors.find(
        x => Number(x.id) === Number(id)
    );

    if (!d) {
        alert(
            'Selected donor not found.'
        );
        return;
    }

    const params = new URLSearchParams({
        donorId: String(d.id),
        bloodGroup: d.bloodGroup || '',
        city: d.city || ''
    });

    location.href =
        '/dashboard/raise-request?' +
        params;
}

window.requestDonor = requestDonor;


// ============================================
// REQUESTER DONOR MAP
// ============================================

function renderMap() {
    if (
        !$('#donorMap') ||
        !window.L
    ) return;

    const located = donors.filter(d =>
        d.latitude != null &&
        d.longitude != null &&
        Number.isFinite(
            Number(d.latitude)
        ) &&
        Number.isFinite(
            Number(d.longitude)
        ) &&
        Number(d.latitude) >= -90 &&
        Number(d.latitude) <= 90 &&
        Number(d.longitude) >= -180 &&
        Number(d.longitude) <= 180
    );

    if (!map) {
        map = L.map('donorMap')
            .setView(
                [22.9734, 78.6569],
                4
            );

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution:
                    '© OpenStreetMap contributors',
                maxZoom: 18
            }
        ).addTo(map);

        markers = L.layerGroup()
            .addTo(map);
    }

    markers.clearLayers();

    const points = [];

    located.forEach(d => {
        const point = [
            Number(d.latitude),
            Number(d.longitude)
        ];

        points.push(point);

        L.marker(point)
            .addTo(markers)
            .bindPopup(
                `${esc(d.name)} · ${esc(d.bloodGroup)}`
            );
    });

    if (points.length) {
        map.fitBounds(points, {
            maxZoom: 12,
            padding: [30, 30]
        });
    }

    setTimeout(
        () => map.invalidateSize(),
        100
    );
}


// ============================================
// ADMIN DASHBOARD - SEPARATE PAGES
// ============================================

function adminPage() {
    return document.body.dataset.page || 'dashboard';
}

function setAdminActiveNav() {
    const page = adminPage();

    document.querySelectorAll('.sidebar [data-nav]')
        .forEach(link => {

            const active =
                link.dataset.nav === page;

            link.classList.toggle('active', active);

            if (active) {
                link.setAttribute(
                    'aria-current',
                    'page'
                );
            } else {
                link.removeAttribute(
                    'aria-current'
                );
            }
        });
}


// ============================================
// LOAD ADMIN CURRENT PAGE
// ============================================

async function loadAdmin() {

    setAdminActiveNav();

    const page = adminPage();

    
if (page === 'dashboard') {
    await loadAdminStats();
    await loadAdminDonutChart();
    await loadAdminRecentRequests();
}


    else if (page === 'users') {
        await loadAdminUsers();
    }

    else if (page === 'requests') {
        await loadAdminRequests();
    }
}

// ============================================
// ADMIN DASHBOARD STATISTICS
// ============================================

async function loadAdminStats() {

    const stats = await api(
        '/api/admin/stats'
    );

    const ids = {
        statUsers: 'users',
        statDonors: 'donors',
        statActive: 'activeDonors',
        statRequests: 'requests',
        statPending: 'pending',
        statAccepted: 'accepted'
    };

    Object.entries(ids).forEach(([id, key]) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                stats[key] ?? 0;
        }
    });
}

/* ==========================================
   ADMIN DONUT CHART
========================================== */

async function loadAdminDonutChart() {

    const chart = document.getElementById(
        'adminDonutChart'
    );

    if (!chart) return;

    try {
        const stats = await api('/api/admin/stats');

        const total = Math.max(
            0,
            Number(stats.requests) || 0
        );

        const pending = Math.max(
            0,
            Number(stats.pending) || 0
        );

        const accepted = Math.max(
            0,
            Number(stats.accepted) || 0
        );

        const others = Math.max(
            0,
            total - pending - accepted
        );

        const pendingPct = total
            ? (pending / total) * 100
            : 0;

        const acceptedPct = total
            ? (accepted / total) * 100
            : 0;

        const othersPct = total
            ? (others / total) * 100
            : 0;

        const pendingEnd = pendingPct;
        const acceptedEnd = pendingPct + acceptedPct;

        chart.style.background = total
            ? `conic-gradient(
                #f5b400 0% ${pendingEnd}%,
                #22c55e ${pendingEnd}% ${acceptedEnd}%,
                #a3a3a3 ${acceptedEnd}% 100%
            )`
            : '#e5e7eb';

        document.getElementById(
            'adminDonutTotal'
        ).textContent = total;

        document.getElementById(
            'adminDonutPending'
        ).textContent =
            `${pending} (${Math.round(pendingPct)}%)`;

        document.getElementById(
            'adminDonutAccepted'
        ).textContent =
            `${accepted} (${Math.round(acceptedPct)}%)`;

        document.getElementById(
            'adminDonutOthers'
        ).textContent =
            `${others} (${Math.round(othersPct)}%)`;

        chart.setAttribute(
            'aria-label',
            `Total ${total} requests. ` +
            `${pending} pending, ` +
            `${accepted} accepted, ` +
            `${others} other statuses.`
        );

    } catch (error) {
        console.error(
            'Admin donut chart error:',
            error
        );
    }
}


// ============================================
// ADMIN DASHBOARD - RECENT BLOOD REQUESTS
// ============================================

async function loadAdminRecentRequests() {

    const list = document.getElementById('adminRecentRequests');

    if (!list) return;

    list.innerHTML =
        '<p class="muted">Loading recent requests...</p>';

    try {

        const requests = await api('/api/admin/requests');

        if (!Array.isArray(requests)) {
            throw new Error('Invalid requests response.');
        }

        const recent = [...requests]
            .sort((a, b) => {
                const dateA = Date.parse(a.createdAt || '') || 0;
                const dateB = Date.parse(b.createdAt || '') || 0;

                return dateB - dateA ||
                    Number(b.id || 0) - Number(a.id || 0);
            })
            .slice(0, 5);

        if (recent.length === 0) {
            list.innerHTML =
                '<p class="muted">No blood requests found.</p>';
            return;
        }

        list.innerHTML = `
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Blood Group</th>
                            <th>Location</th>
                            <th>Urgency</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${recent.map(r => `
                            <tr>
                                <td>#${esc(r.id)}</td>

                                <td>
                                    <strong>
                                        ${esc(r.bloodGroup || '--')}
                                    </strong>
                                </td>

                                <td>${esc(r.city || '--')}</td>

                                <td>${esc(r.urgency || 'NORMAL')}</td>

                                <td>
                                    <span class="pill ${esc(r.status || '')}">
                                        ${esc(r.status || '--')}
                                    </span>
                                </td>

                                <td>
                                    <a href="/admin/requests?requestId=${encodeURIComponent(r.id)}"
                                       class="btn outline">
                                        View Details
                                    </a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {

        console.error('Recent requests error:', error);

        list.textContent =
            'Unable to load recent requests: ' + error.message;
    }
}

// ============================================
// ADMIN MANAGE USERS
// ============================================

async function loadAdminUsers() {

    const list = $('#usersList');

    if (!list) return;

    list.innerHTML =
        '<p class="muted">Loading users...</p>';

    try {

        const users = await api(
            '/api/admin/users'
        );

        if (!Array.isArray(users)) {
            throw Error(
                'Invalid users response.'
            );
        }

        if (users.length === 0) {
            list.innerHTML = `
                <p class="muted">
                    No registered users found.
                </p>
            `;
            return;
        }

        list.innerHTML = `
            <table>

                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Blood Group</th>
                        <th>City</th>
                        <th>Enabled</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>

                    ${users.map(u => `
                        <tr>

                            <td>
                                ${esc(u.name)}
                            </td>

                            <td>
                                ${esc(u.email)}
                            </td>

                            <td>
                                ${esc(u.role)}
                            </td>

                            <td>
                                ${esc(u.bloodGroup)}
                            </td>

                            <td>
                                ${esc(u.city)}
                            </td>

                            <td>
                                ${u.enabled
                                    ? 'Yes'
                                    : 'No'}
                            </td>

                            <td>
                                ${u.role === 'ADMIN'
                                    ? '—'
                                    : `
                                        <button
                                            type="button"
                                            data-toggle-user="${esc(u.id)}">
                                            ${u.enabled
                                                ? 'Disable'
                                                : 'Enable'}
                                        </button>
                                    `}
                            </td>

                        </tr>
                    `).join('')}

                </tbody>

            </table>
        `;

        list.querySelectorAll(
            '[data-toggle-user]'
        ).forEach(button => {

            button.addEventListener(
                'click',
                async () => {

                    const id = Number(
                        button.dataset.toggleUser
                    );

                    await toggleUser(id);
                }
            );
        });

    } catch (err) {

        console.error(
            'Admin users error:',
            err
        );

        list.textContent = err.message;

        feedback(
            $('#adminUserMessage'),
            err.message
        );
    }
}


// ============================================
// ADMIN ENABLE / DISABLE USER
// ============================================

async function toggleUser(id) {

    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return;
    }

    if (
        !confirm(
            'Change this user account status?'
        )
    ) {
        return;
    }

    try {

        await api(
            '/api/admin/users/' +
            id +
            '/toggle',
            {
                method: 'PUT'
            }
        );

        feedback(
            $('#adminUserMessage'),
            'User account status updated successfully.',
            true
        );

        await loadAdminUsers();

    } catch (err) {

        feedback(
            $('#adminUserMessage'),
            err.message
        );

        alert(
            'Failed to update user: ' +
            err.message
        );
    }
}

window.toggleUser = toggleUser;


// ============================================
// ADMIN BLOOD REQUESTS
// ============================================



async function loadAdminRequests() {

    const list = $('#requestList');
    if (!list) return;

    const activeTab = $('#activeRequestsTab');
    const archivedTab = $('#archivedRequestsTab');
    const activeCount = $('#activeRequestsCount');
    const archivedCount = $('#archivedRequestsCount');

    // Remember selected tab when refreshing the table.
    const currentTab = list.dataset.archiveTab || 'active';

    list.innerHTML =
        '<p class="muted">Loading blood requests...</p>';

    try {
        const reqs = await api('/api/admin/requests');

        if (!Array.isArray(reqs)) {
            throw Error('Invalid requests response.');
        }

        const active = reqs.filter(r => !r.archived);
        const archived = reqs.filter(r => r.archived);

        if (activeCount) {
            activeCount.textContent = active.length;
        }

        if (archivedCount) {
            archivedCount.textContent = archived.length;
        }

        function selectTab(tab) {
            list.dataset.archiveTab = tab;

            if (activeTab) {
                activeTab.classList.toggle(
                    'active', tab === 'active'
                );
                activeTab.setAttribute(
                    'aria-pressed', String(tab === 'active')
                );
            }

            if (archivedTab) {
                archivedTab.classList.toggle(
                    'active', tab === 'archived'
                );
                archivedTab.setAttribute(
                    'aria-pressed', String(tab === 'archived')
                );
            }
        }

        if (activeTab) {
            activeTab.onclick = () => {
                list.dataset.archiveTab = 'active';
                loadAdminRequests();
            };
        }

        if (archivedTab) {
            archivedTab.onclick = () => {
                list.dataset.archiveTab = 'archived';
                loadAdminRequests();
            };
        }

        selectTab(currentTab);

        const params = new URLSearchParams(
            window.location.search
        );

        const selectedId = params.get('requestId');

        const visible = currentTab === 'archived'
            ? archived
            : active;

        const sortedRequests = [...visible].sort((a, b) => {
            if (selectedId) {
                if (String(a.id) === selectedId) return -1;
                if (String(b.id) === selectedId) return 1;
            }
            return Number(b.id || 0) - Number(a.id || 0);
        });

        if (sortedRequests.length === 0) {
            list.innerHTML = `
                <p class="muted">
                    ${currentTab === 'archived'
                        ? 'No archived requests found.'
                        : 'No active blood requests found.'}
                </p>
            `;
            return;
        }

        list.innerHTML = `
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Requester</th>
                            <th>Donor</th>
                            <th>Group</th>
                            <th>City</th>
                            <th>Urgency</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedRequests.map(r => {

                            const selected =
                                selectedId &&
                                String(r.id) === selectedId;

                            const canArchive = [
                                'COMPLETED',
                                'CANCELLED',
                                'REJECTED'
                            ].includes(r.status);

                            return `
                                <tr
                                    ${selected
                                        ? 'id="selectedAdminRequest"'
                                        : ''}
                                    style="${selected
                                        ? 'background-color:#fff3cd;'
                                        : ''}"
                                >
                                    <td>#${esc(r.id)}</td>
                                    <td>${esc(r.requester?.name || '--')}</td>
                                    <td>${esc(r.donor?.name || 'Open')}</td>
                                    <td>${esc(r.bloodGroup || '--')}</td>
                                    <td>${esc(r.city || '--')}</td>
                                    <td>${esc(r.urgency || 'NORMAL')}</td>
                                    <td>
                                        <span class="pill ${esc(r.status || '')}">
                                            ${esc(r.status || '--')}
                                        </span>
                                    </td>
                                    <td>
                                        ${!r.archived && r.status === 'ACCEPTED'
                                            ? `
                                                <button
                                                    type="button"
                                                    data-complete-request="${esc(r.id)}">
                                                    Complete
                                                </button>
                                            `
                                            : ''}

                                        ${r.archived
                                            ? `
                                                <button
                                                    type="button"
                                                    class="admin-archive-action admin-restore-btn"
                                                    data-restore-request="${esc(r.id)}">
                                                    Restore
                                                </button>
                                            `
                                            : canArchive
                                                ? `
                                                    <button
                                                        type="button"
                                                        class="admin-archive-action admin-archive-btn"
                                                        data-archive-request="${esc(r.id)}">
                                                        Archive
                                                    </button>
                                                `
                                                : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const selectedRow = $('#selectedAdminRequest');

        if (selectedRow) {
            selectedRow.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

        // Existing Complete action
        list.querySelectorAll('[data-complete-request]')
            .forEach(button => {
                button.addEventListener('click', async () => {
                    await completeRequest(
                        Number(button.dataset.completeRequest)
                    );
                });
            });

        // Archive action
        list.querySelectorAll('[data-archive-request]')
            .forEach(button => {
                button.addEventListener('click', async () => {

                    const id = Number(button.dataset.archiveRequest);

                    if (!confirm(
                        `Archive blood request #${id}?`
                    )) return;

                    button.disabled = true;

                    try {
                        await api(
                            `/api/admin/requests/${id}/archive`,
                            { method: 'PUT' }
                        );

                        feedback(
                            $('#adminRequestMessage'),
                            'Blood request archived successfully.',
                            true
                        );

                        await loadAdminRequests();

                    } catch (err) {
                        feedback(
                            $('#adminRequestMessage'),
                            err.message
                        );
                        button.disabled = false;
                    }
                });
            });

        // Restore action
        list.querySelectorAll('[data-restore-request]')
            .forEach(button => {
                button.addEventListener('click', async () => {

                    const id = Number(button.dataset.restoreRequest);

                    if (!confirm(
                        `Restore blood request #${id}?`
                    )) return;

                    button.disabled = true;

                    try {
                        await api(
                            `/api/admin/requests/${id}/restore`,
                            { method: 'PUT' }
                        );

                        feedback(
                            $('#adminRequestMessage'),
                            'Blood request restored successfully.',
                            true
                        );

                        await loadAdminRequests();

                    } catch (err) {
                        feedback(
                            $('#adminRequestMessage'),
                            err.message
                        );
                        button.disabled = false;
                    }
                });
            });

    } catch (err) {
        console.error('Admin requests error:', err);
        list.textContent = err.message;

        feedback(
            $('#adminRequestMessage'),
            err.message
        );
    }
}

 // ============================================
 // ADMIN COMPLETE REQUEST
 // ============================================

async function completeRequest(id) {

    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return;
    }

    if (
        !confirm(
            'Mark this blood request as completed?'
        )
    ) {
        return;
    }

    try {

        await api(
            '/api/admin/requests/' +
            id +
            '/complete',
            {
                method: 'PUT'
            }
        );

        feedback(
            $('#adminRequestMessage'),
            'Blood request completed successfully.',
            true
        );

        await loadAdminRequests();

    } catch (err) {

        feedback(
            $('#adminRequestMessage'),
            err.message
        );

        alert(
            'Failed to complete request: ' +
            err.message
        );
    }
}

window.completeRequest = completeRequest;


/* ==========================================
   PROFILE PHOTO UPLOAD / REMOVE
========================================== */

let photoPreviewUrl = null;

async function loadProfilePhoto() {

    const preview = document.getElementById(
        'profilePhotoPreview'
    );

    const placeholder = document.getElementById(
        'photoPlaceholder'
    );

    const avatar = document.querySelector(
        '.sidebar .avatar'
    );

    if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = null;
    }

    try {
        const response = await fetch('/api/me/photo', {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (response.ok) {
            const blob = await response.blob();
            photoPreviewUrl = URL.createObjectURL(blob);
        }

    } catch (error) {
        console.error('Photo loading error:', error);
    }

    // Profile page photo
    if (preview) {

        if (photoPreviewUrl) {
            preview.src = photoPreviewUrl;
            preview.hidden = false;

            if (placeholder) {
                placeholder.hidden = true;
            }

        } else {
            preview.removeAttribute('src');
            preview.hidden = true;

            if (placeholder) {
                placeholder.hidden = false;
            }
        }
    }

    // Sidebar photo
    if (avatar) {

        avatar.replaceChildren();

        if (photoPreviewUrl) {

            const img = document.createElement('img');

            img.src = photoPreviewUrl;
            img.alt = 'Profile photo';

            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '50%';

            avatar.style.overflow = 'hidden';
            avatar.appendChild(img);

        } else {
            avatar.textContent = '♥';
        }
    }
}

function setupPhotoUpload() {

    const input = document.getElementById('photoFile');

    const uploadButton = document.getElementById(
        'uploadPhoto'
    );

    const removeButton = document.getElementById(
        'removePhoto'
    );

    const message = document.getElementById(
        'photoMessage'
    );

    if (!input || !uploadButton || !removeButton) {
        return;
    }

    // File selection
    input.addEventListener('change', () => {

        const file = input.files[0];

        if (!file) return;

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            feedback(
                message,
                'Only JPG, PNG and WebP photos are allowed.'
            );
            input.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            feedback(
                message,
                'Maximum photo size is 2 MB.'
            );
            input.value = '';
            return;
        }

        feedback(message, 'Selected: ' + file.name);
    });

    // Upload photo
    uploadButton.addEventListener('click', async () => {

        const file = input.files[0];

        if (!file) {
            feedback(
                message,
                'Please choose a photo first.'
            );
            return;
        }

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type) ||
            file.size > 2 * 1024 * 1024) {

            feedback(
                message,
                'Choose a JPG, PNG or WebP photo under 2 MB.'
            );
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        uploadButton.disabled = true;

        try {
            const response = await fetch('/api/me/photo', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-XSRF-TOKEN': csrf()
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(
                    'Photo upload failed (' +
                    response.status + ')'
                );
            }

            input.value = '';

            await loadProfilePhoto();

            feedback(
                message,
                'Profile photo uploaded successfully.',
                true
            );

        } catch (error) {
            feedback(message, error.message);

        } finally {
            uploadButton.disabled = false;
        }
    });

    // Remove photo
    removeButton.addEventListener('click', async () => {

        if (!confirm('Remove your profile photo?')) {
            return;
        }

        removeButton.disabled = true;

        try {
            const response = await fetch('/api/me/photo', {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'X-XSRF-TOKEN': csrf()
                }
            });

            if (!response.ok) {
                throw new Error(
                    'Photo removal failed (' +
                    response.status + ')'
                );
            }

            input.value = '';

            await loadProfilePhoto();

            feedback(
                message,
                'Profile photo removed successfully.',
                true
            );

        } catch (error) {
            feedback(message, error.message);

        } finally {
            removeButton.disabled = false;
        }
    });
}

// ============================================
// START APPLICATION
// ============================================

document.addEventListener(
    'DOMContentLoaded',
    init
);
