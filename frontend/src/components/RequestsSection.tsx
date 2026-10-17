import React, { useState, useEffect } from 'react';
import {
  ResourceRequest,
  ResourceReservation,
  Hospital,
  DonorMatch
} from '../types';
import {
  createRequest,
  approveRequest,
  fetchReservations,
  completeReservation,
  matchDonors
} from '../api';
import {
  FileText,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  Truck,
  AlertTriangle,
  Send,
  Building,
  RefreshCw,
  X
} from 'lucide-react';

interface RequestsSectionProps {
  requests: ResourceRequest[];
  hospitals: Hospital[];
  onRefreshData: () => void;
  presetRequestFrom?: Hospital | null;
  presetResourceType?: string;
}

export const RequestsSection: React.FC<RequestsSectionProps> = ({
  requests,
  hospitals,
  onRefreshData,
  presetRequestFrom,
  presetResourceType,
}) => {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'LEDGER'>('REQUESTS');
  const [reservations, setReservations] = useState<ResourceReservation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Guided Form Step State
  const [step, setStep] = useState<number>(1);
  const [requestingHospId, setRequestingHospId] = useState<number>(hospitals[0]?.id || 1);
  const [resourceType, setResourceType] = useState<string>(presetResourceType || 'VENTILATORS');
  const [quantity, setQuantity] = useState<number>(4);
  const [urgency, setUrgency] = useState<string>('URGENT');
  const [clinicalReason, setClinicalReason] = useState<string>('Triage overflow requires supplementary mechanical ventilation');
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  // Load reservations
  const loadLedger = async () => {
    try {
      const res = await fetchReservations();
      setReservations(res);
    } catch (e) {
      console.error('Failed to load reservations:', e);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  // When step 3 is reached, fetch live donor matching
  const evaluateMatches = async () => {
    setIsMatching(true);
    try {
      const donorMatches = await matchDonors({
        requesting_hospital_id: requestingHospId,
        resource_type: resourceType,
        quantity: quantity,
      });
      setMatches(donorMatches);
      const firstFeasible = donorMatches.find((m) => m.is_feasible);
      if (firstFeasible) {
        setSelectedDonorId(firstFeasible.hospital_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleOpenModal = () => {
    setStep(1);
    if (presetRequestFrom) setRequestingHospId(presetRequestFrom.id);
    if (presetResourceType) setResourceType(presetResourceType);
    setIsModalOpen(true);
  };

  const handleNextToStep3 = async () => {
    setStep(3);
    await evaluateMatches();
  };

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    try {
      const reqRes = await createRequest({
        requesting_hospital_id: requestingHospId,
        target_hospital_id: selectedDonorId,
        resource_type: resourceType,
        quantity: quantity,
        urgency: urgency,
        clinical_reason: clinicalReason,
      });

      // Auto approve if donor selected in step 4
      if (selectedDonorId) {
        await approveRequest(reqRes.request_id, selectedDonorId, 'Authorized immediate coordinator approval');
      }

      setActionMessage('Request submitted & transaction-safely reserved in ledger!');
      setIsModalOpen(false);
      onRefreshData();
      loadLedger();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectApprove = async (reqId: number, targetHospId: number | null) => {
    const donorId = targetHospId || (hospitals.find((h) => h.id !== 1)?.id || 2);
    try {
      await approveRequest(reqId, donorId, 'Approved by Coordinator');
      setActionMessage('Resource approved and reserved.');
      onRefreshData();
      loadLedger();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleCompleteDelivery = async (resId: number) => {
    try {
      await completeReservation(resId);
      setActionMessage('Delivery confirmed. Inventory permanently updated.');
      onRefreshData();
      loadLedger();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & New Request button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Resource Requests & Reservation Ledger</h2>
          <p className="text-sm text-slate-500 mt-1">
            Transaction-safe coordination prevents duplicate allocation while strictly preserving donor hospital reserves.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'REQUESTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Requests Queue ({requests.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('LEDGER');
                loadLedger();
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'LEDGER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reservation Ledger ({reservations.length})
            </button>
          </div>

          <button
            onClick={handleOpenModal}
            className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            + Create Guided Request
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {actionMessage}
          </span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main Content: Requests Queue or Reservation Ledger */}
      {activeTab === 'REQUESTS' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Network Resource Requests
            </span>
            <span className="text-xs text-slate-500">Human Approval Mandatory</span>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.map((req) => {
              const isNew = req.status === 'NEW' || req.status === 'AWAITING_REVIEW';
              const isApproved = req.status === 'APPROVED';
              const isDelivered = req.status === 'DELIVERED';

              return (
                <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {req.request_number}
                      </span>
                      <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        req.urgency === 'CRITICAL_EMERGENCY'
                          ? 'bg-red-100 text-red-800'
                          : req.urgency === 'URGENT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.urgency}
                      </span>
                      <span className="text-xs text-slate-400">
                        {req.created_at ? new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="text-base font-bold text-slate-900 mt-1">
                      {req.quantity} × {req.resource_type.replace('_', ' ')}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{req.requesting_hospital_name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-blue-800">{req.target_hospital_name}</span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5 italic">
                      "{req.clinical_reason}"
                    </p>

                    {req.logistics_notes && (
                      <div className="text-[11px] text-teal-700 font-medium">
                        Logistics: {req.logistics_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      isDelivered
                        ? 'bg-emerald-100 text-emerald-800'
                        : isApproved
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>

                    {isNew && (
                      <button
                        onClick={() => handleDirectApprove(req.id, req.target_hospital_id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Approve & Reserve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Reservation Ledger View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Auditable Resource Reservation Ledger
              </span>
            </div>
            <span className="text-xs text-slate-500">Atomic Locks Active</span>
          </div>

          <div className="divide-y divide-slate-100">
            {reservations.map((res) => {
              const isReceived = res.status === 'RECEIVED';
              return (
                <div key={res.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">LEDGER-#{res.id}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isReceived ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {res.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {res.quantity} {res.resource_type}
                    </div>

                    <div className="text-xs text-slate-600 mt-0.5">
                      Donor: <span className="font-semibold">{res.donor_hospital_name}</span> → Recipient:{' '}
                      <span className="font-semibold text-blue-800">{res.recipient_hospital_name}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1">{res.notes}</p>
                  </div>

                  {!isReceived && (
                    <button
                      onClick={() => handleCompleteDelivery(res.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Confirm Delivery
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Guided 5-Step Workflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Guided 5-Step Action</span>
                <h3 className="text-xl font-bold text-slate-900">Request Healthcare Resources</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between text-xs font-bold border-b pb-3 text-slate-400">
              <span className={step >= 1 ? 'text-blue-600' : ''}>1. Resource</span>
              <span>→</span>
              <span className={step >= 2 ? 'text-blue-600' : ''}>2. Quantity</span>
              <span>→</span>
              <span className={step >= 3 ? 'text-blue-600' : ''}>3. Match</span>
              <span>→</span>
              <span className={step >= 4 ? 'text-blue-600' : ''}>4. Review</span>
            </div>

            {/* Step 1: Choose Resource & Requesting Hospital */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Requesting Facility</label>
                  <select
                    value={requestingHospId}
                    onChange={(e) => setRequestingHospId(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Required Resource Type</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'VENTILATORS', label: 'Ventilators' },
                      { id: 'OXYGEN_LITERS', label: 'Oxygen (Liters)' },
                      { id: 'ICU_BEDS', label: 'ICU Beds' },
                      { id: 'BLOOD_O_NEG', label: 'Blood (O- Negative)' },
                      { id: 'AMBULANCES', label: 'Ambulance Support' },
                      { id: 'MEDICINE_KITS', label: 'Medicine Kits' },
                    ].map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setResourceType(r.id)}
                        className={`p-3 rounded-xl border text-left font-bold transition ${
                          resourceType === r.id
                            ? 'bg-blue-50 border-blue-600 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700"
                  >
                    Continue to Quantity →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Quantity & Urgency */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Requested Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    System will only match hospitals with transferable surplus above their 20% protected reserve.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['ROUTINE', 'URGENT', 'CRITICAL_EMERGENCY'].map((u) => (
                      <button
                        type="button"
                        key={u}
                        onClick={() => setUrgency(u)}
                        className={`p-2.5 rounded-xl border font-bold text-center ${
                          urgency === u
                            ? u === 'CRITICAL_EMERGENCY'
                              ? 'bg-red-50 border-red-600 text-red-900'
                              : 'bg-blue-50 border-blue-600 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {u.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Justification</label>
                  <textarea
                    rows={2}
                    value={clinicalReason}
                    onChange={(e) => setClinicalReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-slate-600 font-semibold text-xs"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNextToStep3}
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700"
                  >
                    Check Available Surplus →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review Options & Capability Match */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Eligible Donor Hospitals</h4>
                  <span className="text-xs text-slate-500">Fairness-Aware Ranked</span>
                </div>

                {isMatching ? (
                  <div className="py-8 text-center text-slate-500 text-xs">Evaluating constraints...</div>
                ) : matches.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl">
                    No other hospitals currently in network.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m) => (
                      <div
                        key={m.hospital_id}
                        onClick={() => m.is_feasible && setSelectedDonorId(m.hospital_id)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          selectedDonorId === m.hospital_id
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
                            : m.is_feasible
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-slate-900">{m.hospital_name}</span>
                            <div className="text-xs text-slate-500">
                              {m.distance_km} km away (~{m.estimated_minutes} min emergency transit)
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              m.is_feasible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.is_feasible ? 'Eligible Donor' : 'Ineligible'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 mt-2 leading-relaxed">{m.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-600 font-semibold text-xs">
                    ← Back
                  </button>
                  <button
                    disabled={!selectedDonorId}
                    onClick={() => setStep(4)}
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    Review & Confirm →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Final Confirmation */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-900 text-sm">Summary of Coordination Order</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-500 block">Resource</span>
                      <span className="font-bold">{quantity} × {resourceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Urgency</span>
                      <span className="font-bold text-red-700">{urgency}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Requesting Hospital</span>
                      <span className="font-semibold">{hospitals.find((h) => h.id === requestingHospId)?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Donor Hospital</span>
                      <span className="font-semibold text-blue-700">{hospitals.find((h) => h.id === selectedDonorId)?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Transaction Safety Ledger Guarantee</span>
                  </div>
                  <span>
                    Submitting locks the inventory atomically in the reservation ledger, preventing any second facility
                    from double-allocating these units.
                  </span>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(3)} className="px-4 py-2 text-slate-600 font-semibold text-xs">
                    ← Back
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmitRequest}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? 'Securing in Ledger...' : 'Authorize & Reserve Resource'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
