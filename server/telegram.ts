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
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!botToken || botToken.trim() === '') {
      console.error('[Telegram] Bot token is empty');
      return { success: false, error: 'Bot token is required' };
    }
    if (!chatId || chatId.trim() === '') {
      console.error('[Telegram] Chat ID is empty');
      return { success: false, error: 'Chat ID is required' };
    }
    
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    console.log('[Telegram] Sending to chat ID:', cleanChatId);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    const responseData = await response.json();
    
    if (!response.ok || !responseData.ok) {
      const errorDesc = responseData.description || 'Unknown error';
      console.error('[Telegram] Failed to send notification:', JSON.stringify(responseData));
      return { success: false, error: errorDesc };
    }
    
    console.log('[Telegram] Notification sent successfully');
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Telegram] Error sending notification:', errorMsg);
    return { success: false, error: errorMsg };
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
