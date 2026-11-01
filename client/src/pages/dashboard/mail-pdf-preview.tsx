import {useEffect,useRef,useState} from "react";
import {getDocument,GlobalWorkerOptions,type PDFDocumentProxy} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {ChevronLeft,ChevronRight} from "lucide-react";
GlobalWorkerOptions.workerSrc=workerUrl;
/** Canvas only: no PDF scripts, forms, hyperlinks, remote viewers or HTML layers. */
export default function MailPdfPreview({bytes}:{bytes:Uint8Array}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[error,setError]=useState("");
 useEffect(()=>{
  let active=true;setDoc(null);setPage(1);setError("");
  const task=getDocument({data:bytes.slice(),isEvalSupported:false,disableFontFace:true,useSystemFonts:true,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,maxImageSize:16_000_000});
  task.onPassword=()=>{if(active)setError("This PDF needs a password. Download it to open securely.");void task.destroy();};
  task.promise.then(pdf=>{if(active)setDoc(pdf);}).catch(()=>{if(active)setError("PDF preview unavailable. Download the file to open it.");});
  return()=>{active=false;void task.destroy();};
 },[bytes]);
 useEffect(()=>{
  if(!doc)return;
  let active=true,render:ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>|undefined;
  doc.getPage(page).then(p=>{
   if(!active||!canvas.current)return;
   const viewport=p.getViewport({scale:1});
   const scaled=p.getViewport({scale:Math.min(1.7,900/Math.max(viewport.width,viewport.height))});
   const target=canvas.current,context=target.getContext("2d");if(!context)return;
   target.width=scaled.width;target.height=scaled.height;
   render=p.render({canvas:target,canvasContext:context,viewport:scaled});
   return render.promise;
  }).catch(()=>{if(active)setError("This page could not be previewed. You can still download the file.");});
  return()=>{active=false;render?.cancel();};
 },[doc,page]);
 return <div className="mail-pdf-preview">{error?<p role="status">{error}</p>:<>{!doc&&<p role="status">Rendering PDF…</p>}<canvas ref={canvas} aria-label={`PDF page ${page}`}/>{doc&&<div className="mail-pdf-pages"><button className="mail-icon-btn" aria-label="Previous PDF page" disabled={page===1} onClick={()=>setPage(n=>n-1)}><ChevronLeft size={16}/></button><span>Page {page} / {doc.numPages}</span><button className="mail-icon-btn" aria-label="Next PDF page" disabled={page===doc.numPages} onClick={()=>setPage(n=>n+1)}><ChevronRight size={16}/></button></div>}</>}</div>;
}
