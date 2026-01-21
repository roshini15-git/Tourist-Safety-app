

document.getElementById('location').addEventListener('submit', function(e) {
    e.preventDefault();

    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);

    if (isNaN(latitude) || isNaN(longitude)) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please enter valid latitude and longitude values.'
        });
        return;
    }

    fetch('/location', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude: latitude, longitude: longitude })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        Swal.fire('Success!', 'Location sent successfully.', 'success');
    })
    .catch((error) => {
        console.error('Error:', error);
        Swal.fire('Error!', 'An error occurred while sending your location.', 'error');
    });

    showMap(latitude, longitude);
});

let geofences = [];

function checkGeofence(currentLat, currentLng) {
    geofences.forEach(geofence => {
        const distance = getDistance(currentLat, currentLng, geofence.coordinates[0], geofence.coordinates[1]);
        if (distance <= geofence.radius && geofence.type === 'danger') {
            Swal.fire({
                icon: 'warning',
                title: 'Entering a Danger Zone',
                text: `You are approaching ${geofence.name}. Please proceed with caution.`,
                confirmButtonText: 'OK'
            });
        }
    });
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function addGeofencesToMap(map) {
    fetch('/geofences')
        .then(response => response.json())
        .then(data => {
            geofences = data;
            data.forEach(geofence => {
                const color = geofence.type === 'danger' ? 'red' : 'green';
                const circle = L.circle(geofence.coordinates, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.2,
                    radius: geofence.radius
                }).addTo(map);

                circle.bindPopup(`<b>${geofence.name}</b><br>Type: ${geofence.type}`);
            });
        })
        .catch(error => console.error('Error fetching geofences:', error));
}


function showMap(lat, lng) {
    if (window.myMap) {
        window.myMap.remove();
    }
    const mapContainer = document.getElementById('map');
    window.myMap = L.map(mapContainer).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(window.myMap);
    L.marker([lat, lng]).addTo(window.myMap)
        .bindPopup('Your current location!').openPopup();
    addGeofencesToMap(window.myMap);
}

document.addEventListener("DOMContentLoaded", function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            fetch('/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });
            showMap(lat, lng);
            setInterval(() => navigator.geolocation.getCurrentPosition(pos => checkGeofence(pos.coords.latitude, pos.coords.longitude)), 5000);
        }, function(error) {
            const defaultLat = 18.1067;
            const defaultLng = 83.3956;
            document.getElementById('latitude').value = defaultLat;
            document.getElementById('longitude').value = defaultLng;
            showMap(defaultLat, defaultLng);
            Swal.fire({
              icon: 'info',
              title: 'Geolocation Denied',
              text: 'Using a default location. Please enter your location manually if needed.'
            });
        });
    } else {
        const defaultLat = 18.1067;
        const defaultLng = 83.3956;
        document.getElementById('latitude').value = defaultLat;
        document.getElementById('longitude').value = defaultLng;
        showMap(defaultLat, defaultLng);
        Swal.fire({
          icon: 'warning',
          title: 'Geolocation Not Supported',
          text: 'Your browser does not support geolocation. Using a default location.'
        });
    }
});

document.getElementById("form").addEventListener("submit", function(event) {
    event.preventDefault();
    var name = document.getElementById('name').value.trim();
    if (!name) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Name',
            text: 'Please enter your name to log in.'
        });
        return;
    }
    var randomId = 'T' + Math.floor(100000 + Math.random() * 900000);
    Swal.fire({
      icon: 'success',
      title: 'Welcome!',
      text: `Welcome, ${name}! Your Tourist ID is ${randomId}.`
    });
});

document.getElementById("em_button").addEventListener("click", function() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const name = document.getElementById('name').value;
    const sosButton = document.getElementById("em_button");

    if (isNaN(lat) || isNaN(lng)) {
        Swal.fire({
            icon: 'warning',
            title: 'Location Unavailable',
            text: 'Your location is not available. Please enter it manually.'
        });
        return;
    }

    sosButton.disabled = true;
    sosButton.textContent = "Sending SOS...";
    sosButton.style.backgroundColor = '#e65c5c';

    // Send SOS as before
    fetch('/sos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, name: name })
    })
    .then(async response => {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data && data.message ? data.message : 'Failed to send SOS');
        }
        console.log('SOS Success:', data);
        const alertId = data && data.alert && data.alert.id ? data.alert.id : undefined;
        // After SOS, fetch nearest locations
        fetch('/nearest_locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        })
        .then(res => res.json())
        .then(locData => {
            let html = '';
            if (locData.hospitals && locData.hospitals.length > 0) {
                html += '<b>Nearest Hospitals:</b><ul>';
                locData.hospitals.forEach(h => {
                    html += `<li>${h.name} (${h.distance} km)${h.address ? ' - ' + h.address : ''}</li>`;
                });
                html += '</ul>';
            }
            if (locData.police_stations && locData.police_stations.length > 0) {
                html += '<b>Nearest Police Stations:</b><ul>';
                locData.police_stations.forEach(p => {
                    html += `<li>${p.name} (${p.distance} km)${p.address ? ' - ' + p.address : ''}</li>`;
                });
                html += '</ul>';
            }
            Swal.fire({
                icon: 'info',
                title: 'Nearest Help Centers',
                html: html || 'No nearby hospitals or police stations found.'
            });
        })
        .catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not fetch nearest locations.'
            });
        });

        Swal.fire({
          icon: 'success',
          title: 'Emergency SOS Sent!',
          text: alertId ? `Help is on the way. Alert ID: ${alertId}` : 'Help is on the way. Stay calm.'
        });
    })
    .catch((error) => {
        console.error('SOS Error:', error);
        Swal.fire({
          icon: 'error',
          title: 'SOS Error',
          text: 'An error occurred while sending your emergency signal.'
        });
    })
    .finally(() => {
        sosButton.disabled = false;
        sosButton.textContent = "Emergency SOS";
        sosButton.style.backgroundColor = 'var(--accent-color)';
    });
});