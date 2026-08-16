import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

const LegalPage = ({ title, lastUpdated = "April 2, 2026", children }: LegalPageProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

export default LegalPage;
