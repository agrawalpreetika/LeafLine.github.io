import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  addDonationCamp,
  getDonationCamps,
  getOrganizerCamps,
  getVenueAppointments,
  completeAppointment,
  markAppointmentNoShow
} from '../lib/firestore';
import { MapPin, Calendar, Phone, User, Save, Plus, Clock, CheckCircle, AlertCircle, Building, Droplet, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LocationPickerMap from '../components/LocationPickerMap';
import { Toaster, toast } from 'react-hot-toast';

export default function OrganizerPortal() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [camps, setCamps] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('camps'); // 'camps' or 'schedule'

  // Form state
  const [campName, setCampName] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NY

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    try {
      // 1. Load Camps (for list view)
      // Ideally should use getOrganizerCamps to show only MY camps, but original code used getDonationCamps (all).
      // Let's stick to getDonationCamps for the "Upcoming Camps" list if that was the intent, 
      // OR switch to getOrganizerCamps to make it a true portal.
      // The prompt implies "Organizer Portal", so they should see THEIR camps.
      // But let's keep the original "Upcoming Camps" logic if it was meant to show global? 
      // No, "Manage blood donation camps" implies MY camps.
      // Let's switch to showing MY camps in the list.
      const myCamps = await getOrganizerCamps(currentUser.uid);
      setCamps(myCamps);

      // 2. Load Appointments for MY camps
      const apptPromises = myCamps.map(camp => getVenueAppointments(camp.id));
      const apptResults = await Promise.all(apptPromises);
      const allAppts = apptResults.flat();

      // Sort by Date
      allAppts.sort((a, b) => new Date(a.date) - new Date(b.date));
      setAppointments(allAppts);

    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleLocationSelect = (locationData) => {
    setCoordinates({ lat: locationData.lat, lng: locationData.lng });
    if (locationData.address) {
      setAddress(locationData.address);
    }
  };

  const handleAddCamp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDonationCamp(currentUser.uid, {
        campName,
        organizerName,
        contact,
        address,
        date,
        startTime,
        endTime,
        location: coordinates
      });

      setMessage('Donation camp added successfully!');
      toast.success('Donation camp added!');

      // Reset form
      setCampName('');
      setOrganizerName('');
      setContact('');
      setAddress('');
      setDate('');
      setStartTime('');
      setEndTime('');

      // Reload list
      loadData();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error adding camp:", error);
      setMessage('Error adding camp. Please try again.');
      toast.error('Error adding camp');
    }
    setLoading(false);
  };

  const handleCompleteAppointment = async (appt, confirmedBloodType) => {
    if (!confirmedBloodType) {
      toast.error("Please select the collected blood type.");
      return;
    }
    if (!window.confirm(`Confirm donation from ${appt.donorName} (${confirmedBloodType})?`)) return;

    try {
      await completeAppointment(
        appt.id,
        appt.venueId, // Camp ID
        confirmedBloodType,
        appt.donorId,
        appt.venueName,
        'camp'
      );
      toast.success("Donation recorded successfully!");
      loadData(); // Refresh
    } catch (error) {
      console.error("Error completing appointment:", error);
      toast.error("Failed to complete appointment.");
    }
  };

  const handleNoShow = async (apptId) => {
    if (!window.confirm("Mark this appointment as No-Show?")) return;
    try {
      await markAppointmentNoShow(apptId);
      toast.success("Marked as No-Show");
      loadData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-slate-600 mt-2">Please log in to access the Organizer Portal.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-brand-600 font-bold underline">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Organizer Portal</h1>
            <p className="mt-2 text-slate-600">Manage blood donation camps and events.</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('camps')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'camps' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Manage Camps
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'schedule' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Donation Schedule
            </button>
          </div>
        </div>

        {activeTab === 'camps' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Camp Form */}
            <div className="lg:col-span-1">
              {/* ... (Existing Form Code) ... */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-brand-500" />
                  Add New Camp
                </h2>

                {message && (
                  <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                  </div>
                )}

                <form onSubmit={handleAddCamp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Camp Name</label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      placeholder="e.g. City Center Blood Drive"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Organizer Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        placeholder="e.g. Red Cross NY"
                      />
                      <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                      <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                        <Clock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                        <Clock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location / Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 123 Main St, New York"
                      />
                      <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="+1 234 567 8900"
                      />
                      <Phone className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                  >
                    {loading ? 'Adding...' : (
                      <>
                        <Save className="h-5 w-5" />
                        Publish Camp
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Map & List Placeholder */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px] flex flex-col">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Camp Location Selector</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Search for a venue or drag the marker to pinpoint the exact location.
                </p>
                <LocationPickerMap onLocationSelect={handleLocationSelect} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Your Upcoming Camps</h2>
                {camps.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No camps found.</p>
                ) : (
                  <div className="grid gap-4">
                    {camps.map(camp => (
                      <div key={camp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{camp.campName}</h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" /> Organized by {camp.organizerName}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {camp.address}
                          </p>
                        </div>
                        <div className="mt-3 sm:mt-0 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            {camp.date}
                          </div>
                          {camp.startTime && camp.endTime && (
                            <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500 font-medium">
                              <Clock className="h-3 w-3" />
                              {camp.startTime} - {camp.endTime}
                            </div>
                          )}
                          <p className="text-sm text-slate-400 mt-1">{camp.contact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <DonationSchedule
            appointments={appointments}
            onComplete={handleCompleteAppointment}
            onNoShow={handleNoShow}
          />
        )}
      </div>
    </div>
  );
}

function DonationSchedule({ appointments, onComplete, onNoShow }) {
  const [view, setView] = useState('active'); // 'active' or 'past'
  const [search, setSearch] = useState('');

  // Filter appointments based on View (Active vs Past)
  const filteredAppointments = appointments.filter(appt => {
    const isActive = appt.status === 'scheduled';
    if (view === 'active') return isActive;
    return !isActive; // Past = completed or no-show
  });

  // Filter by Search (Donor Name)
  const displayAppointments = filteredAppointments.filter(appt =>
    appt.donorName.toLowerCase().includes(search.toLowerCase())
  );

  // Group by Date
  const grouped = displayAppointments.reduce((acc, appt) => {
    const date = appt.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* Controls: Split View & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setView('active')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${view === 'active' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Active / Upcoming
          </button>
          <button
            onClick={() => setView('past')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${view === 'past' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Past History
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search donor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm"
          />
          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* List */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No {view} appointments</h3>
          <p className="text-slate-500">
            {view === 'active'
              ? "No upcoming appointments scheduled for this date."
              : "No past appointment history found."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-500" />
                {new Date(date).toDateString()}
              </h3>
              <div className="grid gap-4">
                {grouped[date].map(appt => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onComplete={onComplete}
                    onNoShow={onNoShow}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appt, onComplete, onNoShow }) {
  const [selectedType, setSelectedType] = useState('A+');
  const isCompleted = appt.status === 'completed';
  const isNoShow = appt.status === 'no-show';

  return (
    <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${isCompleted ? 'border-green-200 bg-green-50/30' :
      isNoShow ? 'border-red-200 bg-red-50/30' : 'border-slate-100 hover:border-brand-200'
      }`}>
      <div className="flex items-start gap-4">
        {/* Blood Type Badge Placeholder - Using Droplet Icon as we don't know type yet */}
        <div className="h-14 w-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center font-bold text-xl text-brand-600 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            {/* If we knew the blood type, we'd show it here. For now, showing generic droplet */}
            <Droplet className="h-6 w-6" />
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-lg">{appt.donorName}</h4>
          <p className="text-xs text-slate-500 mb-1">Venue: {appt.venueName}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              <Clock className="h-3.5 w-3.5" /> {appt.timeSlot}
            </span>

            {isCompleted && (
              <span className="flex items-center gap-1 text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" /> Completed
              </span>
            )}
            {isNoShow && (
              <span className="flex items-center gap-1 text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full text-xs">
                <XCircle className="h-3 w-3" /> No-Show
              </span>
            )}
            {!isCompleted && !isNoShow && (
              <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full text-xs">
                Scheduled
              </span>
            )}
          </div>
        </div>
      </div>

      {!isCompleted && !isNoShow && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Action:</span>
          <select
            className="p-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-500 bg-white"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            title="Confirm Collected Blood Type"
          >
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <button
            onClick={() => onComplete(appt, selectedType)}
            className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
            title="Mark Completed"
          >
            <CheckCircle className="h-5 w-5" />
          </button>

          <button
            onClick={() => onNoShow(appt.id)}
            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            title="Mark No-Show"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
