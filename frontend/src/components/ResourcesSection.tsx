import React, { useState } from 'react';
import { Hospital } from '../types';
import {
  Wind,
  Bed,
  HeartPulse,
  Droplet,
  Truck,
  Package,
  TrendingDown,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';

interface ResourcesSectionProps {
  hospitals: Hospital[];
  onOpenQuickRequest: (resourceType?: string) => void;
}

export const ResourcesSection: React.FC<ResourcesSectionProps> = ({
  hospitals,
  onOpenQuickRequest,
}) => {
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL');
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Resource Intelligence & Forecasting</h2>
          <p className="text-sm text-slate-500 mt-1">
            Predictive deficit countdowns and inventory across all participating regional health centers.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-xs">
            <span className="font-semibold text-slate-600">Simulate Surge:</span>
            <select
              value={surgeMultiplier}
              onChange={(e) => setSurgeMultiplier(parseFloat(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-blue-700 outline-none"
            >
              <option value={1.0}>1.0x (Normal Baseline)</option>
              <option value={1.5}>1.5x (Moderate Surge)</option>
              <option value={2.5}>2.5x (Severe Crisis)</option>
            </select>
          </div>

          <button
            onClick={() => onOpenQuickRequest()}
            className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            + Request Resource
          </button>
        </div>
      </div>

      {/* Predictive Shortage Forecast Highlight Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Predictive Shortage Countdown</h3>
          </div>
          <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-medium">
            Mathematical Burn-Rate Projection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {hospitals.map((h) => {
            const effectiveBurn = h.oxygen_liters.hourly_rate * surgeMultiplier;
            const usableLiters = Math.max(0, h.oxygen_liters.current - h.oxygen_liters.protected_reserve);
            const hoursToReserve = effectiveBurn > 0 ? (usableLiters / effectiveBurn).toFixed(1) : '999';
            const numHours = parseFloat(hoursToReserve);

            const isUrgent = numHours <= 8.0;
            const isCritical = numHours <= 4.0;

            return (
              <div
                key={h.id}
                className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-100">{h.name}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {h.code}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold tracking-tight ${
                        isCritical ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {hoursToReserve}h
                    </span>
                    <span className="text-xs text-slate-400 font-medium">to 20% reserve breach</span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {isCritical
                      ? 'Critical alert: Projected to breach protected reserve rapidly without replenishment.'
                      : isUrgent
                      ? 'Warning: Anticipating reserve pressure under current consumption trajectory.'
                      : 'Resources comfortably sufficient under current demand assumptions.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700 text-xs flex justify-between items-center text-slate-400">
                  <span>Burn rate: {effectiveBurn.toFixed(1)} L/h</span>
                  <button
                    onClick={() => onOpenQuickRequest('OXYGEN_LITERS')}
                    className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Share Surplus →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Inventory Table with Detailed Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Hospital Resource Ledger & Reserves</h3>
            <p className="text-xs text-slate-500">Every resource tracks total, in-use, reserved, and protected buffer.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Resource:</span>
            <div className="flex gap-1 text-xs">
              {['ALL', 'OXYGEN', 'VENTILATORS', 'BEDS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedResourceType(f)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    selectedResourceType === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Hospital</th>
                <th className="py-3.5 px-4">Usable ICU Beds</th>
                <th className="py-3.5 px-4">Ventilators (Free / Reserve)</th>
                <th className="py-3.5 px-4">Oxygen Liters (Current / Safe)</th>
                <th className="py-3.5 px-4">Blood (O- / O+)</th>
                <th className="py-3.5 px-4">Ambulances</th>
                <th className="py-3.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    <div>{h.name}</div>
                    <div className="text-[11px] font-normal text-slate-400">{h.code}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">
                      {h.icu_beds.usable} <span className="text-xs font-normal text-slate-500">/ {h.icu_beds.total}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Reserved: {h.icu_beds.reserved}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">
                      {h.ventilators.available} free
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Surplus: <span className="font-semibold text-emerald-700">{Math.max(0, h.ventilators.available - Math.round(h.total_ventilators * h.min_reserve_pct))}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">
                      {Math.round(h.oxygen_liters.current).toLocaleString()} L
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Reserve: {Math.round(h.oxygen_liters.protected_reserve)} L
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-900">
                      {h.blood_supplies.o_neg_units}u <span className="text-slate-400 font-normal">O-</span> | {h.blood_supplies.o_pos_units}u <span className="text-slate-400 font-normal">O+</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      {h.blood_supplies.transferable_o_neg}u surplus O-
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-bold text-slate-900">{h.ambulances.available}</span> / {h.ambulances.total}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => onOpenQuickRequest()}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                    >
                      Coordinate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
