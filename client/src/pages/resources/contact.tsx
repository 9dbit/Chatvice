import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import PublicPageLayout from "../public-layout";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: "Message Sent",
      description: "We'll get back to you as soon as possible.",
    });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "For general inquiries and support",
      contact: "hello@chatvice.app",
      action: "mailto:hello@chatvice.app"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our AI assistant or team",
      contact: "Available 24/7",
      action: "#"
    },
    {
      icon: Clock,
      title: "Response Time",
      description: "Business hours: Mon-Fri, 9AM-6PM WIB",
      contact: "Within 24 hours",
      action: null
    },
  ];

  return (
    <PublicPageLayout
      title="Contact Us - Get in Touch | Chatvice"
      description="Have questions about Chatvice? Contact our team via email, live chat, or phone. We respond within 24 hours on business days."
    >
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Mail className="w-3 h-3 mr-1" />
            Contact
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and 
            we'll respond as soon as possible.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {contactMethods.map((method, index) => (
              <Card key={index} className="p-6 text-center hover-elevate">
                <div className="w-14 h-14 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <method.icon className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1">{method.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                {method.action ? (
                  <a href={method.action} className="text-purple-600 font-medium hover:underline">
                    {method.contact}
                  </a>
                ) : (
                  <p className="text-purple-600 font-medium">{method.contact}</p>
                )}
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              
              {submitted ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                  <p className="text-muted-foreground mb-6">
                    We've received your message and will get back to you within 24 hours.
                  </p>
                  <Button onClick={() => setSubmitted(false)} variant="outline">
                    Send Another Message
                  </Button>
                </Card>
              ) : (
                <Card className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="Your name" required data-testid="input-contact-name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="your@email.com" required data-testid="input-contact-email" />
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" placeholder="Company name" data-testid="input-contact-company" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select>
                          <SelectTrigger data-testid="select-contact-subject">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="support">Technical Support</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="press">Press/Media</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us how we can help..."
                        rows={5}
                        required
                        data-testid="textarea-contact-message"
                      />
                    </div>
                    
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-contact-submit">
                      Send Message
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </Card>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">FAQ</h2>
              <div className="space-y-4">
                {[
                  {
                    q: "How quickly can I get started?",
                    a: "You can sign up and deploy your first AI agent in under 10 minutes. No technical skills required."
                  },
                  {
                    q: "Do you offer demos?",
                    a: "Yes! You can try our live demo on the homepage, or schedule a personalized demo with our sales team."
                  },
                  {
                    q: "What support is included?",
                    a: "All plans include email support. Professional and Enterprise plans get priority support and dedicated success managers."
                  },
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes, you can cancel your subscription at any time. Monthly plans are non-refundable, annual plans have a 30-day guarantee."
                  },
                ].map((faq, index) => (
                  <Card key={index} className="p-4">
                    <h3 className="font-semibold mb-1">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-6 mt-6 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50">
                <h3 className="font-semibold mb-2">Office Location</h3>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <p>Chatvice HQ</p>
                    <p>Jakarta, Indonesia</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
