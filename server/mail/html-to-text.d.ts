declare module "html-to-text" {
 export function compile(options:{
  wordwrap?:false|number;
  formatters?:Record<string,(elem:{children:unknown[];attribs?:Record<string,string>},walk:(children:unknown[],builder:any)=>void,builder:{addInline:(value:string)=>void})=>void>;
  limits?:{maxInputLength?:number;maxDepth?:number;maxChildNodes?:number;maxBaseElements?:number;ellipsis?:string};
  selectors?:Array<{selector:string;format?:string;options?:{ignoreHref?:boolean;uppercase?:boolean}}>;
 }):(html:string)=>string;
}

