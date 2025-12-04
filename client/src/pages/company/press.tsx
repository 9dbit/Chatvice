import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Newspaper,
  Download,
  ExternalLink,
  Calendar,
  Mail,
} from "lucide-react";
import PublicPageLayout from "../public-layout";
import { useTheme } from "@/components/theme-provider";
import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

export default function PressPage() {
  const { resolvedTheme } = useTheme();
  const chatviceLogo = resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  const pressReleases = [
    {
      title: "Chatvice Launches LEXA1 AI Engine for Customer Service",
      date: "December 9, 2025",
      excerpt: "Indonesian AI startup launches advanced customer service platform designed for Southeast Asian businesses."
    },
    {
      title: "Chatvice Integrates 1-Pay for Indonesian Market",
      date: "November 15, 2025",
      excerpt: "New payment integration makes it easy for Indonesian businesses to subscribe using local payment methods."
    },
    {
      title: "Chatvice Announces Human Escalation Features",
      date: "November 1, 2025",
      excerpt: "New supervisor panel and round-robin assignment system enables seamless AI-to-human handoffs."
    },
  ];

  const mediaKit = [
    { name: "Logo Package", format: "PNG, SVG", size: "2.4 MB" },
    { name: "Brand Guidelines", format: "PDF", size: "1.8 MB" },
    { name: "Product Screenshots", format: "PNG", size: "5.2 MB" },
    { name: "Founder Photos", format: "JPG", size: "3.1 MB" },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Newspaper className="w-3 h-3 mr-1" />
            Press
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Press & Media
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            Get the latest news, press releases, and media resources from Chatvice.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Press Releases</h2>
              <div className="space-y-4">
                {pressReleases.map((release, index) => (
                  <Card key={index} className="p-6 hover-elevate">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      {release.date}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{release.title}</h3>
                    <p className="text-muted-foreground mb-4">{release.excerpt}</p>
                    <Button variant="outline" size="sm">
                      Read Full Release
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">Company Info</h2>
              <Card className="p-6 mb-6">
                <img src={chatviceLogo} alt="Chatvice" className="h-10 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Chatvice is an AI-powered customer service platform that helps 
                  businesses automate support while maintaining human connection. 
                  Powered by LEXA1, our proprietary AI engine.
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Founded:</strong> 2025</p>
                  <p><strong>Headquarters:</strong> Indonesia</p>
                  <p><strong>Industry:</strong> AI / SaaS / Customer Service</p>
                </div>
              </Card>

              <h3 className="font-semibold mb-4">Media Kit</h3>
              <div className="space-y-2">
                {mediaKit.map((item, index) => (
                  <Card key={index} className="p-4 flex items-center justify-between hover-elevate">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.format} - {item.size}</p>
                    </div>
                    <Button size="icon" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Mail className="w-12 h-12 mx-auto text-purple-600 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Media Inquiries</h2>
          <p className="text-muted-foreground mb-6">
            For press inquiries, interviews, or additional information, please contact our media team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-purple-600 hover:bg-purple-700">
              press@chatvice.com
            </Button>
            <Link href="/contact">
              <Button variant="outline">
                Contact Form
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
