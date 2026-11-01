import {useEffect,useState} from "react";
import {Moon,Sun} from "lucide-react";
export default function MailTheme(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{try{const value=localStorage.getItem("chatvice-mail-theme")==="dark";setDark(value);document.documentElement.dataset.mailTheme=value?"dark":"light";}catch{}},[]);
 function toggle(){const next=!dark;setDark(next);document.documentElement.dataset.mailTheme=next?"dark":"light";try{localStorage.setItem("chatvice-mail-theme",next?"dark":"light");}catch{}}
 return <button type="button" className="mail-icon-btn" onClick={toggle} aria-label={dark?"Use light mode":"Use dark mode"} title={dark?"Use light mode":"Use dark mode"}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>;
}
