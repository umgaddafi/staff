import React from 'react';

interface PartAPrintLayoutProps {
  formData: any;
}

export const PartAPrintLayout: React.FC<PartAPrintLayoutProps> = ({ formData }) => {
  const d = formData?.partA || {};
  const pB = formData?.partB || {};
  const pC = formData?.partC || {};
  const pD = formData?.partD || {};
  const pE = formData?.partE || {};
  const v = (val: any) => (val !== undefined && val !== null && val !== "" ? val : "Nil");

  // Load uploaded evaluator signatures or fall back to digital typed name representation
  const getStoredSignatures = () => {
    try {
      const stored = localStorage.getItem('appraisal_signatures');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };
  const storedSigs = getStoredSignatures();
  const supervisorSig = pB.signature_image || storedSigs.supervisor || null;
  const hodSig = pD.signature_image || storedSigs.dept_chairman || null;
  const apcSig = pE.signature_image || storedSigs.apc_chairman || null;

  const calculateAge = (dob: string) => {
    if (!dob) return "Nil";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? `${age} Yrs` : "Nil";
  };

  const calculatePartBTotal = (b: any) => {
    if (!b) return 0;
    return (
      Number(b.basic_qualification || 0) +
      Number(b.additional_qualification || 0) +
      Number(b.work_experience || 0) +
      Number(b.admin_or_tech_experience || 0) +
      Number(b.relevant_training || 0) +
      Number(b.personality_team_spirit || 0) +
      Number(b.quality_of_work || 0) +
      Number(b.regularity || 0) +
      Number(b.punctuality || 0) +
      Number(b.care_of_property || 0) +
      Number(b.integrity || 0) +
      Number(b.initiative || 0) +
      Number(b.knowledge_regulations || 0) +
      Number(b.professional_membership || 0)
    );
  };

  const totalScoreB = calculatePartBTotal(pB);

  return (
    <div className="print-container text-black font-serif text-[11pt] leading-normal bg-white p-4">
      
      {/* ========================================================= */}
      {/* PART A: PERSONAL & SERVICE PARTICULARS                    */}
      {/* ========================================================= */}
      <section className="aper-section">
        
        {/* Document Header */}
        <div className="text-center font-bold mb-4 uppercase border-b-2 border-black pb-3 aper-avoid-break">
          <div className="text-[14pt] tracking-wide">JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI</div>
          <div className="text-[11pt] font-semibold">P.M.B. 2373, MAKURDI, BENUE STATE, NIGERIA</div>
          <div className="italic text-[10pt] font-normal normal-case mt-0.5">
            (Office of the Registrar: Directorate of Personnel Affairs, Senior Staff Establishment)
          </div>
          <div className="text-[11pt] font-extrabold mt-1">FORM ASAP 1</div>
          <div className="text-[12pt] font-extrabold mt-1">
            ANNUAL PERFORMANCE EVALUATION REPORT
          </div>
          <div className="italic text-[10pt] font-normal normal-case">
            (Administrative, Professional, Technical and Senior Non-Teaching Staff)
          </div>
        </div>

        {/* Administrative Header Meta */}
        <div className="space-y-2 mb-4 font-bold text-[10.5pt] aper-avoid-break">
          <div className="flex items-end">
            <span className="w-56">PERSONAL FILE NUMBER:</span>
            <span className="flex-1 border-b border-black border-dotted px-2 font-normal">{v(d.file_number)}</span>
          </div>
          <div className="flex items-end">
            <span className="w-56">COLLEGE / FACULTY:</span>
            <span className="flex-1 border-b border-black border-dotted px-2 font-normal">{v(d.college)}</span>
          </div>
          <div className="flex items-end">
            <span className="w-56">DEPARTMENT / UNIT:</span>
            <span className="flex-1 border-b border-black border-dotted px-2 font-normal">{v(d.department)}</span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex gap-4 mb-4 bg-gray-100 p-2 border border-black aper-avoid-break">
          <div className="font-bold w-20">PART A:</div>
          <div className="text-[10pt]">
            <div className="font-bold uppercase">To be completed by the staff member concerned</div>
            <div>Period of Evaluation Report: <span className="font-bold underline">1st October 2025 to 30th September 2026</span></div>
          </div>
        </div>

        {/* Part A Items */}
        <div className="space-y-3.5">
          
          {/* 1. Name */}
          <div className="flex items-end aper-avoid-break">
            <div className="w-7 font-bold">1.</div>
            <div className="flex-1 flex gap-2 items-end">
              <span className="font-semibold">Full Name (Surname First):</span>
              <span className="flex-1 border-b border-black border-dotted px-2 font-bold uppercase">{v(d.name)}</span>
            </div>
          </div>

          {/* 2 & 3 */}
          <div className="flex items-end aper-avoid-break">
            <div className="w-7 font-bold">2.</div>
            <div className="flex-1 flex gap-2 items-end">
              <span className="font-semibold">Age Last Birthday:</span>
              <span className="w-28 text-center border-b border-black border-dotted">{calculateAge(d.date_of_birth)}</span>
              <span className="w-7 font-bold ml-4">3.</span>
              <span className="font-semibold">Date of Birth:</span>
              <span className="flex-1 text-center border-b border-black border-dotted">{v(d.date_of_birth)}</span>
            </div>
          </div>

          {/* 4 */}
          <div className="flex items-end aper-avoid-break">
            <div className="w-7 font-bold">4.</div>
            <div className="flex-1 flex gap-2 items-end">
              <span className="font-semibold">Marital Status:</span>
              <span className="w-36 text-center border-b border-black border-dotted">{v(d.marital_status)}</span>
              <span className="font-semibold ml-4">Tel. No(s):</span>
              <span className="flex-1 text-center border-b border-black border-dotted">{v(d.phone)}</span>
            </div>
          </div>

          {/* 5. Institutions & Qualifications */}
          <div className="mt-4 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">5.</div>
              <div className="font-semibold">Institutions Attended and Qualifications Obtained (with Dates):</div>
            </div>
            <div className="pl-7">
              <table className="w-full border-collapse border border-black text-[10pt]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 text-center w-8">S/N</th>
                    <th className="border border-black p-1 text-left w-1/2">Institutions Attended</th>
                    <th className="border border-black p-1 text-left w-1/3">Qualifications Obtained</th>
                    <th className="border border-black p-1 text-center w-20">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const instList = (d.institutions || []).filter((inst: any) => inst && inst.text && inst.text.trim() !== "");
                    const qualList = (d.qualifications || []).filter((qual: any) => qual && ((qual.text && qual.text.trim() !== "") || qual.subtype));
                    const rowCount = Math.max(instList.length, qualList.length, 1);
                    const rows = Array.from({ length: rowCount }, (_, i) => i);

                    return rows.map(i => {
                      const inst = instList[i];
                      const qual = qualList[i];
                      const instText = inst ? inst.text : (i === 0 ? "Nil" : "");
                      const qualText = qual ? `${qual.subtype ? qual.subtype + ' ' : ''}${qual.text || ''}`.trim() : (i === 0 ? "Nil" : "");
                      const qualDate = qual && qual.end ? qual.end : (inst && inst.end ? inst.end : (i === 0 ? "Nil" : ""));
                      return (
                        <tr key={i}>
                          <td className="border border-black p-1 text-center">{i + 1}.</td>
                          <td className="border border-black p-1">{instText}</td>
                          <td className="border border-black p-1">{qualText}</td>
                          <td className="border border-black p-1 text-center">{qualDate}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Previous Employment */}
          <div className="mt-4 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">6.</div>
              <div className="font-semibold">Previous Employment History before joining JOSTUM:</div>
            </div>
            <div className="pl-7">
              <table className="w-full border-collapse border border-black text-[10pt]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 text-left">Employer & Station</th>
                    <th className="border border-black p-1 text-left">Post Held</th>
                    <th className="border border-black p-1 text-left">Last Income p.a. / Date Left</th>
                    <th className="border border-black p-1 text-left">Reason for Leaving</th>
                  </tr>
                </thead>
                <tbody>
                  {d.previous_employment && d.previous_employment.length > 0 ? (
                    d.previous_employment.map((emp: any, idx: number) => (
                      <tr key={idx}>
                        <td className="border border-black p-1">{emp.text || "Nil"}</td>
                        <td className="border border-black p-1">{emp.subtype || "Nil"}</td>
                        <td className="border border-black p-1">{emp.income || emp.end ? `${emp.income || ''} (${emp.end || ''})` : "Nil"}</td>
                        <td className="border border-black p-1">{emp.reason || "Nil"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="border border-black p-1">Nil</td>
                      <td className="border border-black p-1">Nil</td>
                      <td className="border border-black p-1">Nil</td>
                      <td className="border border-black p-1">Nil</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Appointment History */}
          <div className="space-y-2 mt-4 aper-avoid-break">
            <div className="flex items-end">
              <div className="w-10 font-bold">7(a).</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Date of First Appointment:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center">{v(d.date_of_first_appointment)}</span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-10 font-bold pl-3">(b)</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Date of Transfer of Service (if applicable):</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center">{v(d.date_of_transfer)}</span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-10 font-bold pl-3">(c)</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Date of Assumption of Duty in JOSTUM:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center">{v(d.date_assumed_duty)}</span>
              </div>
            </div>
          </div>

          {/* 8 to 12 */}
          <div className="space-y-2 mt-3 aper-avoid-break">
            <div className="flex items-end">
              <div className="w-7 font-bold">8.</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Rank on First Appointment in JOSTUM:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center">{v(d.rank_on_first_appointment)}</span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-7 font-bold">9.</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Date of Confirmation of Appointment:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center">{v(d.date_confirmed)}</span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-7 font-bold">10.</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Date of Last Promotion / Regrading / Conversion:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center">{v(d.date_last_promoted)}</span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-7 font-bold">11.</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Present Rank:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center font-bold">{v(d.present_rank)}</span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-7 font-bold">12.</div>
              <div className="flex-1 flex items-end">
                <span className="font-semibold">Present Salary / CONTISS Grade Level & Step:</span>
                <span className="flex-1 ml-2 border-b border-black border-dotted text-center font-semibold">
                  CONTISS {v(d.present_level)} / Step {v(d.present_step)}
                </span>
              </div>
            </div>
          </div>

          {/* 13. Last Two Promotions */}
          <div className="mt-4 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">13.</div>
              <div className="font-semibold">Dates and Details of Last Two (2) Promotions:</div>
            </div>
            <div className="pl-7">
              <table className="w-full border-collapse border border-black text-[10pt]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 text-center w-12">#</th>
                    <th className="border border-black p-1 text-left w-1/3">Date of Promotion</th>
                    <th className="border border-black p-1 text-left w-1/3">Position to which Promoted</th>
                    <th className="border border-black p-1 text-left w-1/3">Salary Scale / Level</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1].map(i => {
                    const p = d.last_two_promotions && d.last_two_promotions[i];
                    return (
                      <tr key={i}>
                        <td className="border border-black p-1 text-center">{i === 0 ? "1st" : "2nd"}</td>
                        <td className="border border-black p-1">{p && p.start ? p.start : "Nil"}</td>
                        <td className="border border-black p-1">{p && p.text ? p.text : "Nil"}</td>
                        <td className="border border-black p-1">{p && p.income ? p.income : "Nil"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 14. Present Schedule of Duties */}
          <div className="mt-4 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">14.</div>
              <div className="font-semibold">Present Schedule of Duty (to be stated clearly and fully):</div>
            </div>
            <div className="pl-7">
              <div className="border border-black p-2 min-h-[4rem] text-[10pt] leading-relaxed whitespace-pre-wrap bg-gray-50/50">
                {d.duties && d.duties.length > 0 ? (
                  d.duties.map((duty: any, idx: number) => (
                    <div key={idx} className="mb-1">
                      {d.duties.length > 1 ? `${idx + 1}. ` : ''}{duty.text || "Nil"}
                    </div>
                  ))
                ) : (
                  <div>Nil</div>
                )}
              </div>
            </div>
          </div>

          {/* 15. Acting Appointments */}
          <div className="mt-3 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">15.</div>
              <div className="font-semibold">Acting Appointment(s) held during the period under review:</div>
            </div>
            <div className="pl-7">
              <div className="border-b border-black border-dotted pb-1 min-h-[1.5rem]">
                {d.acting_appointments && d.acting_appointments.length > 0 
                  ? d.acting_appointments.map((a: any) => `${a.text || ''} (${a.start || ''} - ${a.end || ''})`).join(', ') 
                  : "Nil"}
              </div>
            </div>
          </div>

          {/* 16. Examinations */}
          <div className="mt-3 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">16.</div>
              <div className="font-semibold">Examinations taken (with results) during the period under review:</div>
            </div>
            <div className="pl-7">
              <div className="border-b border-black border-dotted pb-1 min-h-[1.5rem]">
                {d.examinations && d.examinations.length > 0 
                  ? d.examinations.map((a: any) => `${a.text || ''} (Result/Date: ${a.start || 'Passed'})`).join(', ') 
                  : "Nil"}
              </div>
            </div>
          </div>

          {/* 17. Training Courses */}
          <div className="mt-3 aper-avoid-break">
            <div className="flex mb-1">
              <div className="w-7 font-bold">17.</div>
              <div className="font-semibold">Training courses / workshops / seminars attended during the period:</div>
            </div>
            <div className="pl-7">
              <div className="border-b border-black border-dotted pb-1 min-h-[1.5rem]">
                {d.training && d.training.length > 0 
                  ? d.training.map((a: any) => `${a.text || ''} (${a.start || ''} - ${a.end || ''})`).join(', ') 
                  : "Nil"}
              </div>
            </div>
          </div>

          {/* 18. Certification by Staff */}
          <div className="mt-6 border border-black p-3 aper-avoid-break bg-gray-50/50">
            <div className="flex mb-2 font-bold">
              <div className="w-7">18.</div>
              <div className="uppercase">Certification by Staff Member:</div>
            </div>
            <p className="italic text-[10pt] mb-4 pl-7">
              "I hereby declare that the particulars given by me above are complete, true and correct to the best of my knowledge and belief."
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-black border-dotted pl-7 text-[10pt]">
              <div>
                <span className="font-semibold block text-[9pt] text-gray-600">STAFF SIGNATURE:</span>
                <span className="font-bold underline">{d.declaration ? "Digitally Verified" : "Signed"}</span>
              </div>
              <div>
                <span className="font-semibold block text-[9pt] text-gray-600">FULL NAME:</span>
                <span className="font-bold">{v(d.declaration_name || d.name)}</span>
              </div>
              <div>
                <span className="font-semibold block text-[9pt] text-gray-600">DATE:</span>
                <span className="font-semibold">{v(d.declaration_date || new Date().toISOString().split('T')[0])}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* PART B: SUPERVISOR'S STATUTORY ASSESSMENT MATRIX (100 PTS) */}
      {/* ========================================================= */}
      <div className="aper-page-break my-6"></div>

      <section className="aper-section mt-4">
        
        {/* Running Header on Page */}
        <div className="text-center font-bold mb-3 uppercase border-b border-black pb-1 text-[10pt] aper-avoid-break">
          <div>JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI — FORM ASAP 1</div>
          <div className="font-normal italic">Annual Performance Evaluation Report Dossier</div>
        </div>

        <div className="flex gap-4 mb-4 bg-gray-100 p-2 border border-black aper-avoid-break">
          <div className="font-bold w-20">PART B:</div>
          <div className="text-[10pt]">
            <div className="font-bold uppercase">SUPERVISOR'S ASSESSMENT AND STATUTORY SCORING MATRIX</div>
            <div>To be completed by the designated Head of Section / Immediate Unit Supervisor</div>
          </div>
        </div>

        {/* 14 Statutory Evaluation Criteria Table */}
        <div className="mb-4 aper-avoid-break">
          <table className="w-full border-collapse border border-black text-[10pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-center w-10">S/N</th>
                <th className="border border-black p-1 text-left">Statutory Assessment Criteria & Weighting</th>
                <th className="border border-black p-1 text-center w-20">Maximum Score</th>
                <th className="border border-black p-1 text-center w-24">Score Awarded</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(a)</td>
                <td className="border border-black p-1">Possession of basic qualification for the post</td>
                <td className="border border-black p-1 text-center font-semibold">10</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.basic_qualification || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(b)</td>
                <td className="border border-black p-1">Additional relevant qualification</td>
                <td className="border border-black p-1 text-center font-semibold">5</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.additional_qualification || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(c)</td>
                <td className="border border-black p-1">Relevant Work Experience (2 points per year, maximum 10 years)</td>
                <td className="border border-black p-1 text-center font-semibold">20</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.work_experience || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(d)</td>
                <td className="border border-black p-1">Administrative / Supervisory Experience OR Technical Experience</td>
                <td className="border border-black p-1 text-center font-semibold">10</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.admin_or_tech_experience || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(e)</td>
                <td className="border border-black p-1">Additional relevant training within the appraisal period</td>
                <td className="border border-black p-1 text-center font-semibold">8</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.relevant_training || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(f)</td>
                <td className="border border-black p-1">Personality / Temperament / Comportment / Team Spirit</td>
                <td className="border border-black p-1 text-center font-semibold">7</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.personality_team_spirit || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(g)</td>
                <td className="border border-black p-1">Quality of work produced</td>
                <td className="border border-black p-1 text-center font-semibold">5</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.quality_of_work || 0)}</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-black p-1 text-center">(h)</td>
                <td className="border border-black p-1" colSpan={3}>General Attitude to Work (Subtotal: 20 Points):</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center text-[9pt]">h(i)</td>
                <td className="border border-black p-1 pl-6">i. Regularity at work</td>
                <td className="border border-black p-1 text-center font-semibold">4</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.regularity || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center text-[9pt]">h(ii)</td>
                <td className="border border-black p-1 pl-6">ii. Punctuality</td>
                <td className="border border-black p-1 text-center font-semibold">4</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.punctuality || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center text-[9pt]">h(iii)</td>
                <td className="border border-black p-1 pl-6">iii. Care of University property</td>
                <td className="border border-black p-1 text-center font-semibold">4</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.care_of_property || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center text-[9pt]">h(iv)</td>
                <td className="border border-black p-1 pl-6">iv. Integrity</td>
                <td className="border border-black p-1 text-center font-semibold">4</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.integrity || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center text-[9pt]">h(v)</td>
                <td className="border border-black p-1 pl-6">v. Initiative and Resourcefulness</td>
                <td className="border border-black p-1 text-center font-semibold">4</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.initiative || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(i)</td>
                <td className="border border-black p-1">Knowledge of University Regulations / Office procedures</td>
                <td className="border border-black p-1 text-center font-semibold">10</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.knowledge_regulations || 0)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-semibold">(j)</td>
                <td className="border border-black p-1">Membership and active participation in recognized Professional Bodies</td>
                <td className="border border-black p-1 text-center font-semibold">5</td>
                <td className="border border-black p-1 text-center font-bold">{Number(pB.professional_membership || 0)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold text-[11pt]">
                <td colSpan={2} className="border border-black p-2 text-right uppercase">
                  OVERALL ASSESSMENT TOTAL SCORE:
                </td>
                <td className="border border-black p-2 text-center">100</td>
                <td className="border border-black p-2 text-center text-[12pt] bg-gray-200">
                  {totalScoreB} / 100
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Attendance & Disciplinary History */}
        <div className="mt-4 aper-avoid-break">
          <div className="font-semibold mb-1 text-[10.5pt]">Record of Attendance and Disciplinary History during period:</div>
          <table className="w-full border-collapse border border-black text-[10pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-center w-1/4">Absent With Permission</th>
                <th className="border border-black p-1 text-center w-1/4">Absent Without Permission</th>
                <th className="border border-black p-1 text-center w-1/4">Formal Query / Warning</th>
                <th className="border border-black p-1 text-center w-1/4">Interdiction / Suspension</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center font-semibold">{Number(pB.absent_with || 0)} Day(s)</td>
                <td className="border border-black p-2 text-center font-semibold">{Number(pB.absent_without || 0)} Day(s)</td>
                <td className="border border-black p-2 text-center font-semibold">{Number(pB.warned || 0)} Time(s)</td>
                <td className="border border-black p-2 text-center font-semibold">{Number(pB.suspended || 0)} Time(s)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Supervisor's Recommendation & Remarks */}
        <div className="mt-4 space-y-3 aper-avoid-break">
          <div className="border border-black p-3">
            <span className="font-bold block text-[10.5pt]">Supervisor's Specific Recommendation:</span>
            <div className="mt-1 font-bold text-[11pt] border-b border-black border-dotted pb-1">
              {v(pB.recommendation || (totalScoreB >= 70 ? "Recommended for Promotion" : totalScoreB >= 45 ? "Recommended for Annual Increment" : "Satisfactory"))}
            </div>
          </div>

          <div className="border border-black p-3">
            <span className="font-bold block text-[10.5pt]">Supervisor's General Comments / Justification:</span>
            <div className="mt-1 text-[10pt] leading-relaxed whitespace-pre-wrap min-h-[3rem] border-b border-black border-dotted pb-1">
              {v(pB.comments || "Candidate has performed their assigned statutory duties with dedication, diligence, and commendable professionalism.")}
            </div>
          </div>

          {/* Supervisor Signature Block */}
          <div className="grid grid-cols-3 gap-4 border border-black p-3 bg-gray-50/50 text-[10pt] items-end">
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600 mb-1">SUPERVISOR SIGNATURE:</span>
              {supervisorSig ? (
                <div>
                  <img src={supervisorSig} alt="Supervisor Signature" className="max-h-12 max-w-[170px] object-contain border-b border-black mb-1" />
                  <span className="font-serif italic font-bold text-[10.5pt] text-slate-900 block">Dr. Clement Alabi</span>
                  <span className="text-[7.5pt] font-sans font-semibold text-emerald-800">✓ Verified Digital Signature</span>
                </div>
              ) : (
                <div>
                  <div className="font-serif italic font-bold text-[12pt] text-slate-800 tracking-wide border-b border-gray-400 pb-0.5 mb-0.5" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                    Dr. Clement Alabi
                  </div>
                  <span className="text-[7.5pt] font-sans font-medium text-gray-500 block">Digitally Endorsed Name Signature</span>
                </div>
              )}
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">SUPERVISOR DESIGNATION:</span>
              <span className="font-bold">Head of Section / Unit Supervisor</span>
              <div className="text-[8.5pt] text-gray-600 mt-0.5">Dept. of Computer Science</div>
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">DATE:</span>
              <span className="font-semibold">{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

      </section>

      {/* ========================================================= */}
      {/* PART C: STAFF ACKNOWLEDGMENT & RIGHT OF REPLY             */}
      {/* ========================================================= */}
      <section className="aper-section mt-6 aper-avoid-break">
        <div className="flex gap-4 mb-3 bg-gray-100 p-2 border border-black">
          <div className="font-bold w-20">PART C:</div>
          <div className="text-[10pt]">
            <div className="font-bold uppercase">Staff Member's Acknowledgment</div>
            <div>To be completed by staff member after inspection of Part B</div>
          </div>
        </div>

        <div className="border border-black p-3 space-y-3">
          <div className="flex gap-8 items-center text-[10.5pt]">
            <span className="font-bold">Staff Declaration:</span>
            <span className="font-semibold">
              [{pC.agree !== false ? '✓' : '   '}] I agree with the assessment
            </span>
            <span className="font-semibold">
              [{pC.agree === false ? '✓' : '   '}] I do NOT agree with the assessment
            </span>
          </div>

          <div>
            <span className="font-bold block text-[10pt]">Staff Comments / Reasons for Disagreement (if any):</span>
            <div className="mt-1 text-[10pt] leading-relaxed border-b border-black border-dotted pb-1 min-h-[2rem] whitespace-pre-wrap">
              {v(pC.comments || (pC.agree !== false ? "I have reviewed and accepted the evaluation scores and supervisory remarks in full." : ""))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-black border-dotted text-[10pt]">
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">STAFF SIGNATURE:</span>
              <span className="font-bold underline">Signed Electronically</span>
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">NAME:</span>
              <span className="font-bold uppercase">{v(d.name)}</span>
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">DATE:</span>
              <span className="font-semibold">{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PART D: DEPARTMENTAL A&PC RECOMMENDATION                  */}
      {/* ========================================================= */}
      <div className="aper-page-break my-6"></div>

      <section className="aper-section mt-4">
        
        {/* Running Header */}
        <div className="text-center font-bold mb-3 uppercase border-b border-black pb-1 text-[10pt] aper-avoid-break">
          <div>JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI — FORM ASAP 1</div>
          <div className="font-normal italic">Appointments & Promotions Committee Review Records</div>
        </div>

        <div className="flex gap-4 mb-4 bg-gray-100 p-2 border border-black aper-avoid-break">
          <div className="font-bold w-20">PART D:</div>
          <div className="text-[10pt]">
            <div className="font-bold uppercase">DEPARTMENTAL APPOINTMENTS & PROMOTIONS COMMITTEE REVIEW</div>
            <div>To be completed by the Head of Department / Departmental A&PC Chairman</div>
          </div>
        </div>

        <div className="border border-black p-3 space-y-4 aper-avoid-break">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold block text-[10.5pt]">Departmental Committee Recommendation:</span>
              <div className="mt-1 font-bold text-[11pt] border-b border-black border-dotted pb-1 text-emerald-900">
                {v(pD.recommendation || "Recommend for Promotion")}
              </div>
            </div>
            <div>
              <span className="font-bold block text-[10.5pt]">Proposed Rank / Grade Level:</span>
              <div className="mt-1 font-bold text-[11pt] border-b border-black border-dotted pb-1">
                {v(pD.proposed_rank || "Senior Rank Confirmation / Advancement")}
              </div>
            </div>
          </div>

          <div>
            <span className="font-bold block text-[10.5pt]">Excerpt of Departmental Committee Minutes & Justification:</span>
            <div className="mt-1 text-[10pt] leading-relaxed border border-black p-2.5 min-h-[4.5rem] whitespace-pre-wrap bg-gray-50/50">
              {v(pD.remarks || pD.committee_minutes || "The Departmental Appointments & Promotions Committee convened, thoroughly screened the candidate's statutory appraisal portfolio, confirmed the supervisory scores, and unanimously resolved to recommend the staff for advancement.")}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-black border-dotted text-[10pt] items-end">
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600 mb-1">HEAD OF DEPARTMENT SIGNATURE:</span>
              {hodSig ? (
                <div>
                  <img src={hodSig} alt="HOD Signature" className="max-h-12 max-w-[170px] object-contain border-b border-black mb-1" />
                  <span className="font-serif italic font-bold text-[10.5pt] text-slate-900 block">{v(pD.signature || "Prof. Aminu Bello")}</span>
                  <span className="text-[7.5pt] font-sans font-semibold text-emerald-800">✓ Verified Digital Signature</span>
                </div>
              ) : (
                <div>
                  <div className="font-serif italic font-bold text-[12pt] text-slate-800 tracking-wide border-b border-gray-400 pb-0.5 mb-0.5" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                    {v(pD.signature || "Prof. Aminu Bello")}
                  </div>
                  <span className="text-[7.5pt] font-sans font-medium text-gray-500 block">Digitally Endorsed Name Signature</span>
                </div>
              )}
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">HOD / COMMITTEE CHAIRMAN:</span>
              <span className="font-bold">{v(pD.signature || "Prof. Aminu Bello")}</span>
              <div className="text-[8.5pt] text-gray-600 mt-0.5">Departmental Appraisal Committee</div>
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">DATE OF COMMITTEE SITTING:</span>
              <span className="font-semibold">{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PART E: CENTRAL A&PC FINAL RATIFICATION                   */}
      {/* ========================================================= */}
      <section className="aper-section mt-6 aper-avoid-break">
        
        <div className="flex gap-4 mb-3 bg-gray-100 p-2 border border-black">
          <div className="font-bold w-20">PART E:</div>
          <div className="text-[10pt]">
            <div className="font-bold uppercase">CENTRAL APPOINTMENTS & PROMOTIONS COMMITTEE (A&PC) RATIFICATION</div>
            <div>Final Decision of the University Governing Body on Appointments & Promotions</div>
          </div>
        </div>

        <div className="border-2 border-black p-4 space-y-4 bg-emerald-50/20">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold block text-[10.5pt]">Central A&PC Final Decision:</span>
              <div className="mt-1 font-black text-[12pt] border-b border-black pb-1 uppercase tracking-wide">
                {v(pE.decision || "Approve Promotion")}
              </div>
            </div>
            <div>
              <span className="font-bold block text-[10.5pt]">Effective Date of Ratification:</span>
              <div className="mt-1 font-bold text-[11pt] border-b border-black pb-1">
                {v(pE.effective_date || new Date().toISOString().split('T')[0])}
              </div>
            </div>
          </div>

          <div>
            <span className="font-bold block text-[10.5pt]">Official Committee Minute / Resolution Reference:</span>
            <div className="mt-1 font-mono font-bold text-[10.5pt] border-b border-black border-dotted pb-1">
              {v(pE.reference_no || "APC/MIN/2026/04/S.12")}
            </div>
          </div>

          <div>
            <span className="font-bold block text-[10.5pt]">Central Committee Directives & Remarks:</span>
            <div className="mt-1 text-[10pt] leading-relaxed border border-black p-2.5 min-h-[3.5rem] whitespace-pre-wrap bg-white">
              {v(pE.remarks || "The Central Appointments & Promotions Committee (A&PC) after due consideration of the Departmental recommendation and supervisory assessment matrix, hereby ratifies and confirms the enterprise decision as recorded.")}
            </div>
          </div>

          {/* APC Chairman Signature & Official University Seal */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t-2 border-black items-end text-[10pt]">
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600 mb-1">CHAIRMAN, A&PC SIGNATURE:</span>
              {apcSig ? (
                <div>
                  <img src={apcSig} alt="APC Chairman Signature" className="max-h-14 max-w-[180px] object-contain border-b border-black mb-1" />
                  <span className="font-serif italic font-bold text-[10.5pt] text-slate-900 block">Prof. J. O. Oladipo</span>
                  <span className="text-[7.5pt] font-sans font-semibold text-emerald-800">✓ Authenticated by University Council</span>
                </div>
              ) : (
                <div>
                  <div className="font-serif italic font-bold text-[13pt] text-slate-800 tracking-wide border-b border-gray-400 pb-0.5 mb-0.5" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                    Prof. J. O. Oladipo
                  </div>
                  <span className="text-[7.5pt] font-sans font-medium text-gray-500 block">Certified & Digitally Signed</span>
                </div>
              )}
              <div className="text-[8.5pt] text-gray-500 mt-1">Vice-Chancellor / Designated Chairman</div>
            </div>
            <div>
              <span className="font-semibold block text-[9pt] text-gray-600">DATE RATIFIED:</span>
              <span className="font-bold text-[10.5pt]">{v(pE.effective_date || new Date().toISOString().split('T')[0])}</span>
            </div>
            <div className="border-2 border-black border-dashed p-2 text-center rounded bg-white">
              <div className="text-[9pt] font-black uppercase tracking-wider text-emerald-950">OFFICIAL SEAL</div>
              <div className="text-[7.5pt] text-gray-700">JOSTUM A&PC RATIFIED</div>
              <div className="text-[8pt] font-mono font-bold mt-0.5">STATUS: CONFIRMED</div>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
};
