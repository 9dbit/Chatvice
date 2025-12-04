import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Cookie } from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function CookiePolicyPage() {
  const lastUpdated = "December 1, 2025";

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Cookie className="w-3 h-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-purple-100">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 prose dark:prose-invert max-w-none">
            <h2>1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience by remembering your preferences and understanding how you use our site.
            </p>

            <h2>2. Types of Cookies We Use</h2>
            
            <h3>2.1 Essential Cookies</h3>
            <p>These cookies are necessary for the website to function properly:</p>
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>session_id</td>
                  <td>Maintains your login session</td>
                  <td>24 hours</td>
                </tr>
                <tr>
                  <td>csrf_token</td>
                  <td>Security - prevents cross-site attacks</td>
                  <td>Session</td>
                </tr>
              </tbody>
            </table>

            <h3>2.2 Preference Cookies</h3>
            <p>These cookies remember your settings and preferences:</p>
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>chatvice-ui-theme</td>
                  <td>Remembers your dark/light mode preference</td>
                  <td>1 year</td>
                </tr>
                <tr>
                  <td>language</td>
                  <td>Stores your language preference</td>
                  <td>1 year</td>
                </tr>
              </tbody>
            </table>

            <h3>2.3 Analytics Cookies</h3>
            <p>These cookies help us understand how visitors use our website:</p>
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>_analytics</td>
                  <td>Tracks page views and user behavior</td>
                  <td>2 years</td>
                </tr>
              </tbody>
            </table>

            <h2>3. Chat Widget Cookies</h2>
            <p>
              When the Chatvice chat widget is embedded on third-party websites, it may use cookies to:
            </p>
            <ul>
              <li>Maintain chat session continuity</li>
              <li>Remember customer identity (if verified)</li>
              <li>Store conversation history locally</li>
            </ul>

            <h2>4. Third-Party Cookies</h2>
            <p>We may use services that set their own cookies:</p>
            <ul>
              <li><strong>Payment Processing:</strong> 1-Pay may set cookies for transaction security</li>
              <li><strong>Analytics:</strong> To understand website usage patterns</li>
            </ul>

            <h2>5. Managing Cookies</h2>
            <p>You can control cookies through your browser settings:</p>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
            </ul>
            <p>
              Note: Disabling essential cookies may affect the functionality of our Service.
            </p>

            <h2>6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. The updated version will be indicated by the "Last updated" date.
            </p>

            <h2>7. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us at privacy@chatvice.com.
            </p>
          </Card>
        </div>
      </section>
    </PublicPageLayout>
  );
}
