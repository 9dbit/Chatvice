import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, ArrowRight } from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function GDPRPage() {
  const lastUpdated = "December 1, 2025";

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Data Protection
          </Badge>
          <h1 className="text-4xl font-bold mb-4">GDPR Compliance</h1>
          <p className="text-purple-100">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 prose dark:prose-invert max-w-none">
            <h2>Our Commitment to GDPR</h2>
            <p>
              Chatvice is committed to protecting the personal data of individuals in the European Union (EU) and European Economic Area (EEA) in compliance with the General Data Protection Regulation (GDPR).
            </p>

            <h2>Key GDPR Principles We Follow</h2>
            
            <h3>1. Lawfulness, Fairness, and Transparency</h3>
            <p>
              We process personal data lawfully, fairly, and transparently. Our Privacy Policy clearly explains what data we collect and how we use it.
            </p>

            <h3>2. Purpose Limitation</h3>
            <p>
              We collect personal data only for specified, explicit, and legitimate purposes. We do not process data in ways incompatible with those purposes.
            </p>

            <h3>3. Data Minimization</h3>
            <p>
              We collect only the personal data that is necessary for the purposes we've specified.
            </p>

            <h3>4. Accuracy</h3>
            <p>
              We take reasonable steps to ensure personal data is accurate and kept up to date. You can update your information through your account settings.
            </p>

            <h3>5. Storage Limitation</h3>
            <p>
              We retain personal data only for as long as necessary to fulfill the purposes for which it was collected.
            </p>

            <h3>6. Integrity and Confidentiality</h3>
            <p>
              We implement appropriate technical and organizational measures to protect personal data against unauthorized access, loss, or destruction.
            </p>

            <h2>Your Rights Under GDPR</h2>
            <p>As an EU/EEA resident, you have the following rights:</p>
            
            <h3>Right to Access</h3>
            <p>You can request a copy of the personal data we hold about you.</p>

            <h3>Right to Rectification</h3>
            <p>You can request correction of inaccurate personal data.</p>

            <h3>Right to Erasure ("Right to be Forgotten")</h3>
            <p>You can request deletion of your personal data in certain circumstances.</p>

            <h3>Right to Restrict Processing</h3>
            <p>You can request that we limit the processing of your personal data.</p>

            <h3>Right to Data Portability</h3>
            <p>You can request your data in a structured, machine-readable format.</p>

            <h3>Right to Object</h3>
            <p>You can object to processing of your personal data for certain purposes.</p>

            <h3>Rights Related to Automated Decision Making</h3>
            <p>You have rights regarding automated decisions, including profiling.</p>

            <h2>Legal Basis for Processing</h2>
            <p>We process personal data based on:</p>
            <ul>
              <li><strong>Contract:</strong> Processing necessary to provide our services</li>
              <li><strong>Consent:</strong> Where you have given consent for specific purposes</li>
              <li><strong>Legitimate Interests:</strong> For purposes like improving our services and fraud prevention</li>
              <li><strong>Legal Obligation:</strong> Where required by law</li>
            </ul>

            <h2>Data Processing Agreements</h2>
            <p>
              When we act as a data processor on behalf of our customers (merchants), we enter into Data Processing Agreements (DPAs) that comply with GDPR requirements.
            </p>

            <h2>International Data Transfers</h2>
            <p>
              When we transfer personal data outside the EU/EEA, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses.
            </p>

            <h2>Data Protection Officer</h2>
            <p>
              For GDPR-related inquiries, you can contact our Data Protection team at:
            </p>
            <ul>
              <li>Email: hello@chatvice.app</li>
            </ul>

            <h2>Exercising Your Rights</h2>
            <p>
              To exercise any of your GDPR rights, please contact us at hello@chatvice.app. We will respond to your request within 30 days.
            </p>

            <h2>Complaints</h2>
            <p>
              If you believe your data protection rights have been violated, you have the right to lodge a complaint with a supervisory authority in the EU/EEA member state of your residence.
            </p>
          </Card>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/privacy">
              <Button variant="outline">
                Read Privacy Policy
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Contact DPO
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
