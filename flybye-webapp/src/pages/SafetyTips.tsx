import LegalPage, { LegalSection } from "@/components/LegalPage";

const SafetyTips = () => (
  <LegalPage title="Safety Tips">
    <LegalSection title="Before you meet">
      <ul className="list-disc list-inside space-y-1">
        <li>Verify your match is ID-verified (look for the badge).</li>
        <li>Voice or video chat in-app before meeting in person.</li>
        <li>Tell a friend or family member where you are, who you're meeting, and when you board.</li>
        <li>Never share your boarding pass, passport number, hotel, or home address.</li>
      </ul>
    </LegalSection>
    <LegalSection title="At the terminal">
      <ul className="list-disc list-inside space-y-1">
        <li>Meet only in public, post-security areas with heavy foot traffic.</li>
        <li>Stay in plain sight of airport staff and security cameras.</li>
        <li>Do not accept food, drinks, or items you did not see prepared or sealed.</li>
        <li>Keep your belongings with you at all times — never agree to "hold" or "carry" something for someone else.</li>
        <li>Trust your instincts. If something feels off, leave and report the user.</li>
      </ul>
    </LegalSection>
    <LegalSection title="Online safety">
      <ul className="list-disc list-inside space-y-1">
        <li>Never send money or financial information to anyone you met on FlyBye.</li>
        <li>Be skeptical of anyone who asks to move the conversation off-platform quickly.</li>
        <li>Watch for red flags: requests for nude images, stories that don't add up, pressure tactics.</li>
        <li>Report suspicious behavior immediately via the in-app report button.</li>
      </ul>
    </LegalSection>
    <LegalSection title="In an emergency">
      <p>If you feel unsafe, contact airport security or local law enforcement immediately. In the United States, dial 911. Most airports also have visible security desks and uniformed officers near gates.</p>
    </LegalSection>
    <LegalSection title="Important reminder">
      <p>FlyBye does <strong>not</strong> conduct criminal background checks. Identity verification confirms ID authenticity, not character. You are solely responsible for your decisions about whom to meet.</p>
    </LegalSection>
  </LegalPage>
);

export default SafetyTips;
