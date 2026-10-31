import test from "node:test";
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {sealMailBackup,openMailBackup} from "../../scripts/mail-backup.mjs";
test("backup envelopes authenticate entire dump before exposing restore bytes",()=>{
  const key="a".repeat(64),dump=randomBytes(128*1024),sealed=sealMailBackup(dump,key);
  assert.deepEqual(openMailBackup(sealed,key),dump);
  assert.notDeepEqual(sealMailBackup(dump,key),sealed);
  for(const offset of [0,8,20,36,sealed.length-1]){const broken=Buffer.from(sealed);broken[offset]^=1;assert.throws(()=>openMailBackup(broken,key));}
  assert.throws(()=>openMailBackup(sealed,"b".repeat(64)));
  assert.throws(()=>sealMailBackup(dump,"short"));
});
