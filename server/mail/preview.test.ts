import test from 'node:test';
import assert from 'node:assert/strict';
import {mailPreviewType} from '../../shared/mail-preview';
test('preview embeds only known binary signatures; active HTML/SVG and renamed Office files stay inert',()=>{
 const b=(s:string)=>new TextEncoder().encode(s);
 assert.equal(mailPreviewType(b('<svg onload="alert(1)"></svg>'),'photo.png'),null);
 assert.equal(mailPreviewType(b('<html><script>alert(1)</script></html>'),'video.mp4'),null);
 assert.equal(mailPreviewType(b('PK\u0003\u0004some zip bytes'),'office.docx'),null);
 assert.equal(mailPreviewType(new Uint8Array([137,80,78,71,13,10,26,10]),'image.png'),'image/png');
 assert.equal(mailPreviewType(b('%PDF-1.7'),'file.pdf'),'application/pdf');
 assert.equal(mailPreviewType(b('<script>literal text, not markup</script>'),'notes.txt'),'text/plain');
 assert.equal(mailPreviewType(b('RIFF0000WEBP'),'image.webp'),'image/webp');
 assert.equal(mailPreviewType(b('0000ftypisom'),'movie.mp4'),'video/mp4');
 assert.equal(mailPreviewType(b('0000ftypheic'),'photo.heic'),null);
});
