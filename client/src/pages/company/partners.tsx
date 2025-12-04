import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Handshake,
  ArrowRight,
  Check,
  Building2,
  Code,
  Globe,
  Award,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function PartnersPage() {
  const partnerTypes = [
    {
      icon: Building2,
      title: "Agency Partners",
      description: "Help your clients succeed with AI customer service. Get exclusive partner pricing and co-marketing opportunities.",
      benefits: [
        "Partner pricing discounts",
        "Co-marketing opportunities",
        "Priority support",
        "Partner certification",
        "Revenue sharing",
      ]
    },
    {
      icon: Code,
      title: "Technology Partners",
      description: "Integrate Chatvice with your platform or build on our API. Create value for mutual customers.",
      benefits: [
        "API access",
        "Technical documentation",
        "Integration support",
        "Co-development opportunities",
        "Featured listing",
      ]
    },
    {
      icon: Globe,
      title: "Reseller Partners",
      description: "Bring Chatvice to new markets. Exclusive regional opportunities with full support.",
      benefits: [
        "Exclusive territories",
        "Localization support",
        "Training materials",
        "Sales enablement",
        "Competitive margins",
      ]
    },
  ];

  const stats = [
    { value: "50+", label: "Partners Worldwide" },
    { value: "10+", label: "Countries" },
    { value: "$1M+", label: "Partner Revenue" },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Handshake className="w-3 h-3 mr-1" />
            Partners
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Partner With Chatvice
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            Join our partner ecosystem and help businesses transform their 
            customer service with AI.
          </p>
          <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
            Become a Partner
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <p className="text-4xl font-bold text-purple-600 mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partner Programs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the program that fits your business model.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {partnerTypes.map((type, index) => (
              <Card key={index} className="p-6 flex flex-col">
                <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <type.icon className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">{type.title}</h3>
                <p className="text-muted-foreground mb-6 flex-1">{type.description}</p>
                <ul className="space-y-2 mb-6">
                  {type.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Apply Now
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <Award className="w-16 h-16 mx-auto text-purple-600 mb-6" />
            <h2 className="text-2xl font-bold mb-4">Partner Certification</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Get certified in Chatvice and LEXA1. Our certification program 
              validates your expertise and gives you access to exclusive partner resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Get Certified
              </Button>
              <Button variant="outline">
                Learn More
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Partner?
          </h2>
          <p className="text-purple-100 mb-8">
            Contact our partnerships team to discuss opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                Contact Partnerships
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
