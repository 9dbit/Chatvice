import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Heart,
  Zap,
  Users,
  Globe,
  Coffee,
  Laptop,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function CareersPage() {
  const benefits = [
    { icon: Laptop, title: "Remote First", description: "Work from anywhere in the world" },
    { icon: Clock, title: "Flexible Hours", description: "We trust you to manage your time" },
    { icon: Heart, title: "Health Benefits", description: "Comprehensive health coverage" },
    { icon: Zap, title: "Learning Budget", description: "Annual budget for courses and conferences" },
    { icon: Coffee, title: "Team Events", description: "Regular virtual and in-person meetups" },
    { icon: Globe, title: "Global Team", description: "Diverse, international colleagues" },
  ];

  const openings = [
    {
      title: "Senior Full Stack Developer",
      department: "Engineering",
      location: "Remote (Indonesia preferred)",
      type: "Full-time",
      description: "Build and scale our AI-powered customer service platform using TypeScript, React, and Node.js."
    },
    {
      title: "Machine Learning Engineer",
      department: "AI/ML",
      location: "Remote",
      type: "Full-time",
      description: "Improve LEXA1 AI engine with advanced NLP techniques and vector embeddings."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Design beautiful, intuitive experiences for our dashboard and chat widget."
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Jakarta, Indonesia",
      type: "Full-time",
      description: "Help our Indonesian customers succeed with Chatvice and LEXA1."
    },
    {
      title: "Technical Writer",
      department: "Documentation",
      location: "Remote",
      type: "Part-time",
      description: "Create clear, helpful documentation and tutorials for our platform."
    },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Briefcase className="w-3 h-3 mr-1" />
            Careers
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Join the Team Building<br />the Future of Customer Service
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            We're looking for passionate people to help us transform how businesses 
            connect with their customers through AI.
          </p>
          <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
            <a href="#openings">
              View Open Positions
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Chatvice?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We offer a supportive environment where you can do your best work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 text-center hover-elevate">
                <div className="w-14 h-14 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <benefit.icon className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Culture</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  At Chatvice, we believe in building products that truly help people. 
                  We're a small, focused team that moves fast and ships regularly.
                </p>
                <p>
                  We value ownership, transparency, and continuous learning. Every team 
                  member has a direct impact on our product and our customers.
                </p>
                <p>
                  We're remote-first with a strong presence in Indonesia, and we 
                  celebrate our diverse, global team.
                </p>
              </div>
            </div>
            <Card className="p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">10+</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-sm text-muted-foreground">Countries</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-sm text-muted-foreground">Remote</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="openings" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Open Positions</h2>
            <p className="text-muted-foreground">
              Join us in building something amazing.
            </p>
          </div>

          <div className="space-y-4">
            {openings.map((job, index) => (
              <Card key={index} className="p-6 hover-elevate">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <Badge variant="secondary">{job.department}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <Button asChild className="bg-purple-600 hover:bg-purple-700">
                    <a href={`mailto:hello@chatvice.app?subject=Job Application: ${job.title}`}>
                      Apply Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-8 bg-muted/50 rounded-xl text-center">
            <h3 className="font-semibold mb-2">Don't see a perfect fit?</h3>
            <p className="text-muted-foreground mb-4">
              We're always looking for talented people. Send us your resume at{" "}
              <a href="mailto:hello@chatvice.app" className="text-purple-600 hover:underline font-medium">
                hello@chatvice.app
              </a>
            </p>
            <Button asChild variant="outline">
              <a href="mailto:hello@chatvice.app?subject=General Application - Chatvice">
                Send General Application
              </a>
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
