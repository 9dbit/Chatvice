export function isBlasterSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.startsWith('blaster.') || hostname === 'blaster.chatvice.app';
}

export function getBlasterUrl(path: string = '/'): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('chatvice.app')) {
      return `https://blaster.chatvice.app${path}`;
    }
    if (hostname.includes('replit.dev')) {
      return path;
    }
  }
  return `https://blaster.chatvice.app${path}`;
}

export function getMainAppUrl(path: string = '/'): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('chatvice.app')) {
      return `https://chatvice.app${path}`;
    }
    if (hostname.includes('replit.dev')) {
      return path;
    }
  }
  return `https://chatvice.app${path}`;
}
