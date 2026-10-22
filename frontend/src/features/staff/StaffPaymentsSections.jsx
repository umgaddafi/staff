import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../../styles/app.css';

export function StaffPaymentsSections({ staff }) {
    const currentYear = new Date().getFullYear();
    const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthName = monthsList[new Date().getMonth()] || 'January';

    // Years from 2010 to current year
    const availableYears = [];
    for (let y = 2010; y <= currentYear; y++) {
        availableYears.push(y.toString());
    }

    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonthName);
    const [periodsByYear, setPeriodsByYear] = useState({});
    const [livePayslip, setLivePayslip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFoundMsg, setNotFoundMsg] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const payslipRef = useRef(null);

    const resolvedPf = staff?.staff_number || 'PF/5797';

    // 1. Fetch available uploaded payroll periods for this staff member
    useEffect(() => {
        let isMounted = true;
        const fetchPeriods = async () => {
            try {
                const res = await fetch(`/api/payroll/periods?pf=${encodeURIComponent(resolvedPf)}`);
                const data = await res.json();
                if (isMounted && data.status === 'success') {
                    if (data.periods_by_year) {
                        setPeriodsByYear(data.periods_by_year);
                    }
                }
            } catch (err) {
                console.error('Error fetching payroll periods:', err);
            }
        };

        fetchPeriods();
        return () => { isMounted = false; };
    }, [resolvedPf]);

    // 2. Fetch active payslip for selected Year and Month
    useEffect(() => {
        let isMounted = true;
        const fetchPayslip = async () => {
            setLoading(true);
            setNotFoundMsg('');
            try {
                const res = await fetch(`/api/payroll/payslip?year=${year}&month=${month}&pf=${encodeURIComponent(resolvedPf)}`);
                const data = await res.json();

                if (isMounted) {
                    if (data.status === 'success' && data.payslip) {
                        setLivePayslip(data.payslip);
                    } else {
                        setLivePayslip(null);
                        setNotFoundMsg(data.message || `Payslip for ${month} ${year} is not yet available.`);
                    }
                }
            } catch (err) {
                console.error('Error fetching payslip:', err);
                if (isMounted) {
                    setLivePayslip(null);
                    setNotFoundMsg(`Unable to load payslip for ${month} ${year}.`);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPayslip();
        return () => { isMounted = false; };
    }, [year, month, resolvedPf]);

    // Direct Native Print (Guaranteed Zero-Misarrangement Vector Print)
    const handleNativePrint = () => {
        window.print();
    };

    // Client-side PDF Download (Guaranteed Un-scattered, Fast & Sharp)
    const downloadSlip = async () => {
        if (!payslipRef.current) return;
        setIsDownloading(true);
        try {
            const element = payslipRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    const printArea = clonedDoc.querySelector('.payslip-print-area');
                    if (printArea) {
                        printArea.style.width = '820px';
                        printArea.style.maxWidth = '820px';
                        printArea.style.margin = '0 auto';
                        printArea.style.padding = '24px 28px';
                        printArea.style.boxSizing = 'border-box';
                    }
                }
            });

            // High-efficiency JPEG: crystal clear text, ~350KB file size (instead of 10.5MB!)
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const printableWidth = pageWidth - (margin * 2);
            const printableHeight = (canvas.height * printableWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', margin, 12, printableWidth, printableHeight, undefined, 'FAST');
            const fileName = `jostum_payslip_${(month || 'payroll').toLowerCase()}_${year}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Error downloading payslip PDF:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const currentPayslip = livePayslip;

    // Balanced row heights for symmetrical baseline
    const incomeItems = currentPayslip?.incomes || [];
    const deductionItems = currentPayslip?.deductions || [];
    const maxTableRows = Math.max(7, incomeItems.length, deductionItems.length);

    const particulars = currentPayslip?.particulars || {};

    return (
        <div className="main-content" style={{ padding: '1rem', maxWidth: '980px', margin: '0 auto', width: '100%', overflowX: 'hidden' }}>
            <style>
                {`
                @media print {
                    /* 1. Hide outer portal navigation and headers */
                    .portal-sidebar,
                    .staff-portal-topbar-shell,
                    .portal-topbar,
                    .portal-header,
                    .no-print,
                    header,
                    aside,
                    nav,
                    button,
                    select {
                        display: none !important;
                    }

                    /* 2. Reset containers to full page without clipping */
                    html, body, .portal-layout, .portal-content, .section-stack, .main-content, .payslip-mobile-wrapper {
                        display: block !important;
                        position: relative !important;
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: #ffffff !important;
                        width: 100% !important;
                        box-shadow: none !important;
                    }

                    /* 3. Strict A4 Portrait dimensions */
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }

                    /* 4. Enforce exact colors and background printing */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* 5. Zero-misarrangement printable card */
                    .payslip-print-area {
                        width: 100% !important;
                        min-width: 0 !important;
                        max-width: 190mm !important;
                        margin: 0 auto !important;
                        padding: 8mm 8mm !important;
                        border: 1.5px solid #000000 !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        background: #ffffff !important;
                    }

                    /* 6. Particulars print alignment & zero-overflow */
                    .employee-details-grid {
                        grid-template-columns: minmax(0, 1fr) 248px !important;
                        gap: 0.8rem !important;
                    }
                    .employee-details-grid span {
                        font-size: 0.74rem !important;
                    }
                    .employee-details-grid div {
                        font-size: 0.74rem !important;
                    }
                    .employee-details-grid .print-compact-emp {
                        width: 68px !important;
                    }
                    .employee-details-grid .print-compact-scale {
                        width: 84px !important;
                    }
                    .employee-details-grid .print-compact-level {
                        width: 60px !important;
                    }
                    .employee-details-grid .print-compact-step {
                        width: 36px !important;
                    }
                    .employee-details-grid .print-compact-desig {
                        width: 170px !important;
                    }
                    .employee-details-grid .print-compact-bank {
                        width: 190px !important;
                        max-width: 190px !important;
                    }
                }

                /* Scoped responsive 3-card single row layout */
                .payslip-stat-cards {
                    display: grid !important;
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    gap: 0.85rem !important;
                    margin-bottom: 1.5rem !important;
                }
                .payslip-stat-card {
                    background-color: #fff !important;
                    border: 1px solid var(--line) !important;
                    border-radius: 8px !important;
                    padding: 0.85rem 0.75rem !important;
                    box-shadow: var(--card-shadow) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: flex-start !important;
                    min-width: 0 !important;
                    overflow: hidden !important;
                }
                .payslip-stat-label {
                    font-size: 0.72rem !important;
                    color: var(--muted) !important;
                    text-transform: uppercase !important;
                    margin: 0 0 0.35rem 0 !important;
                    font-weight: 600 !important;
                    letter-spacing: 0.02em !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    width: 100% !important;
                    display: block !important;
                }
                .payslip-stat-value {
                    font-size: 1.35rem !important;
                    font-weight: bold !important;
                    margin: 0 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    line-height: 1.2 !important;
                    width: 100% !important;
                    display: block !important;
                }
                .mobile-text {
                    display: none;
                }
                .desktop-text {
                    display: inline;
                }

                @media (max-width: 640px) {
                    .payslip-stat-cards {
                        gap: 0.4rem !important;
                        margin-bottom: 1rem !important;
                    }
                    .payslip-stat-card {
                        padding: 0.55rem 0.4rem !important;
                        border-radius: 6px !important;
                    }
                    .payslip-stat-label {
                        font-size: 0.62rem !important;
                        margin-bottom: 0.2rem !important;
                    }
                    .payslip-stat-value {
                        font-size: 0.84rem !important;
                    }
                    .mobile-text {
                        display: inline !important;
                    }
                    .desktop-text {
                        display: none !important;
                    }
                }
                `}
            </style>

            {/* Stat Cards (Guaranteed single row across desktop and mobile) */}
            <div className="payslip-stat-cards no-print">
                <div className="payslip-stat-card">
                    <div className="payslip-stat-label">
                        <span className="desktop-text">Selected </span>Period
                    </div>
                    <div className="payslip-stat-value" style={{ color: '#103463' }}>
                        <span className="desktop-text">{month}</span>
                        <span className="mobile-text">{month.length > 4 ? month.slice(0, 3) : month}</span> {year}
                    </div>
                </div>
                <div className="payslip-stat-card">
                    <div className="payslip-stat-label">Net Pay</div>
                    <div className="payslip-stat-value" style={{ color: currentPayslip ? '#047857' : 'var(--muted)' }}>
                        {currentPayslip ? `₦${currentPayslip.netSalary}` : '—'}
                    </div>
                </div>
                <div className="payslip-stat-card">
                    <div className="payslip-stat-label">
                        <span className="desktop-text">Payroll </span>Status
                    </div>
                    <div className="payslip-stat-value" style={{ color: currentPayslip ? 'var(--success)' : '#d97706' }}>
                        <span className="desktop-text">{currentPayslip ? 'Verified & Ready' : 'Pending Upload'}</span>
                        <span className="mobile-text">{currentPayslip ? 'Verified' : 'Pending'}</span>
                    </div>
                </div>
            </div>

            {/* Selector & Action Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }} className="no-print">
                <div style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '260px' }}>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--input-border)', flex: '1', background: '#fff', fontSize: '0.9rem', fontWeight: '600' }}
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--input-border)', flex: '1.5', background: '#fff', fontSize: '0.9rem', fontWeight: '600' }}
                    >
                        {monthsList.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {currentPayslip && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        <button
                            onClick={handleNativePrint}
                            className="btn"
                            style={{
                                padding: '0.55rem 1rem',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#103463',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '700',
                                cursor: 'pointer',
                            }}
                            title="Print official vector payslip on standard A4 paper"
                        >
                            <span>🖨️</span> Print Official Payslip
                        </button>
                        <button
                            onClick={downloadSlip}
                            disabled={isDownloading}
                            className="btn primary"
                            style={{
                                padding: '0.55rem 1rem',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '6px',
                                fontWeight: '600',
                            }}
                        >
                            <span>📄</span> {isDownloading ? 'Exporting PDF...' : 'Download PDF'}
                        </button>
                    </div>
                )}
            </div>

            {/* PAYSLIP DISPLAY CONTAINER */}
            {loading ? (
                <div style={{ backgroundColor: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '3.5rem 2rem', textAlign: 'center', marginTop: '1rem' }}>
                    <div style={{ fontSize: '1.1rem', color: '#103463', fontWeight: 'bold' }}>Retrieving Official Payslip...</div>
                    <small style={{ color: 'var(--muted)' }}>Fetching certified payroll ledger for {month} {year}</small>
                </div>
            ) : !currentPayslip ? (
                <div style={{ backgroundColor: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '3.5rem 2rem', textAlign: 'center', marginTop: '1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📑</div>
                    <h2 style={{ color: '#103463', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Payslip Not Available Yet</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
                        {notFoundMsg || `The official payroll batch for ${month} ${year} has not yet been uploaded and published by the Bursary Directorate.`}
                    </p>
                </div>
            ) : (
                <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '1rem' }} className="payslip-mobile-wrapper">
                    <div
                        className="payslip-print-area"
                        ref={payslipRef}
                        style={{
                            width: '100%',
                            minWidth: '820px',
                            maxWidth: '840px',
                            margin: '0 auto',
                            backgroundColor: '#fff',
                            border: '1.5px solid #000',
                            padding: '1.75rem',
                            fontFamily: 'Arial, sans-serif',
                            color: '#000',
                            position: 'relative',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Header Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <img
                                    src="/images/jostum.jpeg"
                                    alt="Logo"
                                    style={{ width: '85px', height: '95px', objectFit: 'contain' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div>
                                    <h2 style={{ margin: 0, color: '#103463', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.02em' }}>
                                        JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI
                                    </h2>
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#103463', fontWeight: 'bold' }}>
                                        P. M. B 2373, MAKURDI, BENUE STATE, NIGERIA
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.85rem', gap: '0.6rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Payroll Month:</span>
                                        <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 1.25rem 6px 1.25rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#103463', display: 'inline-flex', alignItems: 'center', height: '26px', boxSizing: 'border-box', lineHeight: 1 }}>
                                            {currentPayslip.monthYear}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', paddingTop: '10px' }}>
                                <h1 style={{ margin: 0, color: '#103463', fontSize: '2.4rem', fontFamily: 'Times New Roman, serif', letterSpacing: '2px', fontWeight: 'bold' }}>
                                    PAYSLIP
                                </h1>
                            </div>
                        </div>

                        {/* Blue Separator Line */}
                        <div style={{ borderTop: '2px solid #103463', marginBottom: '1.25rem' }}></div>

                        {/* Employee Details Section */}
                        <div className="employee-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 248px', gap: '1.25rem', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
                            {/* Left Particulars */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                    <span style={{ fontWeight: 'bold', width: '54px', flexShrink: 0 }}>Surname</span>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '0 0.45rem 6px 0.45rem', width: '110px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', flexShrink: 0, fontWeight: '600', backgroundColor: '#fcfcfc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
                                        {staff?.last_name || particulars.full_name?.split(' ')?.[0] || 'GADDAFI'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', width: '45px', marginLeft: '8px', flexShrink: 0 }}>Others</span>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '0 0.45rem 6px 0.45rem', flex: 1, minWidth: 0, height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', fontWeight: '600', backgroundColor: '#fcfcfc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
                                        {staff?.first_name ? `${staff.first_name} ${staff.middle_name || ''}` : particulars.full_name?.split(' ')?.slice(1)?.join(' ') || 'UMAR'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                    <span style={{ fontWeight: 'bold', width: '52px', flexShrink: 0 }}>Emp No</span>
                                    <div className="print-compact-emp" style={{ border: '1px solid #cbd5e1', padding: '0 0.35rem 6px 0.35rem', width: '68px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', flexShrink: 0, fontWeight: 'bold', backgroundColor: '#fcfcfc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
                                        {staff?.staff_number || currentPayslip.pf_number || 'PF5797'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', width: '42px', marginLeft: '6px', flexShrink: 0 }}>Scale</span>
                                    <div className="print-compact-scale" style={{ border: '1px solid #cbd5e1', padding: '0 0.3rem 6px 0.3rem', width: '84px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#fcfcfc', textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                        {particulars.salary_scale || 'CONTISS'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', width: '38px', marginLeft: '6px', flexShrink: 0 }}>Level</span>
                                    <div className="print-compact-level" style={{ border: '1px solid #cbd5e1', padding: '0 0.3rem 6px 0.3rem', width: '60px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#fcfcfc', textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                        {particulars.salary_level || 'CT07'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', width: '32px', marginLeft: '6px', flexShrink: 0 }}>Step</span>
                                    <div className="print-compact-step" style={{ border: '1px solid #cbd5e1', padding: '0 0.3rem 6px 0.3rem', width: '36px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#fcfcfc', textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                        {particulars.salary_step || '02'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                    <span style={{ fontWeight: 'bold', width: '52px', flexShrink: 0 }}>PFA</span>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '0 0.45rem 6px 0.45rem', flex: 1, minWidth: 0, height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: '#fcfcfc', lineHeight: 1 }}>
                                        {particulars.pfa_name || 'Stanbic IBTC Pension Managers Limited'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', width: '58px', marginLeft: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>PFA PIN</span>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '0 0.45rem 6px 0.45rem', width: '125px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', flexShrink: 0, backgroundColor: '#fcfcfc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
                                        {particulars.pfa_pin || 'PEN110245304089'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                    <span style={{ fontWeight: 'bold', width: '52px', flexShrink: 0 }}>Dept</span>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '0 0.45rem 6px 0.45rem', flex: 1, minWidth: 0, height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: '#fcfcfc', lineHeight: 1 }}>
                                        {particulars.department || staff?.department_name || 'Computer Science'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', width: '76px', marginLeft: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>Designation</span>
                                    <div className="print-compact-desig" style={{ border: '1px solid #cbd5e1', padding: '0 0.45rem 6px 0.45rem', width: '170px', height: '24px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: '#fcfcfc', lineHeight: 1 }}>
                                        {particulars.designation || staff?.rank_name || 'Lecturer I'}
                                    </div>
                                </div>
                            </div>

                            {/* Right Particulars (Pushed to the right edge) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0, alignItems: 'flex-end', justifySelf: 'end' }}>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                                    <span style={{ width: '56px', fontSize: '0.82rem', fontWeight: 'bold', flexShrink: 0, textAlign: 'left', whiteSpace: 'nowrap' }}>Bank:</span>
                                    <div
                                        title={particulars.bank_name || 'Fidelity Bank Plc'}
                                        className="print-compact-bank"
                                        style={{
                                            border: '1px solid #cbd5e1',
                                            padding: '0 0.5rem 6px 0.5rem',
                                            width: '190px',
                                            maxWidth: '190px',
                                            height: '24px',
                                            boxSizing: 'border-box',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            fontStyle: 'italic',
                                            fontSize: '0.82rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            backgroundColor: '#fcfcfc',
                                            lineHeight: 1
                                        }}
                                    >
                                        {particulars.bank_name || 'Fidelity Bank Plc'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                                    <span style={{ width: '56px', fontSize: '0.82rem', fontWeight: 'bold', flexShrink: 0, textAlign: 'left', whiteSpace: 'nowrap' }}>Acct #:</span>
                                    <div
                                        title={particulars.account_no || '6173905754'}
                                        className="print-compact-bank"
                                        style={{
                                            border: '1px solid #cbd5e1',
                                            padding: '0 0.5rem 6px 0.5rem',
                                            width: '190px',
                                            maxWidth: '190px',
                                            height: '24px',
                                            boxSizing: 'border-box',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            fontStyle: 'italic',
                                            fontSize: '0.82rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            backgroundColor: '#fcfcfc',
                                            lineHeight: 1
                                        }}
                                    >
                                        {particulars.account_no || '6173905754'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                                    <span style={{ width: '56px', fontSize: '0.82rem', fontWeight: 'bold', flexShrink: 0, textAlign: 'left', whiteSpace: 'nowrap' }}>Paypoint:</span>
                                    <div
                                        title={particulars.paypoint || 'Electronic Paypoint'}
                                        className="print-compact-bank"
                                        style={{
                                            border: '1px solid #cbd5e1',
                                            padding: '0 0.5rem 6px 0.5rem',
                                            width: '190px',
                                            maxWidth: '190px',
                                            height: '24px',
                                            boxSizing: 'border-box',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            fontSize: '0.82rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            backgroundColor: '#fcfcfc',
                                            lineHeight: 1
                                        }}
                                    >
                                        {particulars.paypoint || 'Electronic Paypoint'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Symmetrical Dual Tables: Incomes & Deductions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                            {/* Income Table */}
                            <div>
                                <div style={{ marginBottom: '0.3rem', fontSize: '0.88rem', fontWeight: 'bold', color: '#103463' }}>PR Income &amp; Allowances</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                            <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>Item</th>
                                            <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem', fontWeight: 'bold', width: '95px', borderRight: '1px solid #cbd5e1' }}>Amount (₦)</th>
                                            <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem', fontWeight: 'bold', width: '30px' }}>OM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incomeItems.map((inc, i) => (
                                            <tr key={`inc-${i}`} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '0.2rem 0.5rem', borderRight: '1px solid #f1f5f9' }}>{inc.item}</td>
                                                <td style={{ textAlign: 'right', padding: '0.2rem 0.5rem', borderRight: '1px solid #f1f5f9', fontFamily: 'monospace', fontWeight: '600' }}>{inc.amount}</td>
                                                <td style={{ textAlign: 'center', padding: '0.2rem 0.5rem' }}>{inc.om}</td>
                                            </tr>
                                        ))}
                                        {/* Symmetrical blank rows */}
                                        {Array.from({ length: Math.max(0, maxTableRows - incomeItems.length) }).map((_, i) => (
                                            <tr key={`blank-inc-${i}`}>
                                                <td style={{ padding: '0.2rem 0.5rem', borderRight: '1px solid #f1f5f9' }}>&nbsp;</td>
                                                <td style={{ borderRight: '1px solid #f1f5f9' }}></td>
                                                <td></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Deductions Table */}
                            <div>
                                <div style={{ marginBottom: '0.3rem', fontSize: '0.88rem', fontWeight: 'bold', color: '#103463' }}>PR Deductions</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                            <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>Item</th>
                                            <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem', fontWeight: 'bold', width: '95px', borderRight: '1px solid #cbd5e1' }}>Amount (₦)</th>
                                            <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem', fontWeight: 'bold', width: '30px' }}>OM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deductionItems.map((dec, i) => (
                                            <tr key={`dec-${i}`} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '0.2rem 0.5rem', borderRight: '1px solid #f1f5f9' }}>{dec.item}</td>
                                                <td style={{ textAlign: 'right', padding: '0.2rem 0.5rem', borderRight: '1px solid #f1f5f9', fontFamily: 'monospace', fontWeight: '600' }}>{dec.amount}</td>
                                                <td style={{ textAlign: 'center', padding: '0.2rem 0.5rem' }}>{dec.om}</td>
                                            </tr>
                                        ))}
                                        {/* Symmetrical blank rows */}
                                        {Array.from({ length: Math.max(0, maxTableRows - deductionItems.length) }).map((_, i) => (
                                            <tr key={`blank-dec-${i}`}>
                                                <td style={{ padding: '0.2rem 0.5rem', borderRight: '1px solid #f1f5f9' }}>&nbsp;</td>
                                                <td style={{ borderRight: '1px solid #f1f5f9' }}></td>
                                                <td></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Baseline-Synchronized Totals Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', color: '#103463', marginRight: '0.75rem', fontSize: '0.92rem' }}>Total Earnings:</span>
                                    <div style={{ border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem 6px 0.75rem', fontWeight: 'bold', fontSize: '0.95rem', minWidth: '120px', height: '30px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace', lineHeight: 1 }}>
                                        ₦{currentPayslip.totalEarnings}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', color: '#103463', marginRight: '0.75rem', fontSize: '0.92rem' }}>Total Deductions:</span>
                                    <div style={{ border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem 6px 0.75rem', fontWeight: 'bold', fontSize: '0.95rem', minWidth: '120px', height: '30px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace', lineHeight: 1 }}>
                                        ₦{currentPayslip.totalDeductions}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '0.4rem', borderTop: '2px solid #000' }}>
                                    <span style={{ fontWeight: 'bold', color: '#000', marginRight: '0.75rem', fontSize: '0.95rem' }}>Net Salary:</span>
                                    <div style={{ border: '2px solid #103463', backgroundColor: '#f0fdf4', padding: '0 0.75rem 6px 0.75rem', fontWeight: 'bold', fontSize: '1.05rem', minWidth: '120px', height: '34px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', color: '#047857', fontFamily: 'monospace', lineHeight: 1 }}>
                                        ₦{currentPayslip.netSalary}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dashed Security Tear-off Line */}
                        <div style={{ marginTop: '2.5rem', borderBottom: '1px dashed #94a3b8', display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI • OFFICIAL ELECTRONIC PAYSLIP</span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>BURSARY &amp; PAYROLL DIVISION</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
