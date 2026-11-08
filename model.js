export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function shiftDay(key, offset) {
  const [y,m,d]=key.split('-').map(Number); return dayKey(new Date(y,m-1,d+offset,12));
}
export function replay(events) {
  const habits={}; const checks={};
  for(const {payload:p} of events) {
    if(p.type==='habit') habits[p.habit.id]=p.habit;
    if(p.type==='delete') delete habits[p.id];
    if(p.type==='check') checks[`${p.id}:${p.day}`]=p.done;
  }
  return Object.values(habits).map(h=>({...h,days:Object.fromEntries(Object.entries(checks).filter(([k])=>k.startsWith(h.id+':')).map(([k,v])=>[k.slice(h.id.length+1),v]))}));
}
export function stats(habit,today=dayKey()) {
  const days=Object.keys(habit.days).filter(k=>habit.days[k]&&k<=today).sort();
  let current=0, cursor=habit.days[today]?today:shiftDay(today,-1);
  while(habit.days[cursor]){ current++; cursor=shiftDay(cursor,-1); }
  let longest=0,run=0,prev=null;
  for(const d of days){ run=prev&&shiftDay(prev,1)===d?run+1:1;longest=Math.max(longest,run);prev=d; }
  return {current,longest,total:days.length};
}
export function validPayload(p){
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&dayKey(new Date(v+'T12:00:00'))===v;
  const id=v=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(v);
  if(!p||typeof p!=='object')return false;
  if(p.type==='habit'){const h=p.habit;return !!h&&id(h.id)&&typeof h.name==='string'&&h.name.trim().length>0&&h.name.length<=60&&typeof h.goal==='string'&&h.goal.length<=80&&typeof h.emoji==='string'&&h.emoji.length<=16&&date(h.created);}
  if(p.type==='delete')return id(p.id);
  if(p.type==='check')return id(p.id)&&date(p.day)&&typeof p.done==='boolean';
  return false;
}
