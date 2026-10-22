import React, { useState, useEffect } from "react";
import { User, Mail, Building, MapPin, Phone, FileText, Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

import { api } from "../../lib/api";

function CVUpdateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbRanks, setDbRanks] = useState([]);
  const [countriesData, setCountriesData] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);

  useEffect(() => {
    // Fetch from university-portfolio backend
    api('/api/staff/ranks').then(res => {
        if(res.data) setDbRanks(res.data);
    }).catch(err => console.error("Could not load ranks", err));
    
    fetch("https://countriesnow.space/api/v0.1/countries/states")
      .then(res => res.json())
      .then(data => {
         if (!data.error) setCountriesData(data.data);
      })
      .catch(err => console.error("Could not fetch countries", err));
  }, []);

  const [formData, setFormData] = useState({
    partA: { 
      passport: "",
      name: "Dr. John Doe", 
      date_of_birth: "1980-05-15",
      place_of_birth: "Lagos, Nigeria",
      nationality: "Nigeria",
      state_of_origin: "Lagos State",
      permanent_address: "123 Main Street, Victoria Island, Lagos",
      correspondence_address: "P.O. Box 456, Makurdi, Benue State",
      marital_status: "Married",
      date_of_first_appointment: "2010-08-01",
      date_of_transfer: "2015-01-10",
      rank_on_first_appointment: "Assistant Lecturer",
      date_assumed_duty: "2010-08-15",
      date_confirmed: "2012-08-01",
      date_last_promoted: "2022-10-01",
      present_rank: "Senior Lecturer",
      present_level: "13",
      present_step: "1",
      institutions: [
        { text: "University of Lagos", start: "2000", end: "2004" },
        { text: "University of Ibadan", start: "2006", end: "2008" }
      ],
      qualifications: [
        { text: "Computer Science", start: "", end: "2004", subtype: "B.Sc." },
        { text: "Computer Science", start: "", end: "2008", subtype: "M.Sc." }
      ], 
      training: [
        { text: "Advanced Data Science Workshop, Abuja", start: "2021", end: "" }
      ],
      professional_bodies: [
        { text: "Nigeria Computer Society (NCS)", start: "", end: "" },
        { text: "Computer Professionals of Nigeria (CPN)", start: "", end: "" }
      ],
      duties: [
        { text: "Teaching undergraduate courses, supervising final year projects, and conducting research.", start: "", end: "" }
      ],
      acting_appointments: [
        { text: "Head of Department", start: "2020", end: "2022" }
      ],
      computer_literacy: [
        { text: "Proficient in Python, React, Microsoft Office Suite, and SPSS.", start: "", end: "" }
      ],
      referees: [
        { text: "", start: "", end: "", title: "Prof.", name: "A. B. Smith", occupation: "Lecturer", email: "absmith@unilag.edu.ng", phone: "08012345678" },
        { text: "", start: "", end: "", title: "Dr.", name: "C. D. Jones", occupation: "Researcher", email: "cdjones@ui.edu.ng", phone: "08123456789" }
      ],
      declaration: false
    }
  });

  useEffect(() => {
     if (formData.partA.nationality) {
        const country = countriesData.find(c => c.name === formData.partA.nationality);
        setAvailableStates(country?.states || []);
     } else {
        setAvailableStates([]);
     }
  }, [formData.partA.nationality, countriesData]);

  const handleArrayChange = (field, index, key, value) => {
    const newArray = [...formData.partA[field]];
    newArray[index] = { ...newArray[index], [key]: value };
    setFormData({ ...formData, partA: { ...formData.partA, [field]: newArray } });
  };

  const handleAddField = (field) => {
    setFormData({ ...formData, partA: { ...formData.partA, [field]: [...formData.partA[field], { text: "", start: "", end: "", subtype: "", title: "", name: "", occupation: "", email: "", phone: "" }] } });
  };

  const handleRemoveField = (field, index) => {
    const newArray = [...formData.partA[field]];
    newArray.splice(index, 1);
    setFormData({ ...formData, partA: { ...formData.partA, [field]: newArray } });
  };

  const isPartAValid = () => {
    const arrayFields = [
      'institutions', 'qualifications', 'training', 'professional_bodies', 
      'duties', 'acting_appointments', 'computer_literacy', 'referees'
    ];
    
    for (const field of arrayFields) {
      const items = formData.partA[field];
      if (field === 'referees') {
        if (items.some(item => !item.title?.trim() || !item.name?.trim() || !item.occupation?.trim() || !item.email?.trim() || !item.phone?.trim())) {
          return false;
        }
      } else {
        if (items.some(item => !item.text?.trim() || (field === 'qualifications' && !item.subtype?.trim()))) {
          return false;
        }
      }
    }
    
    if (formData.partA.duties.length === 0) return false;
    if (!formData.partA.declaration) return false;

    return true;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) => currentYear - i);

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      // Fake delay for demo
      await new Promise(res => setTimeout(res, 1000));
      alert("CV Updated successfully!");
    } catch (error) {
      alert("Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Update Curriculum Vitae</h2>
        <p className="text-slate-500 mt-1">Keep your profile and employment records up to date.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 min-h-[400px]">
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-semibold border-b border-slate-200 pb-3 text-slate-900">Part A: Curriculum Vitae (Non-Teaching Staff)</h3>
            
            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-sm mb-3 text-blue-600 uppercase">1. PERSONAL DATA</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-3 mb-2 flex flex-col items-start">
                  <label className="text-xs font-medium text-slate-700">Passport Photograph</label>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="w-20 h-20 bg-slate-100 border-2 border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden">
                      {formData.partA.passport ? (
                         <img src={formData.partA.passport} alt="Passport" className="w-full h-full object-cover" />
                      ) : (
                         <User className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <label className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium rounded cursor-pointer transition-colors">
                      Upload Passport
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({...formData, partA: {...formData.partA, passport: reader.result}});
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Name</label><input type="text" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.name} onChange={e => setFormData({...formData, partA: {...formData.partA, name: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Date of Birth</label><input type="date" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.date_of_birth} onChange={e => setFormData({...formData, partA: {...formData.partA, date_of_birth: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Place of Birth</label><input type="text" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.place_of_birth} onChange={e => setFormData({...formData, partA: {...formData.partA, place_of_birth: e.target.value}})} /></div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Nationality</label>
                  <select className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.nationality} onChange={e => setFormData({...formData, partA: {...formData.partA, nationality: e.target.value, state_of_origin: ''}})}>
                    <option value="">Select Country</option>
                    {countriesData.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">State of Origin</label>
                  <select className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.state_of_origin} onChange={e => setFormData({...formData, partA: {...formData.partA, state_of_origin: e.target.value}})} disabled={availableStates.length === 0}>
                    <option value="">Select State</option>
                    {availableStates.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Permanent Home Address</label><input type="text" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.permanent_address} onChange={e => setFormData({...formData, partA: {...formData.partA, permanent_address: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Correspondence Address</label><input type="text" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.correspondence_address} onChange={e => setFormData({...formData, partA: {...formData.partA, correspondence_address: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Marital Status</label>
                  <select className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.marital_status} onChange={e => setFormData({...formData, partA: {...formData.partA, marital_status: e.target.value}})}>
                    <option>Married</option><option>Single</option><option>Widowed</option><option>Divorced</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Date of First Appointment</label><input type="date" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.date_of_first_appointment} onChange={e => setFormData({...formData, partA: {...formData.partA, date_of_first_appointment: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Date of Transfer of Service to JOSTUM</label><input type="date" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.date_of_transfer} onChange={e => setFormData({...formData, partA: {...formData.partA, date_of_transfer: e.target.value}})} /></div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Rank on First Appointment</label>
                  <select className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.rank_on_first_appointment} onChange={e => setFormData({...formData, partA: {...formData.partA, rank_on_first_appointment: e.target.value}})}>
                    <option value="">Select Rank</option>
                    {dbRanks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    {dbRanks.length === 0 && <option value="Assistant Lecturer">Assistant Lecturer</option>}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Date of Assumption of Duty in JOSTUM</label><input type="date" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.date_assumed_duty} onChange={e => setFormData({...formData, partA: {...formData.partA, date_assumed_duty: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Date Appointment Confirmed</label><input type="date" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.date_confirmed} onChange={e => setFormData({...formData, partA: {...formData.partA, date_confirmed: e.target.value}})} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-700">Date Last Promoted/Regraded/Converted</label><input type="date" className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900" value={formData.partA.date_last_promoted} onChange={e => setFormData({...formData, partA: {...formData.partA, date_last_promoted: e.target.value}})} /></div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Present Rank and Salary (Level & Step)</label>
                  <div className="flex gap-2">
                    <select className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.partA.present_rank} onChange={e => setFormData({...formData, partA: {...formData.partA, present_rank: e.target.value}})}>
                      <option value="">Select Rank</option>
                      {dbRanks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      {dbRanks.length === 0 && <option value="Senior Lecturer">Senior Lecturer</option>}
                    </select>
                    <select className="w-1/4 px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.partA.present_level} onChange={e => setFormData({...formData, partA: {...formData.partA, present_level: e.target.value}})}>
                      <option value="">CONTISS Level</option>
                      {Array.from({length: 18}, (_, i) => i + 1).map(l => <option key={l} value={l}>CONTISS {l}</option>)}
                    </select>
                    <select className="w-1/4 px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.partA.present_step} onChange={e => setFormData({...formData, partA: {...formData.partA, present_step: e.target.value}})}>
                      <option value="">Step</option>
                      {Array.from({length: 15}, (_, i) => i + 1).map(s => <option key={s} value={s}>Step {s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'institutions', title: '2. EDUCATIONAL INSTITUTIONS ATTENDED WITH DATES', btn: 'Institution', hasDates: true },
                { id: 'qualifications', title: '3. QUALIFICATIONS OBTAINED WITH DATES', btn: 'Qualification', hasDates: true, dropdownOptions: ["FSLC", "WAEC", "NECO", "NABTEB", "NBAIS", "NCE", "OND", "ND", "HND", "B.Sc.", "B.A.", "B.Eng.", "B.Ed.", "LL.B.", "MBBS", "PGD", "MBA", "M.Sc.", "M.A.", "M.Eng.", "M.Ed.", "M.Phil.", "Ph.D."] },
                { id: 'training', title: '4. OTHER TRAINING COURSES ATTENDED WITH DATES', btn: 'Course', hasDates: true },
                { id: 'professional_bodies', title: '5. MEMBERSHIP OF PROFESSIONAL BODIES', btn: 'Membership', hasDates: false },
                { id: 'duties', title: '6. PRESENT RESPONSIBILITIES', btn: 'Responsibility', hasDates: false },
                { id: 'acting_appointments', title: '7. ADMIN/SUPERVISORY EXPERIENCE', btn: 'Experience', hasDates: true },
                { id: 'computer_literacy', title: '8. COMPUTER LITERACY', btn: 'Skill', hasDates: false },
                { id: 'referees', title: '9. REFEREES', btn: 'Referee', hasDates: false }
              ].map(section => (
                <div key={section.id} className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 min-w-0 overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-sm text-blue-600 truncate">{section.title}</h4>
                    <button onClick={() => handleAddField(section.id)} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 uppercase tracking-wider transition-colors flex-none ml-2">+ Add</button>
                  </div>
                  <div className="space-y-3 min-w-0">
                    {formData.partA[section.id].map((item, idx) => (
                      <div key={idx} className={`flex gap-2 items-start ${section.id === 'referees' ? 'flex-col bg-white p-3 rounded border border-slate-200 min-w-0' : 'bg-white p-3 rounded border border-slate-200/80 min-w-0'}`}>
                        {section.id !== 'referees' && <span className="text-xs font-bold mt-1.5 w-4 text-right text-slate-400 flex-none">{idx + 1}.</span>}
                        
                        {section.id === 'referees' ? (
                          <div className="w-full flex gap-2 items-start min-w-0">
                             <div className="flex-none text-xs font-bold mt-2 w-4 text-right text-slate-400">{idx + 1}.</div>
                             <div className="flex-1 flex flex-col gap-2.5 min-w-0 w-full">
                               <div className="flex items-center gap-2 w-full min-w-0" style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                                 <select 
                                   style={{ width: '90px', minWidth: '90px', flexShrink: 0 }} 
                                   className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none" 
                                   value={item.title || ""} 
                                   onChange={(e) => handleArrayChange('referees', idx, 'title', e.target.value)}
                                 >
                                   <option value="">Title</option>
                                   <option value="Mr.">Mr.</option>
                                   <option value="Mrs.">Mrs.</option>
                                   <option value="Miss">Miss</option>
                                   <option value="Ms.">Ms.</option>
                                   <option value="Dr.">Dr.</option>
                                   <option value="Prof.">Prof.</option>
                                   <option value="Rev.">Rev.</option>
                                 </select>
                                 <input 
                                   type="text" 
                                   style={{ flex: '1 1 0%', minWidth: 0, width: '100%' }} 
                                   className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none" 
                                   placeholder="Full Name" 
                                   value={item.name || ""} 
                                   onChange={(e) => handleArrayChange('referees', idx, 'name', e.target.value)} 
                                 />
                               </div>
                               <input 
                                 type="text" 
                                 className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none min-w-0" 
                                 placeholder="Occupation/Position" 
                                 value={item.occupation || ""} 
                                 onChange={(e) => handleArrayChange('referees', idx, 'occupation', e.target.value)} 
                               />
                               <div className="flex items-center gap-2 w-full min-w-0" style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                                 <input 
                                   type="email" 
                                   style={{ flex: '1 1 0%', minWidth: 0, width: '100%' }} 
                                   className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none" 
                                   placeholder="Email Address" 
                                   value={item.email || ""} 
                                   onChange={(e) => handleArrayChange('referees', idx, 'email', e.target.value)} 
                                 />
                                 <input 
                                   type="tel" 
                                   style={{ flex: '1 1 0%', minWidth: 0, width: '100%' }} 
                                   className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none" 
                                   placeholder="Phone Number" 
                                   value={item.phone || ""} 
                                   onChange={(e) => handleArrayChange('referees', idx, 'phone', e.target.value)} 
                                 />
                               </div>
                             </div>
                             <button onClick={() => handleRemoveField('referees', idx)} className="text-slate-400 hover:text-red-500 font-bold text-base px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors leading-none flex-none h-8 mt-0.5" title="Remove referee">×</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 flex flex-col gap-2 min-w-0 w-full">
                              {(section.dropdownOptions || section.hasDates) && (
                               <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0">
                                  {section.dropdownOptions && (
                                    <select className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded bg-white outline-none w-full sm:flex-1 sm:min-w-0" value={item.subtype || ""} onChange={(e) => handleArrayChange(section.id, idx, 'subtype', e.target.value)}>
                                      <option value="">Select Qualification...</option>
                                      {section.dropdownOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  )}
                                  {section.hasDates && (
                                    <div className={`flex items-center gap-1.5 w-full ${section.dropdownOptions ? 'sm:w-auto sm:flex-none sm:ml-auto' : ''}`}>
                                      <select className={`px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none ${section.dropdownOptions ? 'flex-1 sm:w-[82px]' : 'flex-1 min-w-0'}`} value={item.start} onChange={(e) => handleArrayChange(section.id, idx, 'start', e.target.value)}>
                                        <option value="">Start Year</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                      </select>
                                      <span className="text-xs text-slate-400 font-bold flex-none">-</span>
                                      <select className={`px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none ${section.dropdownOptions ? 'flex-1 sm:w-[82px]' : 'flex-1 min-w-0'}`} value={item.end} onChange={(e) => handleArrayChange(section.id, idx, 'end', e.target.value)}>
                                        <option value="">End Year</option>
                                        <option value="Present">Present</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              )}
                              <input type="text" className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none" placeholder={section.dropdownOptions ? `Enter course/details...` : `Enter ${section.btn.toLowerCase()} details...`} value={item.text} onChange={(e) => handleArrayChange(section.id, idx, 'text', e.target.value)} />
                            </div>
                            <button onClick={() => handleRemoveField(section.id, idx)} className="text-slate-400 hover:text-red-500 font-bold text-base px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors leading-none flex-none ml-1" title="Remove field">×</button>
                          </>
                        )}
                      </div>
                    ))}
                    {formData.partA[section.id].length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No entries added.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
              <h4 className="font-bold text-base mb-4 text-blue-600 border-b border-slate-200 pb-2">Certification by Staff</h4>
              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', width: '100%', cursor: 'pointer', textTransform: 'none', margin: 0, padding: 0 }}>
                <input 
                  type="checkbox" 
                  style={{ width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer', margin: 0 }} 
                  checked={formData.partA.declaration} 
                  onChange={e => setFormData({...formData, partA: {...formData.partA, declaration: e.target.checked}})} 
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textTransform: 'none', lineHeight: '1.4' }}>
                  I declare that the above information is true and correct.
                </span>
              </label>
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleAction}
                  disabled={isSubmitting || !isPartAValid()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save CV Updates"}
                </button>
            </div>
          </div>
      </div>
    </div>
  );
}

export function StaffAppraisalProfile() {
  const [activeTab, setActiveTab] = useState("update-cv"); // update-cv, cv
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Staff Curriculum Vitae</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Manage your Curriculum Vitae</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-md w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setActiveTab("update-cv")} 
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'update-cv' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Update CV
          </button>
          <button 
            onClick={() => setActiveTab("cv")} 
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'cv' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Digital CV
          </button>
        </div>
      </div>

      {activeTab === "update-cv" && (
        <div className="animate-in fade-in">
          <CVUpdateForm />
        </div>
      )}

      {activeTab === "cv" && (
        <div className="animate-in fade-in">
          <CVGenerator />
        </div>
      )}
    </div>
  );
}

function CVGenerator() {
  const cvRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const mockStaffData = {
    personalData: {
      name: "Dr. John Doe",
      dob: "15th August 1980",
      placeOfBirth: "Lagos, Nigeria",
      nationality: "Nigerian",
      permanentAddress: "123 Main Street, Victoria Island, Lagos",
      correspondenceAddress: "P.O. Box 456, Makurdi, Benue State",
      maritalStatus: "Married",
      dateOfFirstAppointment: "1st August 2010",
      dateOfTransfer: "10th January 2015",
      rankOnFirstAppointment: "Assistant Lecturer",
      dateAssumedDuty: "15th August 2010",
      dateConfirmed: "1st August 2012",
      dateLastPromoted: "1st October 2022",
      presentRankAndSalary: "Senior Lecturer - CONTISS 13"
    },
    institutions: [
      "University of Lagos (2000 - 2004)",
      "University of Ibadan (2006 - 2008)"
    ],
    qualifications: [
      "B.Sc. Computer Science (2004)",
      "M.Sc. Computer Science (2008)"
    ],
    trainingCourses: [
      "Advanced Data Science Workshop, Abuja (2021)",
      "Digital Leadership Seminar, Lagos (2023)"
    ],
    memberships: [
      "Nigeria Computer Society (NCS)",
      "Computer Professionals Registration Council of Nigeria (CPN)"
    ],
    presentResponsibilities: [
      "Teaching undergraduate and postgraduate courses in Computer Science.",
      "Supervising final year student projects.",
      "Conducting active academic research."
    ],
    adminExperience: [
      "Head of Department, Computer Science (2020 - 2022)",
      "Chairman, College Examination Committee (2018 - 2020)"
    ],
    computerLiteracy: [
      "Proficient in Python, React, Microsoft Office Suite, and SPSS."
    ],
    referees: [
      { title: "Prof.", name: "A. B. Smith", occupation: "Dean of Science, University of Lagos", email: "absmith@unilag.edu.ng", phone: "08012345678" },
      { title: "Dr.", name: "C. D. Jones", occupation: "HOD Computer Science, University of Ibadan", email: "cdjones@ui.edu.ng", phone: "08123456789" }
    ]
  };

  const renderItemWithDate = (text, index) => {
    // Matches the last occurrence of (YYYY) or (YYYY - YYYY) at the end of the string
    const match = text.match(/\((19|20)\d{2}(\s*-\s*(19|20)\d{2})?\)$/);
    if (match) {
       const datePart = match[0];
       const textPart = text.substring(0, match.index).trim();
       return (
          <li key={index} className="flex justify-between items-start">
             <span className="flex-1">{['i.','ii.','iii.','iv.','v.'][index]} {textPart}</span>
             <span className="font-medium whitespace-nowrap ml-4">{datePart.replace('(', '').replace(')', '')}</span>
          </li>
       );
    }
    return <li key={index}>{['i.','ii.','iii.','iv.','v.'][index]} {text}</li>;
  };

  const handleDownloadPDF = () => {
    try {
      setIsGeneratingPdf(true);
      const rawName = mockStaffData?.personalData?.name || "staff";
      const formattedName = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      const fileName = `${formattedName}_cv.pdf`;

      const JsPdfConstructor = typeof jsPDF === 'function' ? jsPDF : (jsPDF.jsPDF || jsPDF);
      const doc = new JsPdfConstructor({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPageBreak = (needed = 10) => {
        if (y + needed > 275) {
          doc.addPage();
          y = 20;
        }
      };

      // Header
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("CURRICULUM VITAE", pageWidth / 2, y, { align: "center" });
      y += 7;

      doc.setFontSize(13);
      doc.text((mockStaffData.personalData.name || "").toUpperCase(), pageWidth / 2, y, { align: "center" });
      y += 6;

      doc.setFontSize(10);
      doc.text((mockStaffData.personalData.presentRankAndSalary || "").toUpperCase(), pageWidth / 2, y, { align: "center" });
      y += 5;

      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      const addSectionHeader = (title) => {
        checkPageBreak(12);
        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.text(title.toUpperCase(), margin, y);
        y += 2;
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      // 1. Personal Data
      addSectionHeader("1. Personal Data");
      const personalFields = [
        ["Name:", mockStaffData.personalData.name],
        ["Date of Birth:", mockStaffData.personalData.dob],
        ["Place of Birth:", mockStaffData.personalData.placeOfBirth],
        ["Nationality:", mockStaffData.personalData.nationality],
        ["Permanent Home Address:", mockStaffData.personalData.permanentAddress],
        ["Correspondence Address:", mockStaffData.personalData.correspondenceAddress],
        ["Marital Status:", mockStaffData.personalData.maritalStatus],
        ["Date of First Appointment:", mockStaffData.personalData.dateOfFirstAppointment],
        ["Date of Transfer of Service to JOSTUM:", mockStaffData.personalData.dateOfTransfer],
        ["Rank on First Appointment:", mockStaffData.personalData.rankOnFirstAppointment],
        ["Date of Assumption of Duty in JOSTUM:", mockStaffData.personalData.dateAssumedDuty],
        ["Date Appointment Confirmed:", mockStaffData.personalData.dateConfirmed],
        ["Date Last Promoted/Regraded/Converted:", mockStaffData.personalData.dateLastPromoted],
        ["Present Rank and Salary:", mockStaffData.personalData.presentRankAndSalary]
      ];

      doc.setFontSize(9.5);
      personalFields.forEach(([label, val]) => {
        if (!val) return;
        checkPageBreak(7);
        doc.setFont("times", "bold");
        doc.text(label, margin, y);
        doc.setFont("times", "normal");
        const splitVal = doc.splitTextToSize(String(val), contentWidth - 85);
        doc.text(splitVal, margin + 85, y);
        y += Math.max(5.5, splitVal.length * 4.5);
      });
      y += 4;

      // 2. Educational Institutions
      addSectionHeader("2. Educational Institutions Attended With Dates");
      doc.setFontSize(9.5);
      mockStaffData.institutions.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 3. Qualifications
      addSectionHeader("3. Qualifications Obtained With Dates");
      doc.setFontSize(9.5);
      mockStaffData.qualifications.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 4. Training
      addSectionHeader("4. Other Training Courses Attended With Dates");
      doc.setFontSize(9.5);
      mockStaffData.trainingCourses.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 5. Memberships
      addSectionHeader("5. Membership of Professional Bodies");
      doc.setFontSize(9.5);
      mockStaffData.memberships.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 6. Responsibilities
      addSectionHeader("6. Present Responsibilities");
      doc.setFontSize(9.5);
      mockStaffData.presentResponsibilities.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 7. Admin Experience
      addSectionHeader("7. Admin/Supervisory Experience");
      doc.setFontSize(9.5);
      mockStaffData.adminExperience.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 8. Computer Literacy
      addSectionHeader("8. Computer Literacy");
      doc.setFontSize(9.5);
      mockStaffData.computerLiteracy.forEach((item, i) => {
        checkPageBreak(6);
        doc.setFont("times", "normal");
        doc.text(`${['i.','ii.','iii.','iv.','v.'][i] || (i+1)+'.'} ${item}`, margin + 2, y);
        y += 5.5;
      });
      y += 4;

      // 9. Referees
      addSectionHeader("9. Referees");
      doc.setFontSize(9.5);
      mockStaffData.referees.forEach((ref, i) => {
        checkPageBreak(20);
        doc.setFont("times", "bold");
        doc.text(`${i + 1}. ${ref.title || ""} ${ref.name || ""}`, margin + 2, y);
        y += 4.5;
        doc.setFont("times", "normal");
        if (ref.occupation) { doc.text(ref.occupation, margin + 6, y); y += 4.5; }
        if (ref.email) { doc.text(`Email: ${ref.email}`, margin + 6, y); y += 4.5; }
        if (ref.phone) { doc.text(`Phone: ${ref.phone}`, margin + 6, y); y += 4.5; }
        y += 2;
      });
      y += 10;

      // Signature
      checkPageBreak(25);
      doc.setLineWidth(0.3);
      doc.line(pageWidth - margin - 50, y, pageWidth - margin, y);
      y += 5;
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.text("SIGNATURE & DATE", pageWidth - margin - 25, y, { align: "center" });

      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF download.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="flex justify-end gap-3 mb-4 print:hidden">
        <button 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-md shadow hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="overflow-x-auto bg-slate-50/50 p-8 rounded-xl border border-slate-200 flex justify-center print:bg-transparent print:p-0 print:border-none print:block">
        <div 
          ref={cvRef} 
          data-cv-container="true"
          className="bg-white text-black p-12 w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full print:p-0 print:m-0"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <div className="text-center border-b-2 border-black pb-4 mb-8">
            <h1 className="text-2xl font-bold uppercase mb-2">CURRICULUM VITAE</h1>
            <p className="text-lg font-bold uppercase">{mockStaffData.personalData.name}</p>
            <p className="text-sm font-medium mt-1 uppercase">{mockStaffData.personalData.presentRankAndSalary}</p>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">1. Personal Data</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="w-1/2 font-semibold py-1">Name:</td><td>{mockStaffData.personalData.name}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Date of Birth:</td><td>{mockStaffData.personalData.dob}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Place of Birth:</td><td>{mockStaffData.personalData.placeOfBirth}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Nationality:</td><td>{mockStaffData.personalData.nationality}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1 flex items-start">Permanent Home Address:</td><td className="py-1">{mockStaffData.personalData.permanentAddress}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1 flex items-start">Correspondence Address:</td><td className="py-1">{mockStaffData.personalData.correspondenceAddress}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Marital Status:</td><td>{mockStaffData.personalData.maritalStatus}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Date of First Appointment:</td><td>{mockStaffData.personalData.dateOfFirstAppointment}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Date of Transfer of Service to JOSTUM:</td><td>{mockStaffData.personalData.dateOfTransfer}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Rank on First Appointment:</td><td>{mockStaffData.personalData.rankOnFirstAppointment}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Date of Assumption of Duty in JOSTUM:</td><td>{mockStaffData.personalData.dateAssumedDuty}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Date Appointment Confirmed:</td><td>{mockStaffData.personalData.dateConfirmed}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Date Last Promoted/Regraded/Converted:</td><td>{mockStaffData.personalData.dateLastPromoted}</td></tr>
                  <tr><td className="w-1/2 font-semibold py-1">Present Rank and Salary:</td><td>{mockStaffData.personalData.presentRankAndSalary}</td></tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">2. Educational Institutions Attended With Dates</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.institutions.map((item, i) => renderItemWithDate(item, i))}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">3. Qualifications Obtained With Dates</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.qualifications.map((item, i) => renderItemWithDate(item, i))}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">4. Other Training Courses Attended With Dates</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.trainingCourses.map((item, i) => renderItemWithDate(item, i))}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">5. Membership of Professional Bodies</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.memberships.map((item, i) => renderItemWithDate(item, i))}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">6. Present Responsibilities</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.presentResponsibilities.map((item, i) => renderItemWithDate(item, i))}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">7. Admin/Supervisory Experience</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.adminExperience.map((item, i) => renderItemWithDate(item, i))}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">8. Computer Literacy</h2>
              <ul className="list-none text-sm space-y-1 pl-2">
                {mockStaffData.computerLiteracy.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </section>

            <section>
              <h2 className="text-md font-bold uppercase border-b border-gray-300 mb-3 pb-1">9. Referees</h2>
              <ul className="list-none text-sm space-y-4 pl-2">
                {mockStaffData.referees.map((item, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <div className="font-semibold">{i + 1}. {item.title} {item.name}</div>
                    <div>{item.occupation}</div>
                    <div className="italic text-gray-700">Email: {item.email}</div>
                    <div className="italic text-gray-700">Phone: {item.phone}</div>
                  </li>
                ))}
              </ul>
            </section>
            
            <div className="pt-12 flex justify-between">
              <div></div>
              <div className="text-center">
                <div className="w-48 border-b border-black mb-2"></div>
                <p className="text-sm font-semibold uppercase">Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
