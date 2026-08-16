import LegalPage, { LegalSection } from "@/components/LegalPage";

const LawEnforcement = () => (
  <LegalPage title="Law Enforcement Guidelines">
    <LegalSection title="Overview">
      <p>FlyBye LLC ("FlyBye") is committed to user safety and to cooperating with valid legal process from law enforcement agencies. This page describes how authorized officials may submit requests for user information and emergency disclosures.</p>
    </LegalSection>
    <LegalSection title="Required legal process">
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Basic subscriber information</strong> (e.g., name, email, IP logs) — valid subpoena.</li>
        <li><strong>Non-content records</strong> (e.g., match history, login timestamps) — court order under 18 U.S.C. § 2703(d) or equivalent.</li>
        <li><strong>Content of communications</strong> (e.g., messages) — search warrant issued upon probable cause.</li>
        <li><strong>International requests</strong> — must be submitted via MLAT, letter rogatory, or otherwise enforceable in U.S. courts.</li>
      </ul>
    </LegalSection>
    <LegalSection title="Submitting a request">
      <p>All legal process must be served on FlyBye LLC at our New York, NY office. Email a PDF copy to <a href="mailto:legal@flybye.com" className="text-primary underline">legal@flybye.com</a> with the subject line "Law Enforcement Request — [Agency Name]". Include:</p>
      <ul className="list-disc list-inside space-y-1 mt-2">
        <li>Issuing authority and case number.</li>
        <li>Specific user identifiers (email, user ID, phone if known).</li>
        <li>Date range of records sought.</li>
        <li>Officer contact information for verification.</li>
      </ul>
    </LegalSection>
    <LegalSection title="Emergency disclosure requests">
      <p>If you believe there is an imminent risk of death or serious physical injury, email <a href="mailto:legal@flybye.com" className="text-primary underline">legal@flybye.com</a> with the subject "EMERGENCY DISCLOSURE REQUEST" and a sworn declaration describing the emergency. We respond to verified emergencies as quickly as possible, typically within hours.</p>
    </LegalSection>
    <LegalSection title="User notice">
      <p>Consistent with our Privacy Policy, FlyBye will notify users of requests for their information before disclosure unless prohibited by law (e.g., a valid non-disclosure order) or where notice would be counterproductive (e.g., imminent threat to life).</p>
    </LegalSection>
    <LegalSection title="Preservation requests">
      <p>FlyBye will honor preservation requests under 18 U.S.C. § 2703(f) for an initial 90 days, extendable upon written request.</p>
    </LegalSection>
    <LegalSection title="Costs">
      <p>FlyBye reserves the right to seek reimbursement for costs of producing records as permitted by applicable law.</p>
    </LegalSection>
  </LegalPage>
);

export default LawEnforcement;
