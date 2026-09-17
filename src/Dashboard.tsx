import { HomeDetail } from "./UxDetails";
import { useEffect, useState } from "react";
import type { BackendHandoff } from "./api";
import { Badge, Icon } from "./ui";
import { dateLabel, day, memberName, timeLabel, type Member, type CareEvent, type Schedule } from "./data";
export function Dashboard({events,schedules,members,current,next,elder,navigate,write,name,handoff}: {
 events:CareEvent[]; schedules:Schedule[]; members:Member[]; current:string; next:string|null; elder:string;
 navigate:(page:string)=>void; write:()=>void; name:string; handoff?:BackendHandoff;
}) {
 const [detail,setDetail]=useState<string|null>(null);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(timer);},[]);
 const today=day();
 const todayEvents=events.filter(e=>new Date(e.timestamp).toLocaleDateString()===new Date().toLocaleDateString());
 const todaySchedules=schedules.filter(s=>new Date(s.scheduledAt).toLocaleDateString()===new Date().toLocaleDateString() && s.status!=="취소");
 const upcoming=schedules.filter(s=>s.status==="예정" && Date.parse(s.scheduledAt)>=now).sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt));
 const recent=[...events].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).slice(0,4);
 const special=todayEvents.filter(e=>e.type==="특이사항");
 return <div className="ux-home">{detail && <HomeDetail kind={detail} onClose={()=>setDetail(null)}/>}
   <div className="ux-page-intro"><div><p className="eyebrow">{dateLabel(today)} · 우리 가족의 하루</p><h1>안녕하세요, {name} 님</h1><p>오늘도 함께, {elder==="고령자 미등록" ? "돌봄의 하루를 이어가요." : `${elder} 님의 하루를 이어가요.`}</p></div><button className="primary" onClick={write}><Icon name="plus" size={18}/>돌봄 기록 남기기</button></div>
   <section className="ux-care-hero"><div className="ux-hero-copy"><span className="ux-pill"><span className="dot"/>현재 담당 보호자</span><h2><strong>{memberName(members,current)} 님</strong>이<br/>돌봄을 함께하고 있어요.</h2><p>서로의 기록을 나누며, 안심할 수 있는 하루를 만들어요.</p><button onClick={()=>navigate("가족 관리")} className="ux-hero-link">우리 가족 보기 <Icon name="arrow" size={17}/></button></div><div className="ux-hero-art" aria-hidden="true"><div className="ux-art-ring"/><div className="ux-art-person one"/><div className="ux-art-person two"/><div className="ux-art-person three"/><span className="ux-art-heart"><Icon name="heart" size={35}/></span><span className="ux-art-leaf leaf-one"/><span className="ux-art-leaf leaf-two"/></div></section>
   <div className="ux-metrics" aria-label="오늘의 돌봄 요약">
     <button className="ux-metric" onClick={()=>navigate("일정")}><span className="ux-metric-icon"><Icon name="calendar"/></span><span>오늘의 일정<strong>{todaySchedules.length}<small>건</small></strong></span><Icon name="chevron" size={17}/></button>
     <button className="ux-metric ux-pending" onClick={()=>setDetail("복약 확인")}><span className="ux-metric-icon"><Icon name="check"/></span><span>복약 확인<strong>준비 중</strong><small>복용 체크 기능</small></span></button>
     <button className="ux-metric ux-pending" onClick={()=>setDetail("건강 상태")}><span className="ux-metric-icon"><Icon name="heart"/></span><span>건강 상태<strong>준비 중</strong><small>혈압 · 혈당 · 체중</small></span></button>
     <button className="ux-metric" onClick={()=>navigate("돌봄 기록")}><span className="ux-metric-icon warm"><Icon name="file"/></span><span>오늘의 특이사항<strong>{special.length}<small>건</small></strong></span><Icon name="chevron" size={17}/></button>
   </div>
   <div className="ux-home-columns"><div className="ux-home-main">
     <section className="card ux-section"><div className="section-head"><div><p className="eyebrow">함께 챙기는 약속</p><h2>다가오는 일정</h2></div><button className="text-button" onClick={()=>navigate("일정")}>전체보기 <Icon name="chevron" size={15}/></button></div>
       {upcoming.length ? upcoming.slice(0,3).map(s=><button className="ux-schedule-row" key={s.scheduleId} onClick={()=>navigate("일정")}><span className="ux-date-tile"><small>{new Date(s.scheduledAt).getMonth()+1}월</small><b>{new Date(s.scheduledAt).getDate()}</b></span><span><strong>{s.title}</strong><small>{timeLabel(s.scheduledAt)} · {memberName(members,s.caregiverId)}</small></span><Badge tone="green">예정</Badge></button>) : <div className="ux-empty"><span><Icon name="calendar" size={30}/></span><h3>다가오는 일정이 없어요</h3><p>진료부터 가족 방문까지, 함께 챙길 약속을 남겨보세요.</p><button className="secondary" onClick={()=>navigate("일정")}><Icon name="plus" size={16}/>일정 보러 가기</button></div>}
     </section>
     <section className="card ux-section"><div className="section-head"><div><p className="eyebrow">작은 일상도 소중한 기록</p><h2>최근 돌봄 기록</h2></div><button className="text-button" onClick={()=>navigate("돌봄 기록")}>전체보기 <Icon name="chevron" size={15}/></button></div>
       {recent.length ? recent.map(e=><button className="ux-record-row" key={e.eventId} onClick={()=>navigate("돌봄 기록")}><span className="ux-record-dot"/><span className="ux-record-body"><span><Badge tone={e.type==="특이사항"?"orange":"green"}>{e.type}</Badge><small>{memberName(members,e.createdBy)} · {dateLabel(e.timestamp)} {timeLabel(e.timestamp)}</small></span><p>{e.content}</p></span></button>):<div className="ux-empty"><Icon name="file" size={28}/><h3>아직 남겨진 기록이 없어요</h3><p>오늘의 첫 돌봄 이야기를 남겨주세요.</p></div>}
       <button className="wide-button" onClick={write}><Icon name="plus" size={17}/>기록 남기기</button>
     </section>
   </div><div className="ux-home-side">
     <section className="card ux-section ux-next"><span className="ux-section-icon"><Icon name="users"/></span><p className="eyebrow">다음 돌봄을 준비해요</p><h2>다음 담당 보호자</h2><div className="ux-next-person">{next ? <><span className="avatar green">{memberName(members,next).slice(-2)}</span><strong>{memberName(members,next)} 님</strong></>:<p>아직 다음 보호자가 지정되지 않았어요.</p>}</div><button className="soft-button" onClick={()=>navigate("가족 관리")}>가족 관리에서 확인 <Icon name="arrow" size={16}/></button><button className="text-button section-gap" onClick={()=>setDetail("교대 시간·장소")}>교대 시간·장소 · 준비 중</button></section>
     <section className="card ux-section ux-brief"><div className="section-head"><h2><Icon name="spark" size={19}/>돌봄 브리핑</h2></div><p>{[handoff?.healthSummary,handoff?.lifeSummary].filter(Boolean).join(" ") || "가족이 남긴 기록을 모아 다음 보호자에게 전할 내용을 확인해요."}</p>{!handoff && <span className="ux-small-note">아직 생성된 인수인계가 없어요.</span>}<button className="text-button" onClick={()=>navigate("AI 인수인계")}>인수인계 확인하기 <Icon name="arrow" size={16}/></button></section>
     <p className="ux-home-note"><Icon name="heart" size={17}/>함께 남기는 작은 기록,<br/>더 든든해지는 우리 가족.</p>
   </div></div>
 </div>;
}
