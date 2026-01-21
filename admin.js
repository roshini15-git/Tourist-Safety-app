document.addEventListener("DOMContentLoaded", function () {
    const adminMap = L.map('admin-map').setView([18.1067, 83.3956], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(adminMap);

    let alerts = [];

    function updateDashboard(currentAlerts) {
        const tableBody = document.querySelector('#alert-table tbody');
        tableBody.innerHTML = '';
        let activeCount = 0;
        let acknowledgedCount = 0;
        let resolvedCount = 0;
        
        // Clear existing markers
        adminMap.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                adminMap.removeLayer(layer);
            }
        });

        currentAlerts.forEach(alert => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${alert.id}</td>
                <td>${alert.name}</td>
                <td><a href="#" class="location-link" data-lat="${alert.latitude}" data-lng="${alert.longitude}">View Location</a></td>
                <td><span class="status-badge status-${alert.status.toLowerCase()}">${alert.status}</span></td>
                <td>${alert.time}</td>
                <td>
                    <button class="action-button acknowledge-btn" data-id="${alert.id}" ${alert.status !== 'Active' ? 'disabled' : ''}>Acknowledge</button>
                    <button class="action-button resolve-btn" data-id="${alert.id}" ${alert.status !== 'Acknowledged' ? 'disabled' : ''}>Resolve</button>
                </td>
            `;

            const markerColor = {
                'Active': 'red',
                'Acknowledged': 'orange',
                'Resolved': 'green'
            }[alert.status];

            const marker = L.marker([alert.latitude, alert.longitude], {
                icon: L.divIcon({
                    className: `alert-marker status-${alert.status.toLowerCase()}`,
                    html: `<div style="background-color: ${markerColor}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                    iconSize: [15, 15]
                })
            }).addTo(adminMap)
                .bindPopup(`<b>Alert from ${alert.name}</b><br>Status: ${alert.status}`);

            // Update status counts
            if (alert.status === 'Active') activeCount++;
            if (alert.status === 'Acknowledged') acknowledgedCount++;
            if (alert.status === 'Resolved') resolvedCount++;
        });

        // Update the four cards' <h2> values
        document.querySelector('#active-alerts-card h2').textContent = activeCount;
        document.querySelector('#acknowledged-alerts-card h2').textContent = acknowledgedCount;
        document.querySelector('#resolved-alerts-card h2').textContent = resolvedCount;
        document.querySelector('#total-alerts-card h2').textContent = currentAlerts.length;
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('location-link')) {
            e.preventDefault();
            const lat = parseFloat(e.target.dataset.lat);
            const lng = parseFloat(e.target.dataset.lng);
            adminMap.setView([lat, lng], 16);
            Swal.fire({
                icon: 'info',
                title: 'Map Centered',
                text: `Map has been centered on the location of ${e.target.parentElement.previousElementSibling.textContent}.`
            });
        }
        if (e.target.classList.contains('acknowledge-btn')) {
            const alertId = e.target.dataset.id;
            fetch('/alerts/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: alertId, status: 'Acknowledged' })
            })
            .then(r => r.json())
            .then(() => { fetchAlerts(); Swal.fire('Acknowledged!', `Alert ${alertId} has been acknowledged.`, 'success'); })
            .catch(() => Swal.fire('Error', 'Failed to update alert status.', 'error'));
        }
        if (e.target.classList.contains('resolve-btn')) {
            const alertId = e.target.dataset.id;
            fetch('/alerts/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: alertId, status: 'Resolved' })
            })
            .then(r => r.json())
            .then(() => { fetchAlerts(); Swal.fire('Resolved!', `Alert ${alertId} has been resolved.`, 'success'); })
            .catch(() => Swal.fire('Error', 'Failed to update alert status.', 'error'));
        }
    });

    function fetchAlerts() {
        fetch('/alerts')
            .then(res => res.json())
            .then(data => {
                alerts = Array.isArray(data) ? data : [];
                updateDashboard(alerts);
            })
            .catch(() => {
                // Optional: show a small toast or ignore on failure
            });
    }

    // Initial load and polling every 5 seconds
    fetchAlerts();
    setInterval(fetchAlerts, 5000);
})