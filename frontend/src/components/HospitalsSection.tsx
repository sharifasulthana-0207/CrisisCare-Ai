import React, { useState } from 'react';
import { Hospital } from '../types';
import {
  Building2,
  Bed,
  HeartPulse,
  Wind,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  Send,
  Users
} from 'lucide-react';

interface HospitalsSectionProps {
  hospitals: Hospital[];
  onInitiateTransfer: (hospital: Hospital) => void;
  onRequestResourceFrom: (hospital: Hospital) => void;
}

export const HospitalsSection: React.FC<HospitalsSectionProps> = ({
  hospitals,
  onInitiateTransfer,
  onRequestResourceFrom,
}) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Participating Hospitals</h2>
          <p className="text-sm text-slate-500 mt-1">
            Constraint-aware capacity tracking. Usable beds require certified on-duty staffing and compatible equipment.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>20% Protected Operational Reserve strictly enforced</span>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((h) => {
          const isHealthy = h.status === 'HEALTHY';
          const isAttention = h.status === 'ATTENTION';
          const isCritical = h.status === 'CRITICAL';

          return (
            <div
              key={h.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {h.code}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{h.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{h.hospital_type}</p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isHealthy
                        ? 'bg-emerald-100 text-emerald-800'
                        : isAttention
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isHealthy ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{h.status}</span>
                  </span>
                </div>

                {/* Status reason banner if not healthy */}
                {!isHealthy && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                    <span>{h.status_reason}</span>
                  </div>
                )}
              </div>

              {/* Capacity Breakdown */}
              <div className="p-5 space-y-4">
                {/* General Beds Metric */}
                <div>
                  <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-blue-600" />
                      General Beds Occupancy
                    </span>
                    <span className="font-bold text-slate-900">
                      {h.general_beds.occupied} / {h.general_beds.total} ({h.general_beds.occupancy_pct}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        h.general_beds.occupancy_pct > 85 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, h.general_beds.occupancy_pct)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Physical Free: {h.general_beds.available}</span>
                    <span className="font-bold text-emerald-700">Staffed Usable: {h.general_beds.usable}</span>
                  </div>
                </div>

                {/* ICU Beds Metric */}
                <div>
                  <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-red-600" />
                      ICU Usable Capacity
                    </span>
                    <span className="font-bold text-slate-900">
                      {h.icu_beds.usable} usable / {h.icu_beds.total} total
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        h.icu_beds.usable <= 2 ? 'bg-red-500' : h.icu_beds.usable <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (h.icu_beds.occupied / h.icu_beds.total) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Reserved: {h.icu_beds.reserved}</span>
                    <span>Staff Ratio: 1:{h.icu_beds.usable > 0 ? '2' : 'full'}</span>
                  </div>
                </div>

                {/* Oxygen & Ventilators summary row */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-teal-600" />
                      Oxygen Stock
                    </span>
                    <div className="font-bold text-slate-900 mt-1">
                      {Math.round(h.oxygen_liters.current).toLocaleString()} L
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ~{h.oxygen_liters.hours_to_reserve}h to reserve
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      Active Staff
                    </span>
                    <div className="font-bold text-slate-900 mt-1">
                      {h.active_doctors} Dr / {h.active_nurses} Nurse
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {h.ambulances.available} ambulances ready
                    </div>
                  </div>
                </div>

                {/* Capabilities pills */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Capabilities:</div>
                  <div className="flex flex-wrap gap-1">
                    {h.capabilities.slice(0, 3).map((cap, idx) => (
                      <span key={idx} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {cap}
                      </span>
                    ))}
                    {h.capabilities.length > 3 && (
                      <span className="text-[11px] text-slate-400 font-medium px-1">
                        +{h.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedHospital(h)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  View Details
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRequestResourceFrom(h)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-white border border-slate-300 text-blue-700 hover:bg-blue-50 transition shadow-xs cursor-pointer"
                  >
                    Request
                  </button>
                  <button
                    onClick={() => onInitiateTransfer(h)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Transfer</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hospital Detailed Modal */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  {selectedHospital.code}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedHospital.name}</h3>
                <p className="text-xs text-slate-500">{selectedHospital.address}</p>
              </div>
              <button
                onClick={() => setSelectedHospital(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Contact & Capabilities */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>{selectedHospital.contact_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>{selectedHospital.contact_email}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Certified Clinical Capabilities</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedHospital.capabilities.map((c, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Protected Reserve Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Protected Reserve Ledger Policy ({intPct(selectedHospital.min_reserve_pct)}%)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                By network safety protocol, {selectedHospital.name} maintains a mandatory {intPct(selectedHospital.min_reserve_pct)}% reserve
                on all ventilators and oxygen storage. Resources below this buffer cannot be requisitioned by external facilities.
              </p>
              <div className="pt-2 grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded border">
                  <span className="text-slate-500 block">O2 Reserve</span>
                  <span className="font-bold text-slate-900">{Math.round(selectedHospital.oxygen_liters.protected_reserve)} L</span>
                </div>
                <div className="bg-white p-2 rounded border">
                  <span className="text-slate-500 block">Transferable Surplus</span>
                  <span className="font-bold text-emerald-700">{Math.round(selectedHospital.oxygen_liters.transferable_surplus)} L</span>
                </div>
                <div className="bg-white p-2 rounded border">
                  <span className="text-slate-500 block">Ambulances Ready</span>
                  <span className="font-bold text-slate-900">{selectedHospital.ambulances.available}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedHospital(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const h = selectedHospital;
                  setSelectedHospital(null);
                  onInitiateTransfer(h);
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-xs hover:bg-blue-700"
              >
                Initiate Patient Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function intPct(val: number): number {
  return Math.round(val * 100);
}
