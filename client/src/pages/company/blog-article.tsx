import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  User,
  Share2,
  Bookmark,
  MessageSquare,
  Bot,
  Copy,
  Mail,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp, SiTelegram, SiLinkedin, SiFacebook } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import PublicPageLayout from "../public-layout";
import { blogArticles } from "./blog-data";
import { SchemaMarkup } from "@/components/seo/schema-markup";

import lexa1Image from "@assets/IMG_0322_1765176461601.jpeg";
import indonesiaAIImage from "@assets/IMG_0323_1765176461601.jpeg";
import trainingAIImage from "@assets/adwin_adhynata_A_futuristic_3D_workspace_showing_an_AI_agent_r_1765176461601.png";
import humanAIImage from "@assets/adwin_adhynata_An_editorial_style_photograph_showing_the_balan_1765176461600.png";
import multiLanguageImage from "@assets/adwin_adhynata_A_diverse_team_of_corporate_strategists_and_eng_1765176461600.png";
import comparisonImage from "@assets/adwin_adhynata_A_futuristic_digital_exhibition_stage_in_a_mass_1765176461600.png";

const blogImages: Record<string, string> = {
  "introducing-lexa1-ai-engine": lexa1Image,
  "ai-transforming-customer-service-indonesia": indonesiaAIImage,
  "best-practices-training-ai-agent": trainingAIImage,
  "human-ai-collaboration-customer-support": humanAIImage,
  "multi-language-support-strategy": multiLanguageImage,
  "chatvice-vs-livechat-zendesk-intercom": comparisonImage,
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  content: string;
  category: string;
  author: string;
  generatedAt: string | null;
  publishedAt: string | null;
  readTime?: string;
  featured: boolean;
  heroImageKey: string | null;
  tags: string[];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getHeroImage(slug: string, heroImageKey: string | null): string | null {
  if (heroImageKey && blogImages[heroImageKey]) return blogImages[heroImageKey];
  if (blogImages[slug]) return blogImages[slug];
  return null;
}

export default function BlogArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: dbPost, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts", slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/posts/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    retry: false,
  });

  const staticArticle = blogArticles.find((a) => a.slug === slug);

  const article = dbPost || (staticArticle ? {
    id: staticArticle.slug,
    slug: staticArticle.slug,
    title: staticArticle.title,
    excerpt: staticArticle.excerpt,
    metaDescription: staticArticle.metaDescription,
    content: staticArticle.content,
    category: staticArticle.category,
    author: staticArticle.author,
    generatedAt: staticArticle.date,
    publishedAt: staticArticle.date,
    readTime: staticArticle.readTime,
    featured: staticArticle.featured,
    heroImageKey: staticArticle.slug,
    tags: staticArticle.tags,
  } as BlogPost : null);

  const articleSchema = useMemo(() => {
    if (!article) return null;
    const baseUrl = "https://chatvice.app";
    const articleUrl = `${baseUrl}/blog/${slug}`;
    const datePublished = article.publishedAt || article.generatedAt || new Date().toISOString();
    const heroImg = getHeroImage(slug, article.heroImageKey);
    const absoluteHeroImg = heroImg ? `${baseUrl}${heroImg}` : null;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.metaDescription,
      "datePublished": datePublished,
      "dateModified": datePublished,
      "author": { "@type": "Person", "name": article.author },
      "publisher": {
        "@type": "Organization",
        "name": "Chatvice",
        "logo": { "@type": "ImageObject", "url": `${baseUrl}/og/home.png` }
      },
      "url": articleUrl,
      ...(absoluteHeroImg ? { "image": { "@type": "ImageObject", "url": absoluteHeroImg } } : {}),
      "mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl }
    };
  }, [slug, article]);

  const breadcrumbSchema = useMemo(() => {
    if (!article) return null;
    const baseUrl = "https://chatvice.app";
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
        { "@type": "ListItem", "position": 3, "name": article.title, "item": `${baseUrl}/blog/${slug}` }
      ]
    };
  }, [slug, article]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/blog/${slug}` : `https://chatvice.app/blog/${slug}`;
  const shareTitle = article?.title || "Chatvice Blog";
  const shareText = article?.metaDescription || "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!", description: "Article link copied to clipboard" });
      setShareOpen(false);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  type ShareOption = {
    name: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    action?: () => void;
    href?: string;
    color?: string;
  };

  const shareOptions: ShareOption[] = [
    { name: "Copy Link", icon: Copy, action: copyLink },
    { name: "WhatsApp", icon: SiWhatsapp, href: `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`, color: "#25D366" },
    { name: "Email", icon: Mail, href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}` },
    { name: "SMS", icon: MessageCircle, href: `sms:?body=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}` },
    { name: "X (Twitter)", icon: FaXTwitter, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}` },
    { name: "LinkedIn", icon: SiLinkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, color: "#0A66C2" },
    { name: "Facebook", icon: SiFacebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, color: "#1877F2" },
    { name: "Telegram", icon: SiTelegram, href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, color: "#0088CC" },
    { name: "ChatGPT", icon: ExternalLink, href: `https://chat.openai.com/?q=${encodeURIComponent(`Summarize this article: ${shareUrl}`)}`, color: "#10A37F" },
    { name: "Gemini", icon: ExternalLink, href: `https://gemini.google.com/app?q=${encodeURIComponent(`Summarize this article: ${shareUrl}`)}`, color: "#8E75B2" },
  ];

  if (isLoading) {
    return (
      <PublicPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PublicPageLayout>
    );
  }

  if (!article) {
    return (
      <PublicPageLayout>
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
            <Link href="/blog">
              <Button>Back to Blog</Button>
            </Link>
          </div>
        </section>
      </PublicPageLayout>
    );
  }

  const relatedPosts = blogArticles
    .filter((a) => a.slug !== slug && a.category === article.category)
    .slice(0, 3)
    .map((a) => ({
      id: a.slug,
      slug: a.slug,
      title: a.title,
      category: a.category,
      heroImageKey: a.slug,
    }));

  return (
    <PublicPageLayout
      title={`${article.title} | Chatvice Blog`}
      description={article.metaDescription}
    >
      {articleSchema && <SchemaMarkup id="blog-article-jsonld" schema={articleSchema} />}
      {breadcrumbSchema && <SchemaMarkup id="blog-breadcrumb-jsonld" schema={breadcrumbSchema} />}
      <article className="py-8 md:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog">
            <Button variant="ghost" className="mb-6 -ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          <header className="mb-8">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              {article.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {article.author}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(article.publishedAt || article.generatedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {article.readTime || "5 min read"}
              </span>
            </div>
            <div className="flex gap-2">
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-share">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="grid gap-1">
                    {shareOptions.map((option, idx) =>
                      option.action ? (
                        <button
                          key={idx}
                          onClick={option.action}
                          className="flex items-center gap-3 w-full px-3 py-2 text-xs rounded-md hover-elevate text-left"
                          data-testid={`button-share-${option.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <option.icon className="w-4 h-4" style={option.color ? { color: option.color } : undefined} />
                          <span>{option.name}</span>
                        </button>
                      ) : (
                        <a
                          key={idx}
                          href={option.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-xs rounded-md hover-elevate"
                          data-testid={`button-share-${option.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <option.icon className="w-4 h-4" style={option.color ? { color: option.color } : undefined} />
                          <span>{option.name}</span>
                        </a>
                      )
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" data-testid="button-save">
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </header>

          {(article.heroImageKey || blogImages[slug]) && (
            <div className="aspect-video rounded-xl mb-8 overflow-hidden">
              {getHeroImage(slug, article.heroImageKey) ? (
                <img
                  src={getHeroImage(slug, article.heroImageKey)!}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                  <Bot className="w-24 h-24 text-purple-600" />
                </div>
              )}
            </div>
          )}

          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 pt-8 border-t">
              {article.tags.map((tag, i) => (
                <Badge key={i} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 mb-12">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Ready to transform your customer service?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Start using Chatvice today and experience the power of AI-driven customer support.
                </p>
                <Link href="/register">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {relatedPosts.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden hover-elevate group h-full">
                      <div className="aspect-video overflow-hidden">
                        {getHeroImage(post.slug, post.heroImageKey) ? (
                          <img
                            src={getHeroImage(post.slug, post.heroImageKey)!}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                            <MessageSquare className="w-8 h-8 text-purple-600" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <Badge variant="secondary" className="mb-2 text-xs">{post.category}</Badge>
                        <h3 className="font-semibold text-sm group-hover:text-purple-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>

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
