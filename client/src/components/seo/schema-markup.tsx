import { useEffect } from "react";

interface SchemaMarkupProps {
  id: string;
  schema: Record<string, unknown>;
}

export function SchemaMarkup({ id, schema }: SchemaMarkupProps) {
  useEffect(() => {
    const scriptId = `schema-${id}`;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
    return () => {
      const toRemove = document.getElementById(scriptId);
      if (toRemove) toRemove.remove();
    };
  }, [id, schema]);

  return null;
}
