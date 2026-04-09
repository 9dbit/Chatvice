import { useState } from "react";
import { Globe, Loader2, Check, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/lib/i18n";

const DASHBOARD_LANGS: { code: Language; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "id", label: "ID", name: "Bahasa Indonesia" },
];

function useLanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
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

  return { language, t, pendingLang, isLoading, handleLangSwitch, handleConfirm, handleCancel, confirmDesc };
}

export function HeaderLanguageSwitcher() {
  const { language, t, pendingLang, isLoading, handleLangSwitch, handleConfirm, handleCancel, confirmDesc } = useLanguageSwitcher();

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-xs font-semibold px-2"
            data-testid="button-header-lang-switcher"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language.toUpperCase()}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {DASHBOARD_LANGS.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLangSwitch(lang.code)}
              className="flex items-center justify-between"
              data-testid={`menu-lang-${lang.code}`}
            >
              <span>{lang.name}</span>
              {language === lang.code && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
