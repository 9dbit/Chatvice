// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest';
import { preparePromoFile, uploadPromo } from './promo-upload';
const mp4 = new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,109,112,52,50,0,0,0,0]);
afterEach(() => vi.unstubAllGlobals());
describe('promo uploads', () => {
  it.each(['video/mp4', 'video/quicktime', 'application/octet-stream', ''])('normalizes a real MP4 with MIME %s', async type => {
    const prepared = await preparePromoFile(new File([mp4], 'promo.MP4', {type}));
    expect(prepared.type).toBe('video/mp4');
    expect(new Uint8Array(await prepared.arrayBuffer())).toEqual(mp4);
  });
  it('rejects renamed unsupported data and oversized files', async () => {
    await expect(preparePromoFile(new File(['not a video'], 'promo.mp4'))).rejects.toThrow(/not a supported MP4/);
    await expect(preparePromoFile(new File(['x'], 'promo.mov',{type:'video/quicktime'}))).rejects.toThrow(/Use PNG/);
    await expect(preparePromoFile(new File([new Uint8Array(5*1024*1024+1)], 'promo.mp4'))).rejects.toThrow(/5 MB/);
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
