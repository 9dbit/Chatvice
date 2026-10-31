declare module "html-to-text" {
 export function compile(options:{
  wordwrap?:false|number;
  limits?:{maxInputLength?:number;maxDepth?:number;maxChildNodes?:number;maxBaseElements?:number;ellipsis?:string};
  selectors?:Array<{selector:string;format?:string;options?:{ignoreHref?:boolean;uppercase?:boolean}}>;
 }):(html:string)=>string;
}
