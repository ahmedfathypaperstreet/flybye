import LegalPage, { LegalSection } from "@/components/LegalPage";

const Privacy = () => (
  <LegalPage title="Privacy Policy">
    <LegalSection title="1. Introduction">
      <p>FlyBye LLC ("we," "our," "us"), based in New York, NY, USA, operates the FlyBye application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
    </LegalSection>

    <LegalSection title="2. Information We Collect">
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Account information:</strong> name, email, password hash, phone (optional).</li>
        <li><strong>Profile data:</strong> photos, bio, interests, gender, gender preference, connection mode.</li>
        <li><strong>Identity verification data:</strong> government ID images, selfie, liveness signals, and verification result. ID images are processed by our verification provider and not retained by FlyBye in plaintext beyond what is necessary to display your verification status.</li>
        <li><strong>Flight & location data:</strong> airports, flight numbers, dates, layover details, and approximate location when discovering nearby flyers.</li>
        <li><strong>Usage data:</strong> matches, swipes, messages, feature usage, session timestamps.</li>
        <li><strong>Device data:</strong> device type, OS, browser, IP address, crash logs.</li>
        <li><strong>Payment data:</strong> processed by our payment provider; we store only subscription status and last-four digits.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. How We Use Your Information">
      <ul className="list-disc list-inside space-y-1">
        <li>Provide, maintain, and improve the Service.</li>
        <li>Match you with other travelers based on flights and preferences.</li>
        <li>Verify your identity and prevent fraud, abuse, and impersonation.</li>
        <li>Facilitate communication between matched users.</li>
        <li>Send service notifications, security alerts, and (with consent) marketing.</li>
        <li>Comply with legal obligations and respond to lawful requests.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Legal Bases (GDPR / UK GDPR)">
      <p>Where applicable, we rely on: (a) <strong>contract</strong> to provide the Service; (b) <strong>legitimate interests</strong> for safety, fraud prevention, and product improvement; (c) <strong>consent</strong> for marketing and biometric verification; (d) <strong>legal obligation</strong> for law enforcement responses.</p>
    </LegalSection>

    <LegalSection title="5. Sharing of Information">
      <p>We do not sell your personal information. We share information with: (a) other users as part of matching and messaging; (b) service providers (hosting, payments, identity verification, analytics) under contractual confidentiality; (c) law enforcement and regulators per our <a href="/law-enforcement" className="text-primary underline">Law Enforcement Guidelines</a>; (d) successors in a merger, acquisition, or asset sale.</p>
    </LegalSection>

    <LegalSection title="6. International Transfers">
      <p>FlyBye is operated from the United States. By using the Service, you consent to the transfer of your data to the U.S. and other jurisdictions, which may have different data-protection laws than your country of residence. Where required, we use Standard Contractual Clauses or equivalent safeguards.</p>
    </LegalSection>

    <LegalSection title="7. Data Security">
      <p>We implement commercially reasonable technical and organizational measures, including encryption in transit, access controls, and routine security reviews. However, no system is 100% secure, and we cannot guarantee absolute security.</p>
    </LegalSection>

    <LegalSection title="8. Data Retention">
      <p>We retain your information for as long as your account is active and as needed to provide the Service. After deletion, we retain limited information as required for legal compliance, fraud prevention, dispute resolution, and enforcement of our Terms (typically up to 7 years for financial records and 3 years for safety-related logs).</p>
    </LegalSection>

    <LegalSection title="9. Your Rights">
      <p>Depending on your jurisdiction, you may have rights to: access, correct, delete, or export your data; object to or restrict processing; withdraw consent; and lodge a complaint with a supervisory authority. California residents have additional rights under the CCPA/CPRA, including the right to opt out of "sharing." Contact <a href="mailto:legal@flybye.com" className="text-primary underline">legal@flybye.com</a> to exercise any rights.</p>
    </LegalSection>

    <LegalSection title="10. Children's Privacy">
      <p>The Service is not intended for individuals under 18. We do not knowingly collect data from anyone under 18. If we learn we have, we will delete it promptly.</p>
    </LegalSection>

    <LegalSection title="11. Cookies & Tracking">
      <p>See our <a href="/cookie-policy" className="text-primary underline">Cookie Policy</a> for details on cookies, local storage, and similar technologies.</p>
    </LegalSection>

    <LegalSection title="12. Changes to This Policy">
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes via in-app notice, email, or by updating the "Last updated" date.</p>
    </LegalSection>

    <LegalSection title="13. Contact">
      <p>FlyBye LLC, New York, NY, USA — <a href="mailto:legal@flybye.com" className="text-primary underline">legal@flybye.com</a></p>
    </LegalSection>
  </LegalPage>
);

export default Privacy;
