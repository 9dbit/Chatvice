import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Calendar,
  ArrowRight,
  Clock,
  User,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function BlogPage() {
  const posts = [
    {
      title: "Introducing LEXA1: The AI Engine Behind Chatvice",
      excerpt: "Today we're excited to announce LEXA1, our proprietary AI engine designed specifically for customer service automation.",
      category: "Product",
      author: "Chatvice Team",
      date: "December 9, 2025",
      readTime: "5 min read",
      featured: true,
    },
    {
      title: "How AI is Transforming Customer Service in Indonesia",
      excerpt: "The Indonesian market is rapidly adopting AI solutions. Here's how businesses are leveraging chatbots for better customer experiences.",
      category: "Industry",
      author: "Chatvice Team",
      date: "December 5, 2025",
      readTime: "7 min read",
      featured: false,
    },
    {
      title: "Best Practices for Training Your AI Agent",
      excerpt: "Learn how to create an effective knowledge base that helps your AI agent provide accurate and helpful responses.",
      category: "Tutorial",
      author: "Chatvice Team",
      date: "December 1, 2025",
      readTime: "6 min read",
      featured: false,
    },
    {
      title: "The Importance of Human-AI Collaboration in Support",
      excerpt: "Why the best customer service combines AI efficiency with human empathy, and how to get the balance right.",
      category: "Insights",
      author: "Chatvice Team",
      date: "November 25, 2025",
      readTime: "8 min read",
      featured: false,
    },
    {
      title: "Building a Multi-Language Support Strategy",
      excerpt: "How to use AI to provide customer support in multiple languages without expanding your team.",
      category: "Tutorial",
      author: "Chatvice Team",
      date: "November 20, 2025",
      readTime: "5 min read",
      featured: false,
    },
    {
      title: "Payment Integration: Supporting Indonesian Businesses",
      excerpt: "We've integrated 1-Pay with QRIS support to make it easy for Indonesian businesses to subscribe and pay.",
      category: "Product",
      author: "Chatvice Team",
      date: "November 15, 2025",
      readTime: "4 min read",
      featured: false,
    },
  ];

  const categories = ["All", "Product", "Tutorial", "Industry", "Insights"];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <BookOpen className="w-3 h-3 mr-1" />
            Blog
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Insights & Updates
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            Stay updated with the latest news, tutorials, and insights about AI customer service.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={cat === "All" ? "default" : "outline"}
                className={cat === "All" ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {cat}
              </Button>
            ))}
          </div>

          {posts.filter(p => p.featured).map((post, index) => (
            <Card key={index} className="p-8 mb-12 hover-elevate">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-purple-600" />
                </div>
                <div>
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                    Featured
                  </Badge>
                  <h2 className="text-2xl font-bold mb-3">{post.title}</h2>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.readTime}
                    </span>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Read Article
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.filter(p => !p.featured).map((post, index) => (
              <Card key={index} className="overflow-hidden hover-elevate group">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-purple-600" />
                </div>
                <div className="p-6">
                  <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                  <h3 className="font-semibold mb-2 group-hover:text-purple-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Articles
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-purple-100 mb-6">
            Get the latest articles and updates delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Button className="bg-white text-purple-600 hover:bg-purple-50">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
