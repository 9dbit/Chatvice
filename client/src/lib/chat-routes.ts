export function isChatSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.startsWith('chat.') || hostname === 'chat.chatvice.app';
}

export function getChatPath(path: string): string {
  if (isChatSubdomain()) {
    return path.startsWith('/chat') ? path.replace('/chat', '') || '/' : path;
  }
  return path.startsWith('/chat') ? path : `/chat${path}`;
}

export const chatRoutes = {
  login: () => getChatPath('/chat/login'),
  verify: (phone: string, method: string) => 
    `${getChatPath('/chat/verify')}?phone=${encodeURIComponent(phone)}&method=${method}`,
  register: () => getChatPath('/chat/register'),
  inbox: () => getChatPath('/chat/inbox'),
  stores: () => getChatPath('/chat/stores'),
  store: (merchantId: string) => getChatPath(`/chat/store/${merchantId}`),
  storeInfo: (merchantId: string) => getChatPath(`/chat/store/${merchantId}/info`),
  contacts: () => getChatPath('/chat/contacts'),
  settings: () => getChatPath('/chat/settings'),
  personalNew: (contactId: string) => getChatPath(`/chat/personal/new/${contactId}`),
  personal: (chatId: string) => getChatPath(`/chat/personal/${chatId}`),
};
