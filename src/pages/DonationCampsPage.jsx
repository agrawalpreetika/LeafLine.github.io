import React, { useState, useEffect } from 'react';
import { getDonationCamps, deleteOldCamps } from '../lib/firestore';
import { MapPin, Calendar, User, Phone, Droplet, Clock, History, Navigation, Search, Filter } from 'lucide-react';

export default function DonationCampsPage() {
    const [upcomingCamps, setUpcomingCamps] = useState([]);
    const [pastCamps, setPastCamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('date'); // 'date' | 'name'

    useEffect(() => {
        // Trigger auto-delete of very old camps
        deleteOldCamps();
        loadCamps();
    }, []);

    const loadCamps = async () => {
        try {
            const allCamps = await getDonationCamps();

            // Client-side filtering for simplicity and responsiveness
            // In a larger app, you'd use separate queries
            const today = new Date().toISOString().split('T')[0];

            const upcoming = allCamps.filter(camp => camp.date >= today && camp.status !== 'archived')
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort nearest first

            const past = allCamps.filter(camp => camp.date < today && camp.status !== 'archived')
                .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

            setUpcomingCamps(upcoming);
            setPastCamps(past);
        } catch (error) {
            console.error("Error loading camps:", error);
        }
        setLoading(false);
    };

    // Filter Logic
    const filterCamps = (camps) => {
        return camps.filter(camp => {
            const term = searchTerm.toLowerCase();
            return (
                camp.campName?.toLowerCase().includes(term) ||
                camp.address?.toLowerCase().includes(term) ||
                camp.organizerName?.toLowerCase().includes(term)
            );
        }).sort((a, b) => {
            if (sortOption === 'name') {
                return a.campName.localeCompare(b.campName);
            }
            // Default to date
            if (activeTab === 'upcoming') {
                return new Date(a.date) - new Date(b.date);
            } else {
                return new Date(b.date) - new Date(a.date);
            }
        });
    };

    const displayedUpcoming = filterCamps(upcomingCamps);
    const displayedPast = filterCamps(pastCamps);

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Blood Donation Camps</h1>
                    <p className="mt-2 text-slate-600">Find upcoming events or view past successful camps.</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-6">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'upcoming'
                                ? 'bg-brand-500 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Calendar className="h-4 w-4" />
                            Upcoming Events
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'past'
                                ? 'bg-slate-700 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <History className="h-4 w-4" />
                            Past Events
                        </button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search by name, city, or organizer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                            <Filter className="h-4 w-4" />
                            Sort by:
                        </div>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 font-medium"
                        >
                            <option value="date">Date (Soonest)</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Loading camps...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'upcoming' && (
                            displayedUpcoming.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">No camps found</h3>
                                    <p className="text-slate-500 mt-1">
                                        {searchTerm ? `No results for "${searchTerm}"` : 'No upcoming donation camps scheduled yet.'}
                                    </p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="mt-4 text-brand-600 font-bold text-sm hover:underline"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                                    {displayedUpcoming.map(camp => (
                                        <CampCard key={camp.id} camp={camp} isPast={false} />
                                    ))}
                                </div>
                            )
                        )}

                        {activeTab === 'past' && (
                            displayedPast.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                                    <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No past camps history available.</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                                    {displayedPast.map(camp => (
                                        <CampCard key={camp.id} camp={camp} isPast={true} />
                                    ))}
                                </div>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function CampCard({ camp, isPast }) {
    const handleNavigation = () => {
        if (camp.location && camp.location.lat && camp.location.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${camp.location.lat},${camp.location.lng}`, '_blank');
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(camp.address)}`, '_blank');
        }
    };

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${isPast ? 'border-slate-100 opacity-75 hover:opacity-100' : 'border-slate-100 hover:shadow-md hover:border-brand-100'}`}>
            <div className={`p-6 border-b ${isPast ? 'bg-slate-50 border-slate-100' : 'bg-brand-50 border-brand-100'}`}>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{camp.campName}</h3>
                <p className={`text-sm font-medium flex items-center gap-1 ${isPast ? 'text-slate-500' : 'text-brand-700'}`}>
                    <User className="h-3.5 w-3.5" /> Organized by {camp.organizerName}
                </p>
            </div>

            <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Calendar className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Date</p>
                        <p className="text-slate-900 font-medium">{camp.date}</p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Timings</p>
                        <p className="text-slate-900 font-medium">
                            {camp.startTime && camp.endTime ? `${camp.startTime} - ${camp.endTime}` : 'All Day'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <MapPin className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Location</p>
                        <p className="text-slate-900 font-medium">{camp.address}</p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Phone className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Contact</p>
                        <p className="text-slate-900 font-medium">{camp.contact}</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                    disabled={isPast}
                    onClick={isPast ? undefined : handleNavigation}
                    className={`w-full font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 ${isPast
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                >
                    {isPast ? (
                        'Event Completed'
                    ) : (
                        <>
                            <Navigation className="h-4 w-4" />
                            Get Directions
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
