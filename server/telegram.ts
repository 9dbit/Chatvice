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
  businessName?: string
): string {
  const safeName = escapeHtml(customerName || 'Customer');
  const safeReason = escapeHtml(reason);
  const safeBusiness = businessName ? `\n<b>Business:</b> ${escapeHtml(businessName)}` : '';
  
  return `<b>Chat Escalated to Human</b>${safeBusiness}

<b>Customer:</b> ${safeName}
<b>Reason:</b> ${safeReason}

<i>Session: ${sessionId.substring(0, 8)}...</i>

Please respond in the supervisor panel.`;
}
