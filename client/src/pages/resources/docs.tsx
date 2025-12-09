import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  ArrowRight,
  Rocket,
  Code,
  MessageCircle,
  Users,
  Shield,
  Brain,
  Clock,
} from "lucide-react";
import PublicPageLayout from "../public-layout";
import { docArticles, docCategories, getDocArticlesByCategory } from "./docs-data";

const iconMap: Record<string, any> = {
  Rocket,
  Brain,
  MessageCircle,
  Users,
  Code,
  Shield,
};

export default function DocsPage() {
  const popularArticles = [
    { slug: "creating-your-account", title: "Quick Start Guide", category: "Getting Started", views: "5.2k" },
    { slug: "widget-customization", title: "Widget Customization", category: "Chat Widget", views: "3.8k" },
    { slug: "building-knowledge-base", title: "Building Knowledge Base", category: "AI & Knowledge Base", views: "2.9k" },
    { slug: "api-authentication", title: "API Authentication", category: "API Reference", views: "2.4k" },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <BookOpen className="w-3 h-3 mr-1" />
            Documentation
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How can we help?
          </h1>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <Input
              placeholder="Search documentation..."
              className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus-visible:ring-white"
              data-testid="input-docs-search"
            />
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold mb-4">Popular Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularArticles.map((article, index) => (
              <Link key={index} href={`/docs/${article.slug}`}>
                <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid={`card-popular-article-${index}`}>
                  <Badge variant="secondary" className="mb-2 text-xs">{article.category}</Badge>
                  <h3 className="font-medium mb-1">{article.title}</h3>
                  <p className="text-xs text-muted-foreground">{article.views} views</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docCategories.map((category, index) => {
              const IconComponent = iconMap[category.icon] || BookOpen;
              const categoryArticles = getDocArticlesByCategory(category.slug);
              
              return (
                <Card key={index} className="p-6 hover-elevate" data-testid={`card-category-${category.slug}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <IconComponent className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{categoryArticles.length} articles</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {categoryArticles.slice(0, 5).map((article, i) => (
                      <li key={i}>
                        <Link 
                          href={`/docs/${article.slug}`}
                          className="text-sm text-muted-foreground hover:text-purple-600 flex items-center gap-2 group"
                        >
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="flex-1 truncate">{article.title}</span>
                          <span className="text-xs opacity-60 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.readTime}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {categoryArticles.length > 5 && (
                    <Button variant="ghost" className="px-0 mt-4 text-purple-600 hover:text-purple-700 hover:bg-transparent">
                      View all {categoryArticles.length} articles
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-6">All Documentation Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docArticles.map((article, index) => {
              const IconComponent = iconMap[article.icon] || BookOpen;
              return (
                <Link key={article.slug} href={`/docs/${article.slug}`}>
                  <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid={`card-article-${article.slug}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge variant="secondary" className="mb-1 text-xs">{article.category}</Badge>
                        <h3 className="font-medium text-sm truncate">{article.title}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{article.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </span>
                      <span className="text-purple-600 flex items-center gap-1">
                        Read more <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-purple-100 mb-6">
            Our support team is here to help. Contact us at{" "}
            <a href="mailto:hello@chatvice.app" className="underline font-semibold">
              hello@chatvice.app
            </a>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              <Link href="/contact">Contact Support</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/faq">View FAQ</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
