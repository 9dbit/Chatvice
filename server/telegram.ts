function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send notification:', error);
      return false;
    }
    
    console.log('[Telegram] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending notification:', error);
    return false;
  }
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string,
  replyToMessageId?: number,
): Promise<number | null> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const body: any = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    };
    if (replyToMessageId) {
      body.reply_to_message_id = replyToMessageId;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send message:', error);
      return null;
    }
    
    const data = await response.json();
    return data.result?.message_id || null;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return null;
  }
}

export function generateWebhookSecret(merchantId: string): string {
  const crypto = require('crypto');
  const base = process.env.SESSION_SECRET || 'chatvice-webhook-fallback';
  return crypto.createHmac('sha256', base).update(`tg-webhook-${merchantId}`).digest('hex').substring(0, 32);
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string, secretToken?: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const body: any = { url: webhookUrl };
    if (secretToken) {
      body.secret_token = secretToken;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to set webhook:', error);
      return false;
    }
    
    const data = await response.json();
    console.log('[Telegram] Webhook set:', data.description || 'OK');
    return true;
  } catch (error) {
    console.error('[Telegram] Error setting webhook:', error);
    return false;
  }
}

export function formatChatNotification(
  customerName: string | null,
  message: string,
  sessionId: string,
  businessName?: string
): string {
  const safeName = escapeHtml(customerName || 'Customer');
  const safeMessage = escapeHtml(message.substring(0, 500));
  const safeBusiness = businessName ? `\n<b>Business:</b> ${escapeHtml(businessName)}` : '';
  
  return `<b>New Chat Message</b>${safeBusiness}

<b>From:</b> ${safeName}
<b>Message:</b> ${safeMessage}${message.length > 500 ? '...' : ''}

<i>Session: ${sessionId.substring(0, 8)}...</i>`;
}

export function formatEscalationNotification(
  customerName: string | null,
  reason: string,
  sessionId: string,
  businessName?: string,
  recentMessages?: Array<{ from: string; content: string }>,
  supervisorPanelUrl?: string,
): string {
  const safeName = escapeHtml(customerName || 'Customer');
  const safeReason = escapeHtml(reason);
  const safeBusiness = businessName ? `\n<b>Business:</b> ${escapeHtml(businessName)}` : '';
  
  let messagesBlock = '';
  if (recentMessages && recentMessages.length > 0) {
    const formatted = recentMessages.map(m => {
      const sender = m.from === 'user' || m.from === 'customer' ? safeName : escapeHtml(m.from);
      return `  ${sender}: ${escapeHtml(m.content.substring(0, 200))}`;
    }).join('\n');
    messagesBlock = `\n\n<b>Recent messages:</b>\n<pre>${formatted}</pre>`;
  }

  const panelLink = supervisorPanelUrl ? `\n<a href="${escapeHtml(supervisorPanelUrl)}">Open Supervisor Panel</a>` : '';
  
  return `<b>Chat Escalated to Human</b>${safeBusiness}

<b>Customer:</b> ${safeName}
<b>Reason:</b> ${safeReason}${messagesBlock}

<i>Session: ${sessionId.substring(0, 8)}...</i>
${panelLink}
Reply to this message to respond to the customer.`;
}

export function formatCustomerMessage(
  customerName: string | null,
  message: string,
  sessionId: string,
): string {
  const safeName = escapeHtml(customerName || 'Customer');
  const safeMessage = escapeHtml(message.substring(0, 1000));
  
  return `<b>${safeName}:</b> ${safeMessage}

<i>Session: ${sessionId.substring(0, 8)}...</i>
Reply to respond.`;
}
