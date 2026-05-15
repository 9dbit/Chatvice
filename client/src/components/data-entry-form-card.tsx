import { useState } from "react";
import { FileText, Loader2, CheckCheck } from "lucide-react";

export interface DataEntryFieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | string;
  required?: boolean;
}

export interface DataEntryFormState {
  submitting: boolean;
  submitted: boolean;
  error?: string;
}

interface DataEntryFormCardProps {
  intentName: string;
  fields: DataEntryFieldDef[];
  primaryColor: string;
  isDark: boolean;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  formState: DataEntryFormState;
  onSubmit: () => void;
  previewMode?: boolean;
  onPreviewReset?: () => void;
  testIdPrefix?: string;
}

export function DataEntryFormCard({
  intentName,
  fields,
  primaryColor,
  isDark,
  values,
  onValuesChange,
  formState,
  onSubmit,
  previewMode = false,
  onPreviewReset,
  testIdPrefix = "data-entry",
}: DataEntryFormCardProps) {
  const inputStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
    color: isDark ? "rgba(255,255,255,0.9)" : "#1f2937",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "12px",
    width: "100%",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
        maxWidth: "280px",
      }}
      data-testid={`card-${testIdPrefix}-form`}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
        <span
          className="text-xs font-semibold"
          style={{ color: isDark ? "rgba(255,255,255,0.9)" : "#111827" }}
        >
          {intentName}
        </span>
      </div>

      {formState.submitted ? (
        <div className="px-3 py-4 flex flex-col items-center gap-2 text-center">
          <CheckCheck className="w-7 h-7" style={{ color: primaryColor }} />
          <p
            className="text-xs font-medium"
            style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#111827" }}
          >
            Data terkirim
          </p>
          <p
            className="text-[11px]"
            style={{ color: isDark ? "rgba(255,255,255,0.55)" : "#6b7280" }}
          >
            Sedang diproses...
          </p>
          {previewMode && onPreviewReset && (
            <button
              onClick={onPreviewReset}
              className="mt-1 text-[10px] underline"
              style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}
              data-testid={`button-${testIdPrefix}-reset`}
            >
              Reset preview
            </button>
          )}
        </div>
      ) : (
        <div className="px-3 py-3 space-y-2.5">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <label
                className="text-[10px] font-medium"
                style={{ color: isDark ? "rgba(255,255,255,0.65)" : "#4b5563" }}
              >
                {field.label || field.key}
                {field.required !== false ? " *" : ""}
              </label>
              <input
                type={field.type === "number" ? "number" : "text"}
                inputMode={field.type === "number" ? "numeric" : "text"}
                style={inputStyle}
                value={values[field.key] || ""}
                onChange={(e) =>
                  onValuesChange({ ...values, [field.key]: e.target.value })
                }
                placeholder={field.label || field.key}
                disabled={formState.submitting}
                data-testid={`input-${testIdPrefix}-${field.key}`}
              />
            </div>
          ))}

          {fields.length === 0 && previewMode && (
            <p
              className="text-[11px] text-center py-2"
              style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}
            >
              No fields configured for this intent.
            </p>
          )}

          {formState.error && (
            <p className="text-[10px] font-medium" style={{ color: "#f87171" }}>
              {formState.error}
            </p>
          )}

          <button
            onClick={onSubmit}
            disabled={formState.submitting}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold text-white transition-opacity"
            style={{ backgroundColor: primaryColor, opacity: formState.submitting ? 0.7 : 1 }}
            data-testid={`button-${testIdPrefix}-submit`}
          >
            {formState.submitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Memproses...
              </>
            ) : (
              "Kirim Data"
            )}
          </button>

          {previewMode && (
            <p
              className="text-[10px] text-center"
              style={{ color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af" }}
            >
              Preview only — no API call is made
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function useDataEntryFormCard() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<DataEntryFormState>({
    submitting: false,
    submitted: false,
  });

  const reset = () => {
    setValues({});
    setFormState({ submitting: false, submitted: false });
  };

  const submitPreview = (fields: DataEntryFieldDef[]) => {
    const missing = fields.filter(
      (f) => f.required !== false && !values[f.key]?.trim()
    );
    if (missing.length > 0) {
      const names = missing.map((f) => f.label || f.key).join(", ");
      setFormState((prev) => ({ ...prev, error: `Lengkapi: ${names}` }));
      return;
    }
    setFormState({ submitting: false, submitted: true });
  };

  return { values, setValues, formState, setFormState, reset, submitPreview };
}
