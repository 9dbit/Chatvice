import { normalizeEmail } from "./security";

type SendRequest = {
  id: string; from: string; to: string[]; cc: string[]; bcc: string[];
  subject: string; text: string; inReplyTo?: string | null;
  attachments?: { filename:string; content:string }[];
};
export class MailProviderError extends Error {
  constructor(public readonly httpStatus: number, public readonly retryable: boolean) {
    super("Mail transport failed");
  }
}
export async function sendResendMail(message: SendRequest, apiKey: string): Promise<string> {
  if (!apiKey || apiKey.length < 12) throw new MailProviderError(0,false);
  if (!normalizeEmail(message.from) || message.to.length === 0 ||
      ![...message.to,...message.cc,...message.bcc].every(a => normalizeEmail(a) === a)) {
    throw new MailProviderError(0,false);
  }
  const body: Record<string,unknown> = {
    from: message.from, to: message.to, cc: message.cc, bcc: message.bcc,
    subject: message.subject, text: message.text,
    tags: [{name:"chatvice_id",value:message.id}],
  };
  if (message.inReplyTo && /^<[^<>\r\n]{1,500}>$/.test(message.inReplyTo)) {
    body.headers = { "In-Reply-To": message.inReplyTo };
  }
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
        "Idempotency-Key": `chatvice-mail/${message.id}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch { throw new MailProviderError(0,true); }
  // Do not retain or log provider error bodies containing personal information.
  if (!response.ok) {
    const retryable = response.status===429 || response.status>=500 ||
      response.status===408 || response.status===409;
    throw new MailProviderError(response.status,retryable);
  }
  const result = await response.json() as { id?:unknown };
  if (typeof result.id !== "string" || !result.id) throw new MailProviderError(0,true);
  return result.id;
}
export async function fetchResendReceived(id: string, apiKey: string): Promise<unknown> {
  if (!/^[a-z0-9_-]{8,128}$/i.test(id) || !apiKey || apiKey.length < 12) throw new MailProviderError(0,false);
  let response: Response;
  try {
    response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
  } catch { throw new MailProviderError(0,true); }
  if (!response.ok) throw new MailProviderError(response.status,response.status>=500 || response.status===429);
  return response.json();
}
