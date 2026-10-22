import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const JOSTUM_API = import.meta.env.DEV ? '/jostum-api' : '/backend/public/jostum-api';

export function ReprintRequestStep({ staffData }) {
    const [reason, setReason] = useState('lost');
    const [details, setDetails] = useState('');
    const [paymentEmail, setPaymentEmail] = useState(staffData?.email || '');
    const [phone, setPhone] = useState(staffData?.phone || '');
    const [fee, setFee] = useState(2500);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch(`${JOSTUM_API}/v1/renewal-pricing`)
            .then(res => res.json())
            .then(data => {
                if (data?.data?.staff_amount_naira) {
                    setFee(Math.floor(data.data.staff_amount_naira));
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async () => {
        if (!staffData?.pf_number) return;
        setSubmitting(true);
        try {
            const callbackUrl = new URL(window.location.href);
            callbackUrl.search = '';
            callbackUrl.hash = '';

            const payload = {
                phone: phone.trim(),
                reason,
                details: details.trim(),
                callback_url: callbackUrl.toString(),
                email: paymentEmail.trim()
            };

            const response = await fetch(`${JOSTUM_API}/v1/staff/${staffData.pf_number}/card-renewal-payment/initialize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData?.message || responseData?.error || 'Failed to initialize payment');
            }

            toast.success(responseData.message || "Payment initialized");
            if (responseData?.payment?.authorization_url) {
                window.location.assign(responseData.payment.authorization_url);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Unable to initialize staff renewal payment.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Request Card Reprint / Renewal</h3>
            
            {staffData?.is_printed ? null : (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    A printed staff card is required before a renewal or replacement request can be submitted.
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Renewal reason</label>
                    <div className="grid gap-3 md:grid-cols-3">
                        {[
                            { value: 'lost', label: 'Lost Card', desc: 'Request a reissue for a lost card.' },
                            { value: 'damaged', label: 'Damaged Card', desc: 'Request replacement for broken/unreadable card.' },
                            { value: 'expired', label: 'Expired Card', desc: 'Request validity renewal for an expired card.' }
                        ].map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setReason(opt.value)}
                                className={`text-left p-3 rounded-xl border ${reason === opt.value ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className="font-semibold text-slate-900 text-sm">{opt.label}</div>
                                <div className="text-xs text-slate-600 mt-1">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Additional note (optional)</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2"
                        rows="3"
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        placeholder="Add any extra detail..."
                    ></textarea>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Phone Number</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Email for payment receipt</label>
                        <input 
                            type="email" 
                            className="w-full border border-slate-300 rounded-lg p-2"
                            value={paymentEmail}
                            onChange={e => setPaymentEmail(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={!staffData?.is_printed || submitting}
                    className="w-full md:w-auto bg-cyan-700 hover:bg-cyan-800 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50"
                >
                    {submitting ? 'Redirecting...' : `Pay ₦${fee.toLocaleString()} & Submit Request`}
                </button>
            </div>
        </div>
    );
}
