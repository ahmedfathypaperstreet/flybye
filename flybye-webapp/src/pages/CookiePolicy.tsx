import LegalPage, { LegalSection } from "@/components/LegalPage";

const CookiePolicy = () => (
  <LegalPage title="Cookie Policy">
    <LegalSection title="What are cookies?">
      <p>Cookies are small text files placed on your device when you visit a website or use an app. We use cookies and similar technologies (local storage, session storage, device identifiers) to operate and improve FlyBye.</p>
    </LegalSection>
    <LegalSection title="How we use cookies">
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Strictly necessary:</strong> Authentication, session management, security, and fraud prevention.</li>
        <li><strong>Functional:</strong> Remembering preferences such as language, theme, and recent searches.</li>
        <li><strong>Analytics:</strong> Aggregated, de-identified usage data to understand how the Service is used.</li>
        <li><strong>Performance:</strong> Detecting errors and measuring response times.</li>
      </ul>
      <p className="mt-2">FlyBye does not use cookies for cross-site advertising or sell cookie data to third parties.</p>
    </LegalSection>
    <LegalSection title="Third-party cookies">
      <p>Some service providers (authentication, payments, error monitoring) may set their own cookies. These providers are contractually bound to use that data only to provide services to FlyBye.</p>
    </LegalSection>
    <LegalSection title="Managing cookies">
      <p>You can control cookies through your browser or device settings. Disabling strictly necessary cookies may prevent the Service from functioning correctly.</p>
    </LegalSection>
  </LegalPage>
);

export default CookiePolicy;
