import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToHospitalInventory, updateHospitalStock } from '../lib/firestore';
import { Droplet, Plus, Minus, AlertCircle, Building, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HospitalDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const unsubscribe = subscribeToHospitalInventory(currentUser.uid, (data) => {
      setInventory(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, navigate]);

  const handleUpdateStock = async (bloodType, change) => {
    try {
      await updateHospitalStock(currentUser.uid, bloodType, change);
    } catch (error) {
      console.error("Failed to update stock", error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Inventory...</div>;

  if (!inventory) return (
    <div className="p-8 text-center text-red-500">
      <AlertCircle className="h-12 w-12 mx-auto mb-2" />
      Error: Hospital inventory not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{inventory.hospitalName}</h1>
              <p className="text-slate-500 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {inventory.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Inventory System • Last Updated: {new Date(inventory.lastUpdated).toLocaleString()}
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-6">Manage Blood Stock</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ensure stable sorting order: A+, A-, B+, B-, AB+, AB-, O+, O- */}
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
            <StockCard
              key={type}
              type={type}
              count={inventory.bloodStock[type] || 0}
              onUpdate={handleUpdateStock}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StockCard({ type, count, onUpdate }) {
  const isLow = count < 5;
  const isCritical = count === 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center transition-all ${isCritical ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-100'}`}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 relative">
        <span className="text-xl font-bold text-red-600">{type}</span>
        <Droplet className="absolute -top-1 -right-1 h-6 w-6 text-red-500 fill-red-500" />
      </div>

      <div className="text-center mb-6">
        <span className="text-4xl font-bold text-slate-900">{count}</span>
        <p className={`text-xs font-medium mt-1 ${isLow ? 'text-red-500' : 'text-slate-400'}`}>
          {isCritical ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'Units Available'}
        </p>
      </div>

      <div className="flex items-center gap-4 w-full">
        <button
          onClick={() => onUpdate(type, -1)}
          disabled={count <= 0}
          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center disabled:opacity-50"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => onUpdate(type, 1)}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shadow-md shadow-blue-200"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
