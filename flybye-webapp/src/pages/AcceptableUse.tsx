import LegalPage, { LegalSection } from "@/components/LegalPage";

const AcceptableUse = () => (
  <LegalPage title="Acceptable Use Policy">
    <LegalSection title="Prohibited conduct">
      <p>You may not, and may not permit any third party to:</p>
      <ul className="list-disc list-inside space-y-1 mt-2">
        <li>Use the Service in any unlawful manner or for any unlawful purpose.</li>
        <li>Harass, abuse, threaten, defame, stalk, or intimidate another user.</li>
        <li>Post or transmit content that is hateful, discriminatory, sexually explicit involving minors, or otherwise objectionable.</li>
        <li>Impersonate any person or entity, or misrepresent your identity, age, or affiliation.</li>
        <li>Solicit money, financial information, or commercial transactions from other users.</li>
        <li>Upload viruses, malware, or any code intended to disrupt the Service.</li>
        <li>Scrape, crawl, reverse-engineer, or otherwise access the Service through automated means.</li>
        <li>Use the Service to recruit users to another platform or service.</li>
        <li>Bypass, disable, or interfere with security or verification features.</li>
        <li>Create multiple accounts, share accounts, or transfer your account.</li>
      </ul>
    </LegalSection>
    <LegalSection title="Content standards">
      <p>All content you submit must be your own, accurate, and lawful. You grant FlyBye LLC a worldwide, non-exclusive, royalty-free license to host, display, and distribute your content as needed to operate the Service.</p>
    </LegalSection>
    <LegalSection title="Enforcement">
      <p>Violations may result in immediate removal of content, suspension or termination of your account without refund, and reporting to law enforcement. We may take action with or without notice at our sole discretion.</p>
    </LegalSection>
  </LegalPage>
);

export default AcceptableUse;
