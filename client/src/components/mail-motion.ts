import {useEffect,useRef,useState} from "react";

export function useDesktopMail(){
 const [desktop,setDesktop]=useState(()=>window.matchMedia("(min-width: 901px)").matches);
 useEffect(()=>{const query=window.matchMedia("(min-width: 901px)"),update=()=>setDesktop(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
 return desktop;
}

/** Event-driven decorative depth only; no scroll interception or perpetual loop. */
export function useMailParallax<T extends HTMLElement>(scene?:string){
 const root=useRef<T>(null);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)"),fine=window.matchMedia("(hover: hover) and (pointer: fine)");
  let frame=0,px=0,py=0,innerScroll=0;
  const layers=()=>Array.from(node.querySelectorAll<HTMLElement>("[data-mail-depth]"));
  const clear=()=>{for(const el of layers()){el.style.removeProperty("--mail-depth-x");el.style.removeProperty("--mail-depth-y");}};
  const paint=()=>{
   frame=0;if(reduced.matches||document.hidden){clear();return;}
   for(const el of layers()){
    const area=el.closest<HTMLElement>("[data-mail-scene]")||node,rect=area.getBoundingClientRect();
    if(rect.bottom<0||rect.top>window.innerHeight)continue;
    const depth=Math.min(2,Math.max(-2,Number(el.dataset.mailDepth)||0));
    const scroll=area===node?Math.min(innerScroll,400)*.035:Math.max(-28,Math.min(28,(window.innerHeight*.5-rect.top-rect.height*.5)*.08));
    el.style.setProperty("--mail-depth-x",`${(px*10*depth).toFixed(2)}px`);
    el.style.setProperty("--mail-depth-y",`${((py*8+scroll)*depth).toFixed(2)}px`);
   }
  };
  const schedule=()=>{if(!frame&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(paint);};
  const pointer=(event:PointerEvent)=>{if(!fine.matches||event.pointerType==="touch")return;const rect=node.getBoundingClientRect();px=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));py=Math.max(-1,Math.min(1,event.clientY/window.innerHeight*2-1));schedule();};
  const leave=()=>{px=0;py=0;schedule();};
  const scroll=(event:Event)=>{if(event.target instanceof HTMLElement&&event.target.matches(".mail-reader-content,.mail-thread-scroll"))innerScroll=event.target.scrollTop;schedule();};
  const preference=()=>{if(frame)cancelAnimationFrame(frame);frame=0;clear();schedule();};
  node.addEventListener("pointermove",pointer,{passive:true});node.addEventListener("pointerleave",leave,{passive:true});
  window.addEventListener("scroll",scroll,{passive:true,capture:true});window.addEventListener("resize",schedule,{passive:true});
  document.addEventListener("visibilitychange",preference);reduced.addEventListener("change",preference);schedule();
  return()=>{cancelAnimationFrame(frame);node.removeEventListener("pointermove",pointer);node.removeEventListener("pointerleave",leave);window.removeEventListener("scroll",scroll,true);window.removeEventListener("resize",schedule);document.removeEventListener("visibilitychange",preference);reduced.removeEventListener("change",preference);clear();};
 },[scene]);
 return root;
}
