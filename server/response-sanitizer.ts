const BASE64_PRESERVE_KEYS = new Set(["iconUrl", "profilePhotoUrl", "photoUrl", "prechatBannerUrl", "agentPhotoUrl"]);

export function stripBase64Photos(obj: any, preserveKeys = false): any {
  if (!obj) return obj;
  if (obj instanceof Date) return obj.toJSON();
  if (Array.isArray(obj)) return obj.map(item => stripBase64Photos(item, preserveKeys));
  if (typeof obj !== 'object') return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('data:image') && value.length > 200) {
      result[key] = (preserveKeys && BASE64_PRESERVE_KEYS.has(key)) ? value : '';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = stripBase64Photos(value, preserveKeys);
    } else {
      result[key] = value;
    }
  }
  return result;
}

