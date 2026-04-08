import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/lib/i18n";

const DASHBOARD_LANGS: { code: Language; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "id", label: "ID", name: "Bahasa Indonesia" },
];

export function DashboardLanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [pendingLang, setPendingLang] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleLangSwitch(lang: Language) {
    if (lang === language) return;
    setPendingLang(lang);
  }

  function handleConfirm() {
    if (!pendingLang) return;
    const confirmed = pendingLang;
    setPendingLang(null);
    setIsLoading(true);
    setTimeout(() => {
      setLanguage(confirmed);
      setIsLoading(false);
    }, 350);
  }

  function handleCancel() {
    setPendingLang(null);
  }

  const pendingName = DASHBOARD_LANGS.find((l) => l.code === pendingLang)?.name ?? "";
  const confirmDesc = t("dashboard.languageSwitcher.confirmDesc").replace("{{lang}}", pendingName);

  if (isCollapsed) {
    return (
      <>
        {isLoading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => {
                const next = language === "en" ? "id" : "en";
                handleLangSwitch(next);
              }}
              data-testid="button-lang-switcher-collapsed"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t("dashboard.languageSwitcher.label")} ({language.toUpperCase()})
          </TooltipContent>
        </Tooltip>
        <AlertDialog open={pendingLang !== null} onOpenChange={(open) => { if (!open) handleCancel(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dashboard.languageSwitcher.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>{t("dashboard.languageSwitcher.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>{t("dashboard.languageSwitcher.confirm")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-0.5" data-testid="dashboard-lang-switcher">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          <span>{t("dashboard.languageSwitcher.label")}</span>
        </div>
        <div className="flex items-center gap-1">
          {DASHBOARD_LANGS.map((lang) => (
            <Button
              key={lang.code}
              variant={language === lang.code ? "default" : "ghost"}
              size="sm"
              className="text-xs font-semibold"
              onClick={() => handleLangSwitch(lang.code)}
              data-testid={`button-lang-${lang.code}`}
            >
              {lang.label}
            </Button>
          ))}
        </div>
      </div>

      <AlertDialog open={pendingLang !== null} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.languageSwitcher.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>{t("dashboard.languageSwitcher.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{t("dashboard.languageSwitcher.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
