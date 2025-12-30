import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import type { ChatSecuritySettings, InsertChatSecurityAlert } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface SecurityAnalysisResult {
  isSuspicious: boolean;
  alertType?: "financial_fraud" | "data_theft" | "external_contact" | "inappropriate" | "custom";
  severity?: "low" | "medium" | "high" | "critical";
  title?: string;
  description?: string;
  confidence?: number;
}

interface SecuritySettingsConfig {
  isEnabled: boolean | null;
  sensitivity: number | null;
  alertEmailEnabled: boolean | null;
  alertEmails: string[] | null;
  customPatterns: string[] | null;
  monitorFinancialFraud: boolean | null;
  monitorDataTheft: boolean | null;
  monitorExternalContact: boolean | null;
  monitorInappropriate: boolean | null;
  tolerateJokes: boolean | null;
  tolerateOffTopic: boolean | null;
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettingsConfig = {
  isEnabled: true,
  sensitivity: 50,
  alertEmailEnabled: true,
  alertEmails: [],
  customPatterns: [],
  monitorFinancialFraud: true,
  monitorDataTheft: true,
  monitorExternalContact: true,
  monitorInappropriate: true,
  tolerateJokes: true,
  tolerateOffTopic: true,
};

export async function analyzeMessageForSecurity(
  message: string,
  sessionId: string,
  supervisorId: string,
  merchantId: string,
  conversationContext?: string
): Promise<void> {
  try {
    const savedSettings = await storage.getChatSecuritySettings(merchantId);
    const settings = savedSettings || DEFAULT_SECURITY_SETTINGS;
    
    if (settings.isEnabled === false) {
      return;
    }

    const customPatterns = (settings.customPatterns as string[]) || [];
    
    let matchedCustomPattern: string | null = null;
    for (const pattern of customPatterns) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        matchedCustomPattern = pattern;
        break;
      }
    }

    const analysisPrompt = buildAnalysisPrompt(message, settings, matchedCustomPattern, conversationContext);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    let analysisResult: SecurityAnalysisResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = { isSuspicious: false };
      }
    } catch {
      analysisResult = { isSuspicious: false };
    }

    if (analysisResult.isSuspicious) {
      const sensitivity = settings.sensitivity ?? 50;
      const confidence = analysisResult.confidence ?? 50;
      
      if (confidence >= (100 - sensitivity)) {
        const alertData: InsertChatSecurityAlert = {
          merchantId,
          sessionId,
          supervisorId,
          alertType: analysisResult.alertType || "custom",
          severity: analysisResult.severity || "medium",
          title: analysisResult.title || "Suspicious message detected",
          description: analysisResult.description || "The message may contain suspicious content",
          suspiciousMessage: message,
          conversationContext: conversationContext || null,
          aiAnalysis: responseText,
          confidenceScore: confidence,
          status: "new",
        };

        await storage.createChatSecurityAlert(alertData);
        
        if (settings.alertEmailEnabled && settings.alertEmails?.length) {
          await sendSecurityAlertEmail(alertData, settings.alertEmails as string[]);
        }
      }
    }
  } catch (error) {
    console.error("Error analyzing message for security:", error);
  }
}

function buildAnalysisPrompt(
  message: string,
  settings: SecuritySettingsConfig,
  matchedCustomPattern: string | null,
  conversationContext?: string
): string {
  const categories: string[] = [];
  
  if (settings.monitorFinancialFraud) {
    categories.push(`- FINANCIAL FRAUD: Requests for payments to personal accounts, sharing personal bank details, unauthorized payment channels, requests for money transfers`);
  }
  if (settings.monitorDataTheft) {
    categories.push(`- DATA THEFT: Requests for passwords, login credentials, personal ID numbers (KTP, NIK), credit card numbers, sensitive personal data`);
  }
  if (settings.monitorExternalContact) {
    categories.push(`- EXTERNAL CONTACT: Attempts to move conversation to personal WhatsApp, personal email, personal phone number, social media accounts, or any channel outside the official support system`);
  }
  if (settings.monitorInappropriate) {
    categories.push(`- INAPPROPRIATE CONTENT: Offensive language, harassment, threats, unprofessional behavior, sexual content, discriminatory remarks`);
  }

  const toleranceNotes: string[] = [];
  if (settings.tolerateJokes) {
    toleranceNotes.push("- Friendly jokes and casual banter between supervisor and customer are ACCEPTABLE and should NOT be flagged");
  }
  if (settings.tolerateOffTopic) {
    toleranceNotes.push("- Minor off-topic conversations for rapport building are ACCEPTABLE and should NOT be flagged");
  }

  let customPatternNote = "";
  if (matchedCustomPattern) {
    customPatternNote = `
IMPORTANT: This message contains a custom pattern "${matchedCustomPattern}" that the merchant specifically wants to monitor. Please analyze if this pattern indicates a security concern.`;
  }

  return `You are a security analyst reviewing customer support conversations. Analyze the following message from a SUPERVISOR (support agent) to a CUSTOMER.

CATEGORIES TO CHECK:
${categories.join("\n")}

TOLERANCE SETTINGS:
${toleranceNotes.length > 0 ? toleranceNotes.join("\n") : "- Standard professional communication expected"}
${customPatternNote}

${conversationContext ? `CONVERSATION CONTEXT (previous messages):
${conversationContext}

` : ""}MESSAGE TO ANALYZE:
"${message}"

Respond with a JSON object in this exact format:
{
  "isSuspicious": true/false,
  "alertType": "financial_fraud" | "data_theft" | "external_contact" | "inappropriate" | "custom" (only if suspicious),
  "severity": "low" | "medium" | "high" | "critical" (only if suspicious),
  "title": "Brief title of the issue" (only if suspicious),
  "description": "Detailed explanation of why this is suspicious" (only if suspicious),
  "confidence": 0-100 (confidence level in your assessment)
}

IMPORTANT GUIDELINES:
- Only flag truly suspicious behavior that could harm the customer or company
- Consider the context and intent behind the message
- False positives damage trust, so be conservative unless clearly suspicious
- Severity levels:
  - low: Minor concern, might need review
  - medium: Clear violation of policy
  - high: Potential harm to customer
  - critical: Immediate action required (fraud attempt, clear data theft)

Respond ONLY with the JSON object, no additional text.`;
}

async function sendSecurityAlertEmail(alert: InsertChatSecurityAlert, emails: string[]): Promise<void> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.log("Resend API key not configured, skipping email notification");
      return;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    const severityColors: Record<string, string> = {
      low: "#3b82f6",
      medium: "#eab308",
      high: "#f97316",
      critical: "#ef4444",
    };

    const severityColor = severityColors[alert.severity || "medium"];

    await resend.emails.send({
      from: "Chatvice Security <security@chatvice.app>",
      to: emails,
      subject: `[${(alert.severity || "medium").toUpperCase()}] Security Alert: ${alert.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Security Alert</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Severity: ${(alert.severity || "medium").toUpperCase()}</p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0;">${alert.title}</h2>
            <p style="color: #4b5563;">${alert.description}</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 15px 0;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">Flagged Message:</p>
              <p style="color: #111827; margin: 0; font-style: italic;">"${alert.suspiciousMessage}"</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Alert Type:</strong> ${alert.alertType?.replace(/_/g, " ")}<br>
              <strong>Confidence Score:</strong> ${alert.confidenceScore}%
            </p>
            
            <a href="https://chatvice.app/dashboard/chat-security" style="display: inline-block; background-color: #6b5dfc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
              View in Dashboard
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending security alert email:", error);
  }
}
