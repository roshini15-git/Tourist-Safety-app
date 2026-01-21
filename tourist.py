
# tourist.py

from flask import Flask,render_template,request,redirect,url_for,session,flash,jsonify
import logging
from math import radians, sin, cos, sqrt, atan2
import pandas as pd
import time

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
alerts = []
last_known_location = {'latitude': None, 'longitude': None}

# Load data from Excel file in data folder
try:
    df = pd.read_excel("data/hackathondataset.xlsx")
    safety_locations = df.to_dict('records')
    print("Successfully loaded locations from Excel file.")
except FileNotFoundError:
    print("Error: Excel file 'data/hackathondataset.xlsx' not found. Using empty dataset.")
    safety_locations = []

# Haversine formula
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    return distance

@app.route('/home')
@app.route('/')
def home():
    return render_template("home.html")

@app.route('/admin')
def admin():
    return render_template("admin.html")     

@app.route('/tourist',methods=["GET","POST"])
def tourist():
    return render_template("tourist.html")

@app.route('/location', methods=['POST'])
def receive_location():
    global last_known_location
    data = request.get_json(silent=True)
    if data:
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        last_known_location = {'latitude': latitude, 'longitude': longitude}
    else:
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        last_known_location = {'latitude': latitude, 'longitude': longitude}
    return jsonify({'status': 'success', 'latitude': latitude, 'longitude': longitude})


# New route to get nearest hospitals and police stations
@app.route('/nearest_locations', methods=['POST'])
def nearest_locations():
    data = request.get_json()
    latitude = float(data.get('latitude'))
    longitude = float(data.get('longitude'))
    # Find nearest hospitals and police stations
    hospitals = []
    police_stations = []
    for loc in safety_locations:
        try:
            lat2 = float(loc.get('Latitude') or loc.get('latitude'))
            lon2 = float(loc.get('Longitude') or loc.get('longitude'))
            dist = haversine(latitude, longitude, lat2, lon2)
            loc_type = (loc.get('Type') or loc.get('type') or '').lower()
            entry = {
                'name': loc.get('Name') or loc.get('name'),
                'address': loc.get('Address') or loc.get('address', ''),
                'distance': round(dist, 2)
            }
            if 'hospital' in loc_type:
                hospitals.append(entry)
            elif 'police' in loc_type:
                police_stations.append(entry)
        except Exception as e:
            continue
    # Sort by distance and return top 3 of each
    hospitals = sorted(hospitals, key=lambda x: x['distance'])[:3]
    police_stations = sorted(police_stations, key=lambda x: x['distance'])[:3]
    return jsonify({'hospitals': hospitals, 'police_stations': police_stations})

    try:
        app.logger.info(f"Received Latitude: {latitude}")
        app.logger.info(f"Received Longitude: {longitude}")
    except Exception:
        pass

    return jsonify({"status": "success", "message": "Location received"})

@app.route('/sos', methods=['POST'])
def receive_sos():
    data = request.get_json(silent=True)
    if data:
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        name = data.get('name', 'Anonymous')
        alert_id = 'A' + str(int(time.time()))
        
        new_alert = {
            'id': alert_id,
            'name': name,
            'latitude': latitude,
            'longitude': longitude,
            'status': 'Active',
            'time': time.strftime("%Y-%m-%d %H:%M:%S")
        }
        alerts.append(new_alert)
        try:
            app.logger.info(f"SOS received from {name} at ({latitude}, {longitude})")
        except Exception:
            pass
        return jsonify({"status": "success", "message": "SOS alert received", "alert": new_alert}), 201
    return jsonify({"status": "error", "message": "Invalid data"}), 400

@app.route('/alerts')
def get_alerts():
    return jsonify(alerts)

@app.route('/alerts/update', methods=['POST'])
def update_alert_status():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "JSON body required"}), 400

    alert_id = data.get('id')
    new_status = data.get('status')

    if not alert_id or not new_status:
        return jsonify({"status": "error", "message": "Both id and status are required"}), 400

    if new_status not in ['Active', 'Acknowledged', 'Resolved']:
        return jsonify({"status": "error", "message": "Invalid status"}), 400

    for alert in alerts:
        if alert.get('id') == alert_id:
            alert['status'] = new_status
            try:
                alert['time'] = time.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass
            return jsonify({"status": "success", "alert": alert})

    return jsonify({"status": "error", "message": "Alert not found"}), 404

@app.route('/geofences')
def get_geofences():
    if last_known_location['latitude'] and last_known_location['longitude']:
        geofence_data = {
            "name": "My Safe Zone",
            "type": "safe",
            "coordinates": [last_known_location['latitude'], last_known_location['longitude']],
            "radius": 500
        }
        return jsonify([geofence_data])
    else:
        return jsonify([])

@app.route('/nearest-locations', methods=['POST'])
def find_nearest_locations():
    data = request.get_json(silent=True)
    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({"error": "Latitude and longitude required"}), 400

    user_lat = data['latitude']
    user_lon = data['longitude']

    nearest_hospital = None
    min_hospital_distance = float('inf')
    nearest_police = None
    min_police_distance = float('inf')

    for location in safety_locations:
        try:
            distance = haversine(user_lat, user_lon, location['latitude'], location['longitude'])
            if location['type'] == 'hospital' and distance < min_hospital_distance:
                min_hospital_distance = distance
                nearest_hospital = location
            elif location['type'] == 'police' and distance < min_police_distance:
                min_police_distance = distance
                nearest_police = location
        except KeyError as e:
            # Handle cases where a row might be missing required keys
            print(f"Skipping a row due to missing key: {e}")
            continue

    response = {}
    if nearest_hospital:
        response['hospital'] = {
            "name": nearest_hospital['name'],
            "distance_km": round(min_hospital_distance, 2)
        }
    if nearest_police:
        response['police'] = {
            "name": nearest_police['name'],
            "distance_km": round(min_police_distance, 2)
        }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)