import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Shield,
  Lock,
  Key,
  Server,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function SecurityPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "Encryption",
      description: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256."
    },
    {
      icon: Key,
      title: "Authentication",
      description: "Secure session-based authentication with bcrypt password hashing."
    },
    {
      icon: Server,
      title: "Infrastructure",
      description: "Hosted on secure, SOC 2 compliant infrastructure with regular backups."
    },
    {
      icon: Eye,
      title: "Access Control",
      description: "Role-based access control with strict separation between tenants."
    },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Security
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Security at Chatvice
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            We take security seriously. Learn about the measures we take to protect your data.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, index) => (
              <Card key={index} className="p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 prose dark:prose-invert max-w-none">
            <h2>Data Protection</h2>
            
            <h3>Encryption</h3>
            <ul>
              <li><strong>In Transit:</strong> All communications use TLS 1.3 encryption</li>
              <li><strong>At Rest:</strong> Database encryption using AES-256</li>
              <li><strong>Passwords:</strong> Hashed using bcrypt with salt</li>
              <li><strong>API Keys:</strong> Stored encrypted, never exposed in logs</li>
            </ul>

            <h3>Access Control</h3>
            <ul>
              <li>Multi-tenant architecture with strict data isolation</li>
              <li>Role-based access control (Merchant, Supervisor, Admin)</li>
              <li>Session-based authentication with secure cookies</li>
              <li>JWT verification for widget identity</li>
            </ul>

            <h3>Infrastructure Security</h3>
            <ul>
              <li>Hosted on enterprise-grade cloud infrastructure</li>
              <li>Regular security patches and updates</li>
              <li>Network isolation and firewall protection</li>
              <li>Automated backups with point-in-time recovery</li>
            </ul>

            <h2>Widget Security</h2>
            
            <h3>Domain Restrictions</h3>
            <p>
              Pro and Enterprise plans can restrict which domains can embed the chat widget, preventing unauthorized usage.
            </p>

            <h3>Identity Verification</h3>
            <p>
              Secure customer authentication using JWT tokens signed with your secret key. This ensures only authenticated users from your platform can access personalized chat features.
            </p>

            <h2>Compliance</h2>
            <ul>
              <li>GDPR compliant data processing</li>
              <li>Indonesian data protection regulations</li>
              <li>Regular security assessments</li>
              <li>Incident response procedures</li>
            </ul>

            <h2>Reporting Security Issues</h2>
            <p>
              If you discover a security vulnerability, please report it responsibly:
            </p>
            <ul>
              <li>Email: security@chatvice.app</li>
              <li>Please include details of the vulnerability</li>
              <li>Allow us time to address the issue before disclosure</li>
            </ul>
          </Card>

          <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Security Best Practices</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Use strong, unique passwords for your account</li>
                  <li>Keep your API keys and secret keys confidential</li>
                  <li>Regenerate secret keys if you suspect compromise</li>
                  <li>Review supervisor access regularly</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/privacy">
              <Button variant="outline">
                Privacy Policy
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Contact Security Team
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
