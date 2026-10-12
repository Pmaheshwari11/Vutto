import React, { useState } from 'react';
import { X, Plus, Bike, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Auction } from '../types';

interface CreateAuctionModalProps {
  onClose: () => void;
  onCreated: (newAuction: Auction) => void;
}

export const CreateAuctionModal: React.FC<CreateAuctionModalProps> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    make: 'Ducati',
    model: '',
    year: 2023,
    vin: 'VIN' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    mileage: 2500,
    engine_cc: 1000,
    horsepower: 190,
    category: 'SUPERBIKE' as Auction['category'],
    condition_score: 95,
    starting_price: 15000,
    reserve_price: 18000,
    min_increment: 250,
    durationMinutes: 30,
    startImmediately: true,
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop',
    inspectionNotes: 'Dealer certified inspection completed with zero faults reported.'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title || `${formData.year} ${formData.make} ${formData.model}`,
        make: formData.make,
        model: formData.model || 'Special Edition',
        year: Number(formData.year),
        vin: formData.vin,
        mileage: Number(formData.mileage),
        engine_cc: Number(formData.engine_cc),
        horsepower: Number(formData.horsepower),
        category: formData.category,
        condition_score: Number(formData.condition_score),
        inspection_report: {
          engine_compression: 'EXCELLENT',
          transmission: 'SMOOTH',
          frame_alignment: 'PERFECT',
          electrical_system: 'PASSED',
          brake_pads_percent: 90,
          front_tyre_tread_mm: 4.5,
          rear_tyre_tread_mm: 5.0,
          clean_title: true,
          service_history_verified: true,
          notes: formData.inspectionNotes
        },
        images: [formData.imageUrl],
        starting_price: Number(formData.starting_price),
        reserve_price: Number(formData.reserve_price),
        min_increment: Number(formData.min_increment),
        durationMinutes: Number(formData.durationMinutes),
        startImmediately: formData.startImmediately
      };

      const res = await api.auctions.create(payload);
      onCreated(res.auction);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">
                Create Live Motorcycle Auction
              </h3>
              <p className="text-xs text-slate-400">
                Publish a verified motorcycle to the live bidding floor
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Make</label>
              <input
                type="text"
                required
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Model</label>
              <input
                type="text"
                required
                placeholder="e.g. Streetfighter V4"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Engine (cc)</label>
              <input
                type="number"
                value={formData.engine_cc}
                onChange={(e) => setFormData({ ...formData, engine_cc: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="SUPERBIKE">SUPERBIKE</option>
                <option value="CRUISER">CRUISER</option>
                <option value="CAFE_RACER">CAFE RACER</option>
                <option value="ADVENTURE">ADVENTURE</option>
                <option value="CLASSIC">CLASSIC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Starting Price ($)</label>
              <input
                type="number"
                value={formData.starting_price}
                onChange={(e) => setFormData({ ...formData, starting_price: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Reserve Price ($)</label>
              <input
                type="number"
                value={formData.reserve_price}
                onChange={(e) => setFormData({ ...formData, reserve_price: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min Increment ($)</label>
              <input
                type="number"
                value={formData.min_increment}
                onChange={(e) => setFormData({ ...formData, min_increment: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Duration (Minutes)</label>
            <input
              type="number"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Hero Image URL</label>
            <input
              type="url"
              required
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="startImmediately"
              checked={formData.startImmediately}
              onChange={(e) => setFormData({ ...formData, startImmediately: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-amber-500"
            />
            <label htmlFor="startImmediately" className="text-slate-300 font-sans cursor-pointer">
              Launch auction LIVE immediately on submit
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sans text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-sans text-sm shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? 'Creating...' : 'Publish Auction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
