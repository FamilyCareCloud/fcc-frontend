import { localInput } from "./data.ts";
export type CalendarView="day"|"week"|"month";
export function dateKey(d:Date){return localInput(d.toISOString()).slice(0,10);}
export function shiftDate(value:string,offset:number){const d=new Date(value+"T12:00");d.setDate(d.getDate()+offset);return dateKey(d);}
export function calendarDays(value:string,view:CalendarView){const d=new Date(value+"T12:00");if(view==="day")return [value];if(view==="month")d.setDate(1);d.setDate(d.getDate()-d.getDay());return Array.from({length:view==="week"?7:42},(_,i)=>shiftDate(dateKey(d),i));}
