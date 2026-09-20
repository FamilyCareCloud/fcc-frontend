import {useId,useState,type InputHTMLAttributes} from "react";
import "./password-input.css";
export function PasswordInput({label,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string}){
 const id=useId();const [visible,setVisible]=useState(false);
 return <div className="field"><label htmlFor={id}>{label}</label><div className="password-input"><input {...props} id={id} type={visible?"text":"password"}/><button type="button" className="password-toggle" disabled={props.disabled} aria-label={`${label} ${visible?"숨기기":"보기"}`} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="m3 3 18 18"/>}</svg></button></div></div>;
}
