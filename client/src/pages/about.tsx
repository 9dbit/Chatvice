import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Target,
  Heart,
  Users,
  Globe,
  Rocket,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";
import PublicPageLayout from "./public-layout";

export default function AboutPage() {
  const values = [
    {
      icon: Brain,
      title: "Innovation First",
      description: "We push the boundaries of AI to create solutions that truly help businesses succeed."
    },
    {
      icon: Heart,
      title: "Customer Obsessed",
      description: "Every feature we build starts with understanding our customers' needs."
    },
    {
      icon: Users,
      title: "Human-Centric AI",
      description: "We believe AI should enhance human capabilities, not replace human connection."
    },
    {
      icon: Globe,
      title: "Locally Global",
      description: "Built for Indonesian businesses with a vision to serve customers worldwide."
    },
  ];

  const timeline = [
    {
      date: "August 2025",
      title: "Chatvice Founded",
      description: "Started with a mission to democratize AI customer service for Indonesian businesses."
    },
    {
      date: "September 2025",
      title: "Platform Development",
      description: "Built core platform with multi-tenant architecture and real-time capabilities."
    },
    {
      date: "October 2025",
      title: "LEXA1 AI Engine",
      description: "Developed our proprietary AI engine with semantic search and context awareness."
    },
    {
      date: "November 2025",
      title: "Payment Integration",
      description: "Integrated 1-Pay for seamless Indonesian payment processing."
    },
    {
      date: "December 2025",
      title: "Official Launch",
      description: "LEXA1 and Chatvice platform launched to the public."
    },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <Heart className="w-3 h-3 mr-1" />
            About Us
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-left">
            Transforming Customer Service<br />with AI
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl text-left">
            We're building the future of customer engagement, powered by 
            intelligent AI that understands, helps, and connects.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                Our Mission
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Making AI Customer Service Accessible to Everyone
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                We believe every business, regardless of size, should have access to 
                world-class AI-powered customer service. Chatvice makes it possible 
                to deploy intelligent support agents in minutes, not months.
              </p>
              <p className="text-lg text-muted-foreground">
                Built specifically for Indonesian businesses but designed for global 
                scale, our platform combines cutting-edge AI with local payment 
                solutions and multi-language support.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-3xl blur-3xl" />
              <Card className="relative p-8 text-center">
                <Brain className="w-20 h-20 mx-auto text-purple-600 mb-6" />
                <h3 className="text-2xl font-bold mb-2">LEXA1</h3>
                <p className="text-muted-foreground mb-6">The AI Engine Behind Chatvice</p>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600 mb-2" />
                    <p className="font-semibold">Accuracy</p>
                    <p className="text-sm text-muted-foreground">Semantic understanding for precise responses</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Rocket className="w-6 h-6 text-purple-600 mb-2" />
                    <p className="font-semibold">Speed</p>
                    <p className="text-sm text-muted-foreground">Sub-second response times</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              The principles that guide everything we build.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="p-6 hover-elevate">
                <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <value.icon className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-left">{value.title}</h3>
                <p className="text-sm text-muted-foreground text-left">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              <Calendar className="w-3 h-3 mr-1" />
              Our Journey
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Company Timeline</h2>
          </div>

          <div className="relative">
            <div className="absolute left-4 md:left-1/2 md:-translate-x-0.5 top-0 bottom-0 w-0.5 bg-purple-200 dark:bg-purple-800/50" />
            
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div key={index} className={`relative flex gap-6 md:gap-0 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  <div className={`flex-1 hidden md:block ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                    <Card className="p-6 inline-block text-left">
                      <Badge variant="secondary" className="mb-2">{item.date}</Badge>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </Card>
                  </div>
                  
                  <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center md:-translate-x-1/2 z-10">
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                  
                  <div className="flex-1 md:hidden pl-12">
                    <Card className="p-6">
                      <Badge variant="secondary" className="mb-2">{item.date}</Badge>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </Card>
                  </div>
                  
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                <MapPin className="w-3 h-3 mr-1" />
                Location
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Based in Indonesia</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Chatvice is proudly built in Indonesia, serving businesses across 
                Southeast Asia and beyond. Our deep understanding of local markets 
                enables us to create solutions that truly work for our customers.
              </p>
              <Link href="/contact">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Get in Touch
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <Card className="p-8">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <MapPin className="w-16 h-16 text-purple-600" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-left">
            Ready to Join Our Journey?
          </h2>
          <p className="text-lg text-purple-100 mb-8 max-w-2xl text-left">
            Be part of the AI customer service revolution. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/careers">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                View Careers
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
