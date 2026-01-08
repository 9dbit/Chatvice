import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function PrivacyPolicyPage() {
  const lastUpdated = "December 1, 2025";

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-purple-100">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 prose dark:prose-invert max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Chatvice ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered customer service platform.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, company name, and password when you register.</li>
              <li><strong>Payment Information:</strong> Billing details processed through our payment partner (1-Pay). We do not store full payment card details.</li>
              <li><strong>Knowledge Base Content:</strong> Documents, FAQs, and other content you upload to train your AI agents.</li>
              <li><strong>Communications:</strong> Messages you send through our support channels.</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage Data:</strong> Pages visited, features used, and interactions with our platform.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
              <li><strong>Log Data:</strong> IP addresses, access times, and referring URLs.</li>
            </ul>

            <h3>2.3 Chat Data</h3>
            <ul>
              <li><strong>Customer Conversations:</strong> Messages exchanged between your customers and AI agents.</li>
              <li><strong>Session Metadata:</strong> Timestamps, language detection, and escalation events.</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Train and improve AI agent responses (using your knowledge base)</li>
              <li>Send administrative and promotional communications</li>
              <li>Respond to customer service requests</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>

            <h2>4. Data Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Third parties that perform services on our behalf (hosting, payment processing, AI services).</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h2>5. Data Security</h2>
            <p>We implement appropriate security measures including:</p>
            <ul>
              <li>TLS encryption for data in transit</li>
              <li>Encrypted database storage</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us.
            </p>

            <h2>7. Your Rights</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>

            <h2>8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2>9. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under 18. We do not knowingly collect personal information from children.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <ul>
              <li>Email: privacy@chatvice.app</li>
              <li>Website: chatvice.app/contact</li>
            </ul>
          </Card>
        </div>
      </section>
    </PublicPageLayout>
  );
}
