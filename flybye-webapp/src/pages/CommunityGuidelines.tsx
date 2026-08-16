import LegalPage, { LegalSection } from "@/components/LegalPage";

const CommunityGuidelines = () => (
  <LegalPage title="Community Guidelines">
    <LegalSection title="Our promise">
      <p>FlyBye exists to help travelers connect safely and respectfully at terminals around the world. These guidelines apply to every interaction on the platform — profiles, messages, and in-person meetings.</p>
    </LegalSection>
    <LegalSection title="Be authentic">
      <p>Use real photos of yourself, your real first name, and accurate flight information. Catfishing, impersonation, and use of AI-generated likenesses to misrepresent yourself are prohibited.</p>
    </LegalSection>
    <LegalSection title="Be respectful">
      <p>No harassment, hate speech, slurs, threats, sexual content involving minors, doxxing, or unsolicited explicit material. "No" means no — at every stage of any conversation or meeting.</p>
    </LegalSection>
    <LegalSection title="No commercial activity">
      <p>FlyBye is for personal connections only. No solicitation, sex work, escort services, MLM pitches, recruiting, or promotion of products and services.</p>
    </LegalSection>
    <LegalSection title="No illegal activity">
      <p>Do not use FlyBye to plan, coordinate, or facilitate any illegal act, including drug transactions, smuggling, trafficking, or evading airport security.</p>
    </LegalSection>
    <LegalSection title="Safety inside the terminal">
      <p>Always meet in public, well-lit, post-security areas. Tell a friend or family member where you are. Do not share boarding passes, passport numbers, or hotel room numbers with strangers.</p>
    </LegalSection>
    <LegalSection title="Reporting & enforcement">
      <p>Report violations via the in-app report button or by emailing <a href="mailto:trust@flybye.com" className="text-primary underline">trust@flybye.com</a>. Violations may result in warnings, account suspension, permanent ban, and where applicable, referral to law enforcement.</p>
    </LegalSection>
  </LegalPage>
);

export default CommunityGuidelines;
