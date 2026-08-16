import LegalPage, { LegalSection } from "@/components/LegalPage";
import { Link } from "react-router-dom";

const Terms = () => (
  <LegalPage title="Terms of Service">
    <LegalSection title="1. Agreement to Terms">
      <p>By accessing or using the FlyBye application ("Service"), operated by FlyBye LLC, a limited liability company organized under the laws of the State of New York, USA ("FlyBye," "we," "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.</p>
    </LegalSection>

    <LegalSection title="2. Eligibility">
      <p>You must be at least 18 years old and legally able to form a binding contract to use FlyBye. By creating an account, you represent and warrant that you meet these requirements and that all information you provide is true, accurate, and complete.</p>
    </LegalSection>

    <LegalSection title="3. User Accounts & Verification">
      <p>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. FlyBye may require identity verification (including government ID and biometric selfie matching) as a condition of using certain features. You consent to such verification and to the collection and processing of related data as described in our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.</p>
    </LegalSection>

    <LegalSection title="4. NO BACKGROUND CHECKS — Important Disclaimer">
      <p className="font-semibold text-foreground">FLYBYE DOES NOT CONDUCT CRIMINAL BACKGROUND CHECKS, SEX OFFENDER REGISTRY SEARCHES, OR ANY SIMILAR INVESTIGATION OF ITS USERS.</p>
      <p>Identity verification confirms only that a government-issued ID appears authentic and matches a selfie. It does not verify character, intent, criminal history, or fitness to meet other people. You acknowledge that you alone are responsible for evaluating any other user before, during, and after any interaction. <strong>Use the Service at your own risk.</strong></p>
    </LegalSection>

    <LegalSection title="5. Acceptable Use">
      <p>Your use of the Service is governed by our <Link to="/acceptable-use" className="text-primary underline">Acceptable Use Policy</Link> and <Link to="/community-guidelines" className="text-primary underline">Community Guidelines</Link>, both incorporated by reference. Violations may result in immediate termination without refund.</p>
    </LegalSection>

    <LegalSection title="6. User Content & License">
      <p>You retain ownership of content you submit. By posting content, you grant FlyBye LLC a non-exclusive, worldwide, royalty-free, sublicensable, transferable license to use, host, store, reproduce, modify, display, and distribute your content in connection with operating, promoting, and improving the Service. This license survives termination for content already shared with other users.</p>
    </LegalSection>

    <LegalSection title="7. Privacy">
      <p>Your use of the Service is also governed by our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>, incorporated by reference.</p>
    </LegalSection>

    <LegalSection title="8. Subscriptions, Fees & Refunds">
      <p>Some features require a paid subscription. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Except where required by law, all fees are non-refundable. We reserve the right to change pricing with reasonable notice.</p>
    </LegalSection>

    <LegalSection title="9. Termination">
      <p>FlyBye may suspend or terminate your account at any time, with or without notice, for any reason including violation of these Terms or conduct we believe is harmful. You may delete your account at any time via in-app settings.</p>
    </LegalSection>

    <LegalSection title="10. Disclaimers — AS IS">
      <p className="uppercase font-semibold text-foreground">The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including the implied warranties of merchantability, fitness for a particular purpose, non-infringement, and any warranties arising from course of dealing or trade usage.</p>
      <p>FlyBye does not warrant that the Service will be uninterrupted, secure, or error-free, that defects will be corrected, or that the Service is free of viruses or harmful components. FlyBye makes no representation about the conduct, identity, intent, or safety of any user.</p>
    </LegalSection>

    <LegalSection title="11. Limitation of Liability">
      <p className="uppercase font-semibold text-foreground">To the maximum extent permitted by applicable law, in no event shall FlyBye LLC, its officers, directors, employees, agents, affiliates, or licensors be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of profits, revenues, data, goodwill, or other intangible losses, arising out of or relating to your access to or use of (or inability to access or use) the Service, including damages arising from interactions with other users — whether online or in person.</p>
      <p className="uppercase font-semibold text-foreground">In no event shall FlyBye's aggregate liability exceed the greater of (a) one hundred U.S. dollars (US$100) or (b) the total amount you paid FlyBye in the twelve months preceding the event giving rise to the claim.</p>
    </LegalSection>

    <LegalSection title="12. Indemnification">
      <p>You agree to defend, indemnify, and hold harmless FlyBye LLC and its officers, directors, employees, and agents from any claims, damages, obligations, losses, liabilities, costs, or expenses (including reasonable attorneys' fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party right; or (d) any content you submit.</p>
    </LegalSection>

    <LegalSection title="13. Binding Arbitration; Class Action Waiver">
      <p className="font-semibold text-foreground">PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS.</p>
      <p>You and FlyBye agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by binding individual arbitration administered by JAMS under its Streamlined Arbitration Rules, in New York, NY, USA. Judgment on the award may be entered in any court of competent jurisdiction.</p>
      <p className="font-semibold text-foreground">YOU AND FLYBYE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person's claims and may not preside over any form of representative or class proceeding.</p>
      <p>You may opt out of arbitration within 30 days of first accepting these Terms by emailing <a href="mailto:legal@flybye.com" className="text-primary underline">legal@flybye.com</a> with subject line "Arbitration Opt-Out" and including your account email.</p>
    </LegalSection>

    <LegalSection title="14. Governing Law & Venue">
      <p>These Terms are governed by the laws of the State of New York, without regard to conflict of law principles. Subject to Section 13, any dispute not subject to arbitration shall be resolved exclusively in the state or federal courts located in New York County, New York, and you consent to personal jurisdiction there.</p>
    </LegalSection>

    <LegalSection title="15. Changes to Terms">
      <p>We may update these Terms from time to time. Material changes will be communicated via in-app notice or email. Continued use of the Service after changes take effect constitutes acceptance.</p>
    </LegalSection>

    <LegalSection title="16. Severability & Entire Agreement">
      <p>If any provision is found unenforceable, the remaining provisions remain in full force. These Terms, together with the Privacy Policy, Acceptable Use Policy, and Community Guidelines, constitute the entire agreement between you and FlyBye regarding the Service.</p>
    </LegalSection>

    <LegalSection title="17. Contact">
      <p>FlyBye LLC, New York, NY, USA — <a href="mailto:legal@flybye.com" className="text-primary underline">legal@flybye.com</a></p>
    </LegalSection>
  </LegalPage>
);

export default Terms;
