import React, { useState, useEffect } from 'react';
import { Hospital, ResourceRequest } from './types';
import {
  fetchOverview,
  fetchHospitals,
  fetchRequests,
  resetDemo,
  createPatientTransfer
} from './api';
import { Navbar } from './components/Navbar';
import { OverviewSection } from './components/OverviewSection';
import { HospitalsSection } from './components/HospitalsSection';
import { ResourcesSection } from './components/ResourcesSection';
import { RequestsSection } from './components/RequestsSection';
import { EmergencyModeSection } from './components/EmergencyModeSection';
import { CityMapModal } from './components/CityMapModal';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal';
import { ShieldCheck, Heart, Info, RefreshCw, Send, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Modals
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);

  // Quick action presets for Requests section
  const [presetHospital, setPresetHospital] = useState<Hospital | null>(null);
  const [presetResourceType, setPresetResourceType] = useState<string | undefined>(undefined);

  // Patient Transfer Modal
  const [transferOriginHosp, setTransferOriginHosp] = useState<Hospital | null>(null);
  const [transferDestId, setTransferDestId] = useState<number>(2);
  const [patientRefCode, setPatientRefCode] = useState<string>('PT-DEMO-901');
  const [requiresIcu, setRequiresIcu] = useState<boolean>(true);
  const [requiresVentilator, setRequiresVentilator] = useState<boolean>(true);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ov, hs, rq] = await Promise.all([
        fetchOverview(),
        fetchHospitals(),
        fetchRequests(),
      ]);
      setOverviewData(ov);
      setHospitals(hs);
      setRequests(rq);
    } catch (e) {
      console.error('Failed to load application data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemo();
      await loadData();
      setActiveTab('overview');
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleInitiateTransfer = (hospital: Hospital) => {
    setTransferOriginHosp(hospital);
    const candidateDest = hospitals.find((h) => h.id !== hospital.id);
    if (candidateDest) setTransferDestId(candidateDest.id);
  };

  const handleExecuteTransfer = async () => {
    if (!transferOriginHosp) return;
    setIsTransferring(true);
    try {
      const res = await createPatientTransfer({
        origin_hospital_id: transferOriginHosp.id,
        destination_hospital_id: transferDestId,
        patient_ref_code: patientRefCode,
        acuity_level: 'URGENT',
        requires_icu: requiresIcu,
        requires_ventilator: requiresVentilator,
      });
      setTransferSuccess(`Patient transfer scheduled (${res.transfer_code}). Estimated transit: ${res.route.estimated_transit_minutes} mins.`);
      setTransferOriginHosp(null);
      await loadData();
    } catch (err: any) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOpenQuickRequest = (resType?: string) => {
    setPresetResourceType(resType);
    setActiveTab('requests');
  };

  const handleRequestResourceFrom = (hospital: Hospital) => {
    setPresetHospital(hospital);
    setActiveTab('requests');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMap={() => setIsMapOpen(true)}
        onStartDemo={() => setIsDemoOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {transferSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              {transferSuccess}
            </span>
            <button onClick={() => setTransferSuccess(null)} className="text-emerald-700 font-bold p-1">
              ✕
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-base font-semibold text-slate-700">Connecting to Regional Coordination Network...</p>
            <p className="text-xs text-slate-500">Retrieving capacity metrics and reservation ledger.</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewSection
                overviewData={overviewData}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenQuickRequest={() => handleOpenQuickRequest()}
                onStartSimulation={() => setActiveTab('emergency')}
                onOpenMap={() => setIsMapOpen(true)}
              />
            )}

            {activeTab === 'hospitals' && (
              <HospitalsSection
                hospitals={hospitals}
                onInitiateTransfer={handleInitiateTransfer}
                onRequestResourceFrom={handleRequestResourceFrom}
              />
            )}

            {activeTab === 'resources' && (
              <ResourcesSection
                hospitals={hospitals}
                onOpenQuickRequest={handleOpenQuickRequest}
              />
            )}

            {activeTab === 'requests' && (
              <RequestsSection
                requests={requests}
                hospitals={hospitals}
                onRefreshData={loadData}
                presetRequestFrom={presetHospital}
                presetResourceType={presetResourceType}
              />
            )}

            {activeTab === 'emergency' && (
              <EmergencyModeSection
                hospitals={hospitals}
                onTriggerCoordination={() => setActiveTab('requests')}
              />
            )}
          </>
        )}
      </main>

      {/* City Map Modal */}
      <CityMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        hospitals={hospitals}
        onSelectHospital={(h) => {
          setActiveTab('hospitals');
        }}
      />

      {/* 90-Second Demo Story Walkthrough */}
      <DemoWalkthroughModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        hospitals={hospitals}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onResetDemo={handleResetDemo}
      />

      {/* Patient Transfer Coordination Modal */}
      {transferOriginHosp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Patient Transfer Workflow</span>
                <h3 className="text-xl font-bold text-slate-900">Coordinate Patient Diversion</h3>
              </div>
              <button onClick={() => setTransferOriginHosp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Origin Hospital</label>
                <div className="p-2.5 rounded-xl bg-slate-50 border font-semibold text-slate-900">
                  {transferOriginHosp.name} ({transferOriginHosp.code})
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Facility</label>
                <select
                  value={transferDestId}
                  onChange={(e) => setTransferDestId(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
                >
                  {hospitals
                    .filter((h) => h.id !== transferOriginHosp.id)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.icu_beds.usable} usable ICU beds available)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Ref (Fictional)</label>
                  <input
                    type="text"
                    value={patientRefCode}
                    onChange={(e) => setPatientRefCode(e.target.value)}
                    className="w-full p-2 rounded-lg border font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Acuity Level</label>
                  <div className="p-2 rounded-lg bg-red-50 text-red-900 border border-red-200 font-bold">
                    CRITICAL / URGENT
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border">
                <span className="font-bold text-slate-800 block">Required Clinical Support</span>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresIcu}
                    onChange={(e) => setRequiresIcu(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Requires Staffed ICU Bed</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresVentilator}
                    onChange={(e) => setRequiresVentilator(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Requires Dedicated Mechanical Ventilator</span>
                </label>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px]">
                <strong>Decision-Support Safeguard:</strong> This action schedules priority emergency transit and
                reserves recipient bed capacity. Final clinical dispatch requires attending physician confirmation.
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setTransferOriginHosp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isTransferring}
                onClick={handleExecuteTransfer}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTransferring ? 'Scheduling...' : 'Authorize Priority Transfer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Healthcare Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">CRISISCARE AI</span>
            <span>•</span>
            <span>Adaptive Healthcare Coordination & Emergency Response Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>MSME Hackathon Prototype</span>
            <span>•</span>
            <span>Synthetic Demonstration Data</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Human-in-the-Loop Safe
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
