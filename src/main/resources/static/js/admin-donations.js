
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('donationForm');
    const donorSelect = document.getElementById('donorId');
    const dateInput = document.getElementById('donationDate');
    const tableBody = document.getElementById('donationTableBody');
    const message = document.getElementById('donationMessage');
    const refreshButton = document.getElementById('refreshDonations');

    const csrfToken =
        document.querySelector('meta[name="_csrf"]')
            ?.getAttribute('content');

    const csrfCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='));

    function getCsrfToken() {
        return csrfToken ||
            (csrfCookie
                ? decodeURIComponent(csrfCookie.split('=')[1])
                : '');
    }

    function headers() {
        return {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getCsrfToken()
        };
    }

  
async function request(url, options = {}) {

    let response;

    try {
        response = await fetch(url, {
            credentials: 'same-origin',
            ...options
        });
    } catch (error) {
        throw new Error(
            'Cannot connect to server: ' + error.message
        );
    }

    if (!response.ok) {

        let errorMessage = `HTTP ${response.status}`;

        try {
            const error = await response.json();

            errorMessage += ': ' +
                (error.message || error.detail ||
                 error.error || 'Request failed');

        } catch (_) {
            errorMessage += ': Server returned an error';
        }

        throw new Error(errorMessage);
    }

    return response.json();
}

    function showMessage(text, success = false) {
        message.textContent = text;
        message.style.color = success ? 'green' : '#d90b2b';
    }

    // LOAD REGISTERED DONORS
    async function loadDonors() {

        try {
            const users = await request('/api/admin/users');

            const donors = users.filter(
                user => user.role === 'DONOR' && user.enabled
            );

            donorSelect.replaceChildren();

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select registered donor';
            donorSelect.appendChild(placeholder);

            donors.forEach(donor => {

                const option = document.createElement('option');

                option.value = donor.id;
                option.textContent =
                    `${donor.name} - ${donor.bloodGroup || 'N/A'} (ID: ${donor.id})`;

                donorSelect.appendChild(option);
            });

        } catch (error) {
            showMessage('Unable to load donors: ' + error.message);
        }
    }

    function addCell(row, value) {
        const cell = document.createElement('td');
        cell.textContent = value ?? '-';
        row.appendChild(cell);
        return cell;
    }

    // LOAD DONATION RECORDS
    async function loadDonations() {

        tableBody.replaceChildren();

        const loadingRow = document.createElement('tr');
        const loadingCell = addCell(loadingRow, 'Loading...');
        loadingCell.colSpan = 7;
        tableBody.appendChild(loadingRow);

        try {
            const donations = await request('/api/admin/donations');

            tableBody.replaceChildren();

            if (donations.length === 0) {

                const row = document.createElement('tr');
                const cell = addCell(row, 'No donation records found.');
                cell.colSpan = 7;
                tableBody.appendChild(row);
                return;
            }

            donations.sort((a, b) =>
                (b.donationDate || '').localeCompare(a.donationDate || '')
            );

            donations.forEach(donation => {

                const row = document.createElement('tr');

                addCell(row, donation.donorName);
                addCell(row, donation.donationDate);
                addCell(row, `${donation.quantityMl} mL`);
                addCell(row, donation.hospital || '-');
                addCell(row, donation.city || '-');
                addCell(row, donation.status);

                const actionCell = document.createElement('td');

                if (donation.status === 'PENDING') {

                    const verifyButton = document.createElement('button');
                    verifyButton.type = 'button';
                    verifyButton.textContent = 'Verify';
                    verifyButton.className = 'btn';

                    verifyButton.addEventListener('click', () =>
                        updateDonation(donation.id, 'verify')
                    );

                    const rejectButton = document.createElement('button');
                    rejectButton.type = 'button';
                    rejectButton.textContent = 'Reject';
                    rejectButton.className = 'btn outline';
                    rejectButton.style.marginLeft = '6px';

                    rejectButton.addEventListener('click', () =>
                        updateDonation(donation.id, 'reject')
                    );

                    actionCell.append(verifyButton, rejectButton);

                } else {

                    actionCell.textContent = 'Processed';
                }

                row.appendChild(actionCell);
                tableBody.appendChild(row);
            });

        } catch (error) {

            tableBody.replaceChildren();

            const row = document.createElement('tr');
            const cell = addCell(row, 'Error: ' + error.message);
            cell.colSpan = 7;
            tableBody.appendChild(row);
        }
    }

    // ADD DONATION
    form.addEventListener('submit', async event => {

        event.preventDefault();

        const data = {
            donorId: Number(donorSelect.value),
            donationDate: dateInput.value,
            quantityMl: Number(
                document.getElementById('quantityMl').value
            ),
            hospital: document.getElementById('hospital').value.trim(),
            city: document.getElementById('city').value.trim()
        };

        if (!donorSelect.value || !data.donationDate) {
            showMessage('Please select donor and donation date.');
            return;
        }

        try {
            await request('/api/admin/donations', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(data)
            });

            showMessage('Donation record added. Awaiting verification.', true);

            form.reset();
            await loadDonations();

        } catch (error) {
            showMessage(error.message);
        }
    });

    // VERIFY OR REJECT
    async function updateDonation(id, action) {

        if (!confirm(`Are you sure you want to ${action} this donation?`)) {
            return;
        }

        try {
            await request(`/api/admin/donations/${id}/${action}`, {
                method: 'PUT',
                headers: headers()
            });

            showMessage(`Donation ${action} completed.`, true);

            await loadDonations();

        } catch (error) {
            showMessage(error.message);
        }
    }

    refreshButton.addEventListener('click', loadDonations);

    dateInput.max = new Date().toLocaleDateString('en-CA');

    loadDonors();
    loadDonations();
});
