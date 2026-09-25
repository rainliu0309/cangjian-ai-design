import { useState } from 'react';
import { CalendarDays, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { dayKey, type Memory } from './lib/history';

export function History({ records, open, remove, start, error }: { records: Memory[]; open: (record: Memory) => void; remove: (record: Memory) => void; start: () => void; error: string }) {
  const [calendar, setCalendar] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState('');
  const monthRecords = records.filter(r => { const d = new Date(r.date); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth(); });
  const visible = calendar ? monthRecords.filter(r => !day || dayKey(new Date(r.date)) === day) : records;
  const offset = (month.getDay()+6)%7;
  const days = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  function move(n: number) { setMonth(new Date(month.getFullYear(),month.getMonth()+n,1)); setDay(''); }
  return <main className="memories-page">
    <div className="memory-heading"><div><h2>回望，<em>看见的自己。</em></h2></div></div>
    <div className="memory-toolbar"><div className="memory-tabs" aria-label="回望视图"><button aria-pressed={!calendar} onClick={() => setCalendar(false)}><LayoutGrid size={16}/>收藏组</button><button aria-pressed={calendar} onClick={() => setCalendar(true)}><CalendarDays size={16}/>日历</button></div><button className="memory-new" onClick={start} aria-label="新的看见" title="新的看见"><Plus size={17}/></button></div>
    {error && <p role="alert">{error}</p>}
    <div className={calendar ? 'memory-layout' : ''}>
    {calendar && <section className="memory-calendar" aria-label="看见日历">
      <div className="month-heading"><button aria-label="上个月" onClick={() => move(-1)}><ChevronLeft size={19}/></button><button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(),d.getMonth(),1)); setDay(''); }} title="回到本月">{month.getFullYear()} 年 {month.getMonth()+1} 月</button><button aria-label="下个月" onClick={() => move(1)}><ChevronRight size={19}/></button></div>
      <div className="calendar-grid">{'一二三四五六日'.split('').map(d => <span className="weekday" key={d}>{d}</span>)}{Array.from({length: offset}, (_,i) => <span key={`blank${i}`}/>)}{Array.from({length:days},(_,i) => {
        const date = dayKey(new Date(month.getFullYear(),month.getMonth(),i+1));
        const count = monthRecords.filter(r => dayKey(new Date(r.date)) === date).length;
        return <button key={date} className={`${date === day ? 'selected-day' : ''} ${date === dayKey(new Date()) ? 'today' : ''}`} aria-pressed={date === day} aria-label={`${date}，${count} 次看见`} onClick={() => setDay(day === date ? '' : date)}><span>{i+1}</span>{count > 0 && <i/>}</button>;
      })}</div><p className="calendar-caption">有泡泡的日子，留着一次看见。</p>
      {day && <button className="month-reset" onClick={() => setDay('')}>查看整个月</button>}
    </section>}
    <section aria-label="保存的收藏组">
      {calendar && <h3 className="memory-list-title">{day ? `${Number(day.slice(5,7))} 月 ${Number(day.slice(8))} 日` : '这个月的看见'}</h3>}
      {visible.length ? <div className="memory-cards">{visible.map(r => <article className="memory-card" key={r.id}>
        <button className="memory-card-open" onClick={() => open(r)} aria-label={`打开「${r.title}」`}>
        <div className="memory-art"><div className="memory-photo-strip">{r.items.slice(0,3).map(item => <div key={item.id}>{item.thumbnail && <img src={item.thumbnail} alt=""/>}</div>)}</div><div className="memory-orb"><span>这次，看见</span><strong>{r.result.patterns[0]?.name || '不同的喜欢'}</strong><i>✦</i></div></div>
        <div className="memory-card-body"><small>{new Date(r.date).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}</small><h3>{r.title}<ArrowUpRight size={17}/></h3><p>{r.result.collectionSummary}</p><div className="memory-tags">{r.result.patterns.slice(0,3).map(p => <span key={p.id}>#{p.name}</span>)}</div></div>
        </button><div className="memory-card-meta"><span className="memory-count">{r.items.length} 条收藏 · {r.result.patterns.length} 个线索</span><button className="memory-delete" onClick={() => remove(r)} aria-label={`删除「${r.title}」`}><Trash2 size={14}/>删除</button></div>
      </article>)}</div> : <div className="memory-empty"><div className="empty-orb">留住<br/>一次看见</div><p>{records.length ? '换个日期，看看喜欢留下的痕迹。' : '分析收藏后，点击「保存这次看见」，它就会留在这里。'}</p>{!records.length && <button className="primary" onClick={start}>看看示例收藏 <ArrowUpRight size={16}/></button>}</div>}
    </section></div>
  </main>;
}
