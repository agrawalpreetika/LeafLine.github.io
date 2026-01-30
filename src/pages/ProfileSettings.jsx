import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Toaster, toast } from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Droplet, Save, Heart, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileSettings() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isDonor, setIsDonor] = useState(false);
    const [userRole, setUserRole] = useState('user'); // Default to user

    // Donor specific fields
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [bloodType, setBloodType] = useState('');

    useEffect(() => {
        async function fetchUserData() {
            if (currentUser) {
                try {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(userRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setName(data.name || currentUser.displayName || '');
                        setEmail(data.email || currentUser.email || '');
                        setIsDonor(data.isDonor || false);
                        setUserRole(data.role || 'user');

                        if (data.donorProfile) {
                            setPhone(data.donorProfile.phone || '');
                            setCity(data.donorProfile.city || '');
                            setBloodType(data.donorProfile.bloodType || '');
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    toast.error("Failed to load profile data");
                }
            }
            setLoading(false);
        }
        fetchUserData();
    }, [currentUser]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        setSaving(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);

            // 1. Update Firestore
            const updateData = {
                name: name,
                // Only update donor fields if they exist/are donor
                ...(isDonor && {
                    donorProfile: {
                        phone,
                        city,
                        bloodType,
                        // Preserve other fields we might not be editing here (like totalDonations)
                        // Note: In a real app we'd fetch first to merge deep, 
                        // but here we know the structure from the fetch above.
                        // Ideally we should use setDoc with {merge: true} or be careful.
                        // For this simple case, we'll just merge these fields into the existing object structure
                        // Firestore updateDoc can use dot notation for nested fields
                    }
                })
            };

            // Using dot notation for nested updates to avoid overwriting entire donorProfile
            if (isDonor) {
                await updateDoc(userRef, {
                    name: name,
                    'donorProfile.phone': phone,
                    'donorProfile.city': city,
                    'donorProfile.bloodType': bloodType
                });
            } else {
                await updateDoc(userRef, { name: name });
            }

            // 2. Update Auth Profile
            if (name !== currentUser.displayName) {
                await updateProfile(currentUser, { displayName: name });
            }

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile.");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <Toaster position="top-center" />
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
                    <p className="mt-2 text-slate-600">Manage your personal information and contact details.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8">
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
                                    Personal Information
                                </h2>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-brand-500 focus:border-brand-500 outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="email"
                                            disabled
                                            value={email}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
                                </div>
                            </div>

                            {/* Donor Info - Conditional */}
                            {isDonor ? (
                                <div className="space-y-4 pt-4">
                                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                                        <Heart className="h-5 w-5 text-red-500" />
                                        Donor Details
                                    </h2>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Blood Type</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Droplet className="h-5 w-5 text-red-500" />
                                                </div>
                                                <select
                                                    value={bloodType}
                                                    onChange={(e) => setBloodType(e.target.value)}
                                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-brand-500 focus:border-brand-500 outline-none"
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="A+">A+</option>
                                                    <option value="A-">A-</option>
                                                    <option value="B+">B+</option>
                                                    <option value="B-">B-</option>
                                                    <option value="AB+">AB+</option>
                                                    <option value="AB-">AB-</option>
                                                    <option value="O+">O+</option>
                                                    <option value="O-">O-</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">City / Location</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <MapPin className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-brand-500 focus:border-brand-500 outline-none"
                                                    placeholder="e.g. New York"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-brand-500 focus:border-brand-500 outline-none"
                                                    placeholder="+1 234 567 8900"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // ONLY show "Become a Donor" if the user is a standard 'user'
                                // Hospitals and Organizers should NOT see this.
                                userRole === 'user' && (
                                    <div className="bg-red-50 rounded-xl p-6 text-center border border-red-100 mt-6">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                            <Heart className="h-6 w-6 text-red-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Become a Donor</h3>
                                        <p className="text-slate-600 mb-4 text-sm">You haven't registered as a donor yet. Join our community and save lives.</p>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/dashboard')}
                                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                                        >
                                            Register as Donor
                                        </button>
                                    </div>
                                )
                            )}

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
