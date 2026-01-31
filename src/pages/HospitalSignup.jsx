import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createHospitalProfile } from '../lib/firestore';
import { Building, MapPin, Mail, Lock, AlertCircle, Activity, Locate, Search, Phone } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Search Component for Leaflet
function SearchField({ setLocation, setAddress }) {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'bar',
      showMarker: false, // We use our own draggable marker
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Search for address...',
    });

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (result) => {
      if (result.location) {
        setLocation({ lat: result.location.y, lng: result.location.x });
        setAddress(result.location.label);
      }
    });

    return () => map.removeControl(searchControl);
  }, [map, setLocation, setAddress]);

  return null;
}

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  // Make marker draggable
  const eventHandlers = {
    dragend(e) {
      const marker = e.target;
      if (marker != null) {
        setPosition(marker.getLatLng());
      }
    },
  };

  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={eventHandlers}
    >
    </Marker>
  );
}

export default function HospitalSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [licenseId, setLicenseId] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState(null); // { lat, lng }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    if (!location) {
      return setError('Please search or click on the map to set the hospital location.');
    }

    // Validate Phone
    if (!/^[0-9+]+$/.test(phoneNumber)) {
      return setError('Phone number must contain only digits and optional + prefix');
    }

    try {
      setError('');
      setLoading(true);

      // Create Auth User
      const userCredential = await signup(email, password);

      // Create Hospital Profile & Inventory
      await createHospitalProfile(userCredential.user.uid, {
        email,
        hospitalName,
        licenseId,
        address, // Address from form input (user can edit what was auto-filled)
        phoneNumber,
        location: { lat: location.lat, lng: location.lng }
      });

      navigate('/hospital-dashboard');
    } catch (err) {
      setError('Failed to create account: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <Building className="h-12 w-12 text-blue-600" />
            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 rounded-full"></div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Hospital Registration
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Join our network to save lives.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full max-w-6xl">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-12" onSubmit={handleSubmit}>
            {/* Left Column: Hospital Info */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Hospital Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    placeholder="e.g. General City Hospital"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">License ID</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Activity className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    placeholder="License Number"
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    placeholder="+1 234 567 8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    placeholder="admin@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Location & Map */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hospital Location</label>
                <div className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-300 relative z-0">
                  <MapContainer center={[40.7128, -74.0060]} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <SearchField setLocation={setLocation} setAddress={setAddress} />
                    <LocationMarker position={location} setPosition={setLocation} />
                  </MapContainer>
                  {!location && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-slate-600 shadow-sm pointer-events-none z-[1000]">
                      Use search or click to pin location
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {location ? `Pinned: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Search for address or click on map to set location.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Full Address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3"
                    placeholder="Address will auto-fill from map..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">You can edit this address if needed.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Registering...' : 'Register Hospital'}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
