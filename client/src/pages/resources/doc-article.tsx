import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  ChevronRight,
  Rocket,
  Brain,
  MessageCircle,
  Users,
  Code,
  Shield,
} from "lucide-react";
import PublicPageLayout from "../public-layout";
import { getDocArticleBySlug, docArticles, docCategories } from "./docs-data";

const iconMap: Record<string, any> = {
  Rocket,
  Brain,
  MessageCircle,
  Users,
  Code,
  Shield,
};

export default function DocArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const article = getDocArticleBySlug(slug);

  if (!article) {
    return (
      <PublicPageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-bold mb-2">Article Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The documentation article you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link href="/docs">Back to Documentation</Link>
            </Button>
          </Card>
        </div>
      </PublicPageLayout>
    );
  }

  const IconComponent = iconMap[article.icon] || BookOpen;
  const relatedArticles = docArticles
    .filter(a => a.categorySlug === article.categorySlug && a.slug !== article.slug)
    .slice(0, 3);

  return (
    <PublicPageLayout>
      <div className="bg-muted/30 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/docs?category=${article.categorySlug}`} className="hover:text-foreground transition-colors">
              {article.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground truncate">{article.title}</span>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-purple-600" />
            </div>
            <Badge variant="secondary">{article.category}</Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-doc-title">
            {article.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {article.description}
          </p>
        </header>

        <div 
          className="prose prose-purple dark:prose-invert max-w-none
            prose-headings:font-semibold prose-headings:text-foreground
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-li:text-muted-foreground
            prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-pre:bg-muted prose-pre:text-foreground
            prose-code:text-purple-600 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: article.content }}
          data-testid="content-doc-article"
        />

        <footer className="mt-12 pt-8 border-t">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
            <Button asChild variant="outline">
              <Link href="/docs">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Documentation
              </Link>
            </Button>
            <div className="text-sm text-muted-foreground">
              Need help? <a href="mailto:hello@chatvice.app" className="text-purple-600 hover:underline">Contact support</a>
            </div>
          </div>
        </footer>
      </article>

      {relatedArticles.length > 0 && (
        <section className="bg-muted/30 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedArticles.map((related) => {
                const RelatedIcon = iconMap[related.icon] || BookOpen;
                return (
                  <Link key={related.slug} href={`/docs/${related.slug}`}>
                    <Card className="p-4 hover-elevate cursor-pointer h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <RelatedIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-muted-foreground">{related.readTime}</span>
                      </div>
                      <h3 className="font-medium text-sm">{related.title}</h3>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-purple-100 mb-6">
            Create your free Chatvice account and start building your AI customer service today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
