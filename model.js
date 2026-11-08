export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function shiftDay(key, offset) {
  const [y,m,d]=key.split('-').map(Number); return dayKey(new Date(y,m-1,d+offset,12));
}
export function goalAt(habit, day) {
  let goal = habit.goalHistory?.[0]?.goal ?? habit.goal;
  for (const revision of habit.goalHistory || []) {
    if (revision.effective <= day) goal = revision.goal;
  }
  return goal;
}
export function replay(events) {
  const habits = {}, results = {};
  for (const {payload: p} of events) {
    if (p.type === 'habit') habits[p.habit.id] = {...p.habit, goalHistory: [{effective: p.habit.created, goal: p.habit.goal}]};
    if (p.type === 'goal' && habits[p.id]) {
      const h = habits[p.id];
      h.goalHistory.push({effective: p.effective, goal: p.goal});
      h.goalHistory.sort((a,b) => a.effective.localeCompare(b.effective));
    }
    if (p.type === 'icon' && habits[p.id]) habits[p.id].emoji = p.emoji;
    if (p.type === 'delete') delete habits[p.id];
    if (p.type === 'check') {
      results[`${p.id}:${p.day}`] = {done: p.done, goal: p.goal ?? (habits[p.id] ? goalAt(habits[p.id], p.day) : '')};
    }
  }
  return Object.values(habits).map(h => {
    const entries = Object.entries(results).filter(([k]) => k.startsWith(h.id + ':')).map(([k,v]) => [k.slice(h.id.length+1), v]);
    return {...h, goal: goalAt(h, dayKey()), results: Object.fromEntries(entries), days: Object.fromEntries(entries.map(([k,v]) => [k,v.done]))};
  });
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
  if(p.type==='icon')return id(p.id)&&typeof p.emoji==='string'&&p.emoji.trim().length>0&&p.emoji.length<=16;
  if(p.type==='delete')return id(p.id);
  if(p.type==='goal')return id(p.id)&&date(p.effective)&&typeof p.goal==='string'&&p.goal.trim().length>0&&p.goal.length<=80;
  if(p.type==='check')return id(p.id)&&date(p.day)&&typeof p.done==='boolean'&&(p.goal===undefined||(typeof p.goal==='string'&&p.goal.length<=80));
  return false;
}
