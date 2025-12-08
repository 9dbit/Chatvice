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
import { blogArticles } from "./blog-data";

export default function BlogPage() {
  const categories = ["All", "Product", "Tutorial", "Industry", "Insights", "Comparison"];

  return (
    <PublicPageLayout
      title="Blog - AI Customer Service Insights | Chatvice"
      description="Stay updated with the latest news, tutorials, and insights about AI customer service. Compare Chatvice with LiveChat, Zendesk, Intercom, and more."
    >
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
            Stay updated with the latest news, tutorials, and insights about AI customer service. Learn how Chatvice compares to LiveChat, Zendesk, and Intercom.
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
                data-testid={`button-category-${cat.toLowerCase()}`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {blogArticles.filter(p => p.featured).map((post, index) => (
            <Link key={index} href={`/blog/${post.slug}`}>
              <Card className="p-8 mb-12 hover-elevate cursor-pointer" data-testid={`card-featured-${post.slug}`}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-purple-600" />
                  </div>
                  <div>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                      Featured
                    </Badge>
                    <h2 className="text-2xl font-bold mb-3" data-testid={`text-title-${post.slug}`}>{post.title}</h2>
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
                    <Button className="bg-purple-600 hover:bg-purple-700" data-testid={`button-read-${post.slug}`}>
                      Read Article
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogArticles.filter(p => !p.featured).map((post, index) => (
              <Link key={index} href={`/blog/${post.slug}`}>
                <Card className="overflow-hidden hover-elevate group cursor-pointer h-full" data-testid={`card-article-${post.slug}`}>
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-purple-600" />
                  </div>
                  <div className="p-6">
                    <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                    <h3 className="font-semibold mb-2 group-hover:text-purple-600 transition-colors" data-testid={`text-title-${post.slug}`}>
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Popular Topics</h2>
            <p className="text-muted-foreground">Explore our most read categories</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover-elevate cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">AI Chatbots</h3>
              <p className="text-sm text-muted-foreground">Compare Chatvice with Chatbase, Tidio, and more</p>
            </Card>
            <Card className="p-6 text-center hover-elevate cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Customer Service</h3>
              <p className="text-sm text-muted-foreground">Best practices for support teams</p>
            </Card>
            <Card className="p-6 text-center hover-elevate cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Industry Insights</h3>
              <p className="text-sm text-muted-foreground">Trends in Indonesia and Southeast Asia</p>
            </Card>
            <Card className="p-6 text-center hover-elevate cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Product Updates</h3>
              <p className="text-sm text-muted-foreground">New features and LEXA1 improvements</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-purple-100 mb-6">
            Get the latest articles and updates delivered to your inbox. Stay ahead of LiveChat, Zendesk, and Intercom news.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
              data-testid="input-newsletter-email"
            />
            <Button className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-subscribe">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
