// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest';
import { preparePromoFile, uploadPromo } from './promo-upload';
const mp4 = new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,109,112,52,50,0,0,0,0]);
afterEach(() => vi.unstubAllGlobals());
describe('promo uploads', () => {
  it.each(['video/mp4', 'video/quicktime', 'application/octet-stream', ''])('sends MP4 with MIME %s for server normalization', async type => {
    const prepared = await preparePromoFile(new File([mp4], 'promo.MP4', {type}));
    expect(prepared.type).toBe(type);
    expect(new Uint8Array(await prepared.arrayBuffer())).toEqual(mp4);
  });
  it.each(['mov','webm','mkv','avi','wmv','flv','mpg','mts','3gp','ogv'])('accepts .%s for server decoding instead of demanding MP4 first', async ext => {
    const file = new File(['video fixture'], `promo.${ext}`, {type:'application/octet-stream'});
    expect(await preparePromoFile(file)).toBe(file);
  });
  it('rejects empty files, non-media types, and excessive source sizes', async () => {
    await expect(preparePromoFile(new File([], 'promo.mov'))).rejects.toThrow(/non-empty/);
    await expect(preparePromoFile(new File(['x'], 'document.pdf',{type:'application/pdf'}))).rejects.toThrow(/Choose a video/);
    await expect(preparePromoFile(new File([new Uint8Array(50*1024*1024+1)], 'promo.mov'))).rejects.toThrow(/50 MB/);
    await expect(preparePromoFile(new File([new Uint8Array(5*1024*1024+1)], 'promo.png', {type:'image/png'}))).rejects.toThrow(/5 MB/);
  });
  it('retains existing image support', async () => {
    const file = new File(['image fixture'], 'promo.webp', {type:'image/webp'});
    expect(await preparePromoFile(file)).toBe(file);
  });
  function mockUpload() {
    const xhr = {open:vi.fn(),send:vi.fn(),upload:{} as any, status:200,responseText:'{"url":"/storage/promo.mp4"}',onload:()=>{},onerror:()=>{},ontimeout:()=>{},onabort:()=>{},withCredentials:false,timeout:0};
    vi.stubGlobal('XMLHttpRequest',function(){return xhr;});
    return xhr;
  }
  it('reports actual transferred bytes and waits for a successful server URL', async () => {
    const xhr=mockUpload(), progress=vi.fn();
    const result=uploadPromo(new Blob([mp4]),'promo.mp4',progress);
    xhr.upload.onprogress({lengthComputable:true,loaded:12,total:24});
    expect(progress).toHaveBeenCalledWith(50);
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/upload/promo');
    expect((xhr.send.mock.calls[0][0] as FormData).get('type')).toBe('welcome_bubble_promo');
    xhr.onload();
    await expect(result).resolves.toBe('/storage/promo.mp4');
  });
  it.each(['onerror','ontimeout','onabort','onload'] as const)('rejects upload failures from %s', async event => {
    const xhr=mockUpload();xhr.status=400;xhr.responseText='{"error":"Invalid file type"}';
    const result=uploadPromo(new Blob([mp4]),'promo.mp4',vi.fn());
    xhr[event]();
    await expect(result).rejects.toThrow();
  });
});
