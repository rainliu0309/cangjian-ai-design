import { useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  X,
  Check,
  Plus,
  Layers,
  Eye,
  RotateCcw,
} from "lucide-react";
import { sample } from "./data/sample";
import { analyze } from "./lib/api";
import { mapLayout } from "./lib/layout";
import { History } from "./History";
import { readMemories, writeMemories, type Memory } from "./lib/history";
import {
  collectionSchema,
  type Analysis,
  type Save,
  type Feedback,
} from "../shared/schema";
function Bubble({
  name,
  count,
  onClick,
  small = false,
  state,
}: {
  name: string;
  count?: number;
  onClick: () => void;
  small?: boolean;
  state?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`bubble ${small ? "small" : ""} ${state || ""}`}
    >
      <i />
      <span>偏好线索</span>
      <strong>{name}</strong>
      <small>
        {count ? `${count} 条收藏的共同点 ↗` : "这里，藏着一个共同点"}
      </small>
    </button>
  );
}
function Photo({ item }: { item: Save }) {
  return item.thumbnail ? (
    <img
      src={item.thumbnail}
      alt={item.title}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  ) : (
    <div className="text-photo">{item.title}</div>
  );
}
function Dialog({
  children,
  close,
  title,
}: {
  children: React.ReactNode;
  close: () => void;
  title: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const last = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => last?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <button className="close" onClick={close} aria-label="关闭">
        <X />
      </button>
      {children}
    </dialog>
  );
}
export function App() {
  const [records, setRecords] = useState<Memory[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [memoryId, setMemoryId] = useState('');
  const [memoryTitle, setMemoryTitle] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  useEffect(() => {
    try { setRecords(readMemories()); } catch { setHistoryError('暂时无法读取回望记录，请检查浏览器存储设置。'); }
  }, []);
  function showHistory() {
    abort.current?.abort(); L(false); D(''); V('history');
  }
  function openMemory(record: Memory) {
    abort.current?.abort(); L(false); E(''); D('');
    I(record.items); R(record.result); F(record.feedback); SP(true);
    setMemoryId(record.id); setMemoryTitle(record.title); setSaveMessage(''); V('map');
  }
  function removeMemory(record: Memory) {
    if (!confirm(`删除「${record.title}」？删除后无法恢复。`)) return;
    const next = records.filter((item) => item.id !== record.id);
    try {
      writeMemories(next);
      setRecords(next);
    } catch {
      setHistoryError('删除失败，请检查浏览器存储设置后重试。');
    }
  }
  function persistMemory() {
    if (!result || !memoryTitle.trim() || historyError) return;
    const existing = records.find(r => r.id === memoryId);
    const record: Memory = { id: memoryId || crypto.randomUUID(), title: memoryTitle.trim(), date: existing?.date || new Date().toISOString(), items, result, feedback };
    const next = existing ? records.map(r => r.id === record.id ? record : r) : [record, ...records];
    try {
      writeMemories(next); setRecords(next); setMemoryId(record.id); D(''); setSaveMessage('已保存到回望');
    } catch { setSaveMessage('保存失败，请检查浏览器存储空间后重试。'); }
  }
  const [view, V] = useState("home"),
    [items, I] = useState<Save[]>(sample),
    [selected, S] = useState(sample.map((i) => i.id)),
    [result, R] = useState<Analysis | null>(null),
    [loading, L] = useState(false),
    [error, E] = useState(""),
    [mode, M] = useState("demo"),
    [detail, D] = useState(""),
    [feedback, F] = useState<Record<string, Feedback["value"]>>({}),
    [busy, B] = useState(false),
    [showPhotos, SP] = useState(true),
    [compact, C] = useState(innerWidth < 700),
    [notice, N] = useState(""),
    [phase, P] = useState(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => M(d.mode))
      .catch(() => E("分析服务暂时未连接。"));
    const fn = () => C(innerWidth < 700);
    addEventListener("resize", fn);
    return () => {
      removeEventListener("resize", fn);
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    scrollTo(0, 0);
  }, [view]);
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => P((p) => (p + 1) % 3), 2000);
    return () => clearInterval(id);
  }, [loading]);
  const draft = sample.filter((i) => selected.includes(i.id));
  async function start(next: Save[]) {
    if (!collectionSchema.safeParse(next).success) {
      E("再放几条进来吧。每次需要 3–20 条收藏，标题最多 160 字。");
      return;
    }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    I(next);
    setMemoryId(''); setMemoryTitle(''); setSaveMessage('');
    R(null);
    F({});
    SP(true);
    E("");
    L(true);
    P(0);
    V("map");
    try {
      const [data] = await Promise.all([
        analyze(next, ctrl.signal),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
      if (!ctrl.signal.aborted) {
        R(data.analysis);
        M(data.mode);
      }
    } catch (e) {
      if (!ctrl.signal.aborted) E((e as Error).message);
    } finally {
      if (!ctrl.signal.aborted) L(false);
    }
  }
  async function vote(id: string, value: Feedback["value"]) {
    if (!result) return;
    const f = { ...feedback, [id]: value };
    F(f);
    B(true);
    N("");
    try {
      const data = await analyze(items, undefined, {
        previous: result,
        feedback: Object.entries(f).map(([patternId, value]) => ({
          patternId,
          value,
        })),
      });
      R(data.analysis);
      N("已记下你的想法，地图也跟着调整了。");
    } catch {
      N("反馈已在当前地图保留，重新理解暂时失败。你可以再次选择以重试。");
    } finally {
      B(false);
    }
  }
  function input() {
    abort.current?.abort();
    L(false);
    E("");
    V("input");
  }
  const layout = mapLayout(items, result, compact),
    pattern = result?.patterns.find((p) => p.id === detail),
    tension = result?.tensions.find((t) => t.id === detail),
    save = items.find((i) => i.id === detail);
  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header>
          <button
            className="brand"
            onClick={() => {
              abort.current?.abort();
              L(false);
              V("home");
            }}
          >
            <b>
              藏见
              <i />
            </b>
            <span>
              CANGJIAN<small>收藏之外，自有发现</small>
            </span>
          </button>
          {view !== "home" && (
            <nav>
              <button onClick={input}>01 选择收藏</button>
              <span>—</span>
              <button disabled={!result && !loading} onClick={() => V("map")}>
                02 看见线索
              </button>
            </nav>
          )}
          <div className="header-links"><button className="history-link" style={{ fontWeight: 500 }} aria-current={view === 'history' ? 'page' : undefined} onClick={showHistory}>回望</button>
          <button className="about-link" style={{ fontWeight: 500 }} onClick={() => D("about")}>
            关于藏见
          </button>
          </div>
        </header>
        {view === 'history' ? <History records={records} open={openMemory} remove={removeMemory} start={input} error={historyError}/> : view === "home" ? (
          <main className="landing">
            <section className="hero-copy">
              <h1>
                从收藏里，
                <br />
                看见
                <span>
                  自己
                  <svg viewBox="0 0 200 20">
                    <path d="M3 13Q90 -3 194 8M15 19Q100 8 189 14" />
                  </svg>
                  <i className="hero-period" aria-label="。" />
                </span>
              </h1>
              <p className="description">
                收藏帮你留下喜欢的东西。
                <br />
                藏见帮你看见，它们为什么会聚在一起。
              </p>
              <div className="actions">
                <button className="primary hero-cta" onClick={input}>
                  <span className="cta-mark">
                    <Layers size={16} />
                  </span>
                  看看示例收藏 <ArrowRight size={18} />
                </button>
              </div>
            </section>
            <section className="hero-art" aria-label="收藏碎片与透明偏好泡泡">
              <div className="halo" />
              <svg className="hero-lines" viewBox="0 0 620 620">
                <path d="M100 100Q320 200 520 440M100 400Q310 200 480 100M180 530Q240 330 480 440" />
              </svg>
              {[0, 1, 2, 4].map((n, i) => (
                <button className={`fragment f${i}`} key={n} onClick={input}>
                  <Photo item={sample[n]} />
                  <span>
                    {
                      [
                        "日式 · 卧室",
                        "奶油风 · 日常",
                        "北欧 · 角落",
                        "光落下的地方",
                      ][i]
                    }{" "}
                    <ArrowUpRight size={11} />
                  </span>
                </button>
              ))}
              <div className="hb hb1">
                <Bubble name="被自然光吸引" count={7} onClick={input} />
              </div>
              <div className="hb hb2">
                <Bubble name="让空间留白" small onClick={input} />
              </div>
              <div className="hb hb3">
                <Bubble name="天然的触感" small onClick={input} />
              </div>
            </section>
            <footer className="footer landing-footer"><p>CANGJIAN © 2026 · Ruiying Liu</p></footer>
          </main>
        ) : view === "input" ? (
          <main className="input-page">
            <h2>
              把这组收藏，<em>放进来。</em>
            </h2>
            <div className="collection-control-row">
              <span className="sample-label">
                <Layers size={16} /> 示例收藏
              </span>
              <button
                onClick={() =>
                  S(selected.length === 12 ? [] : sample.map((i) => i.id))
                }
              >
                {selected.length === 12 ? "取消全选" : "选择全部"}
              </button>
            </div>
            <>
              <div className="grid">
                {sample.map((item, n) => (
                  <button
                    key={item.id}
                    className={`card ${selected.includes(item.id) ? "picked" : ""}`}
                    aria-pressed={selected.includes(item.id)}
                    onClick={() =>
                      S(
                        selected.includes(item.id)
                          ? selected.filter((id) => id !== item.id)
                          : [...selected, item.id],
                      )
                    }
                  >
                    <div className="card-photo">
                      <Photo item={item} />
                      <span className="check">
                        {selected.includes(item.id) ? (
                          <Check size={12} />
                        ) : (
                          <Plus size={12} />
                        )}
                      </span>
                      <span className="index">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.tags.map((t) => "#" + t).join("  ")}</p>
                  </button>
                ))}
              </div>
            </>
            <div className="submit-row">
              <span>
                已放入 <b>{draft.length}</b> 条收藏
              </span>
              <button
                className="primary analysis-cta"
                onClick={() => start(draft)}
              >
                开始看见 <ArrowUpRight size={18} />
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </main>
        ) : (
          <main className="map-page">
            <div className="map-heading">
              <div>
                <h2>
                  {loading
                    ? "有些喜欢，正在靠近。"
                    : error
                      ? "这次，还没看清。"
                      : "原来，你在意的是这些。"}
                </h2>
                <p className="subheading" aria-live="polite">
                  {loading
                    ? [
                        "正在读懂你放进来的收藏…",
                        "正在找出反复出现的线索…",
                        "正在仔细核对它们之间的联系…",
                      ][phase]
                    : result?.collectionSummary}
                </p>
              </div>
            </div>
            <div className="map-meta">
              <span>
                {items.length} 条收藏 ·{" "}
                {result ? `${result.patterns.length} 个偏好线索` : "寻找线索中"}
              </span>
              <span>点击泡泡，看看为什么 ↗</span>
            </div>
            {error && (
              <div role="alert" className="error">
                {error}
                <button className="primary" onClick={() => start(items)}>
                  再看一次 <RotateCcw size={15} />
                </button>
              </div>
            )}
            {result && !result.patterns.length && (
              <div className="empty">
                <h3>不同的喜欢，也很好。</h3>
                <p>{result.collectionSummary}</p>
                {mode === "demo" && (
                  <p>
                    本地规则能识别的线索有限，接入 Agnes
                    后可以进行更深入的理解。
                  </p>
                )}
                <button onClick={input}>
                  重新选择示例收藏 <RotateCcw size={15} />
                </button>
              </div>
            )}
            <div
              className={`map ${loading ? "loading" : ""}`}
              style={{ aspectRatio: `${layout.width}/${layout.height}` }}
            >
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className="connections"
              >
                {result?.patterns.flatMap((p, n) =>
                  p.evidence.map((id) => {
                    const i = items.findIndex((s) => s.id === id);
                    if (i < 0) return null;
                    const a = layout.anchors[n],
                      b = layout.tiles[i];
                    return (
                      <motion.path
                        key={p.id + id}
                        d={`M${a.x},${a.y} Q${(a.x + b.x) / 2 + 15},${(a.y + b.y) / 2 - 20} ${b.x},${b.y}`}
                        initial={{ pathLength: 0 }}
                        animate={{
                          pathLength: 1,
                          opacity: showPhotos
                            ? feedback[p.id] === "no"
                              ? 0.1
                              : 0.6
                            : 0,
                        }}
                        transition={{ duration: 1.5 }}
                      />
                    );
                  }),
                )}
              </svg>
              {items.map((item, n) => {
                const p = layout.tiles[n];
                return (
                  <motion.button
                    key={item.id}
                    className="map-tile"
                    initial={false}
                    animate={{
                      left: `${(p.x / layout.width) * 100}%`,
                      top: `${(p.y / layout.height) * 100}%`,
                      rotate: result ? ((n % 3) - 1) * 3 : ((n % 5) - 2) * 5,
                      opacity: showPhotos ? 1 : 0,
                    }}
                    transition={{
                      duration: 1.4,
                      type: "spring",
                      damping: 25,
                      stiffness: 45,
                    }}
                    onClick={() => D(item.id)}
                    tabIndex={showPhotos ? 0 : -1}
                    aria-hidden={!showPhotos}
                  >
                    <Photo item={item} />
                    <span>{item.title}</span>
                  </motion.button>
                );
              })}
              {result?.patterns.map((p, n) => (
                <motion.div
                  className="map-orb"
                  key={p.id}
                  style={{
                    left: `${(layout.anchors[n].x / layout.width) * 100}%`,
                    top: `${(layout.anchors[n].y / layout.height) * 100}%`,
                  }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: feedback[p.id] === "no" ? 0.45 : 1,
                    scale:
                      feedback[p.id] === "no"
                        ? 0.8
                        : feedback[p.id] === "yes"
                          ? 1.05
                          : 0.9 + p.strength * 0.12,
                  }}
                  transition={{ duration: 0.8 }}
                >
                  <Bubble
                    name={p.name}
                    count={p.evidence.length}
                    small={compact}
                    state={feedback[p.id]}
                    onClick={() => D(p.id)}
                  />
                </motion.div>
              ))}
            </div>
            {loading ? (
              <p className="loading-note">
                {mode === "demo"
                  ? "正在演示：读取文本 → 匹配线索 → 形成地图"
                  : "读取内容 → 寻找关系 → 形成地图"}
              </p>
            ) : (
              result && (
                <>
                  <div className="map-tools">
                    <button className="save-memory" disabled={busy} onClick={() => { setSaveMessage(''); setMemoryTitle(memoryTitle || result.patterns.slice(0,2).map(p => p.name).join(' · ') || '我的收藏'); D('save-memory'); }}>
                      <Layers size={15}/>{memoryId ? '更新这次看见' : '保存这次看见'}
                    </button>
                    <button onClick={() => SP(!showPhotos)}>
                      <Eye size={15} />
                      {showPhotos ? "隐藏收藏图" : "显示收藏图"}
                    </button>
                    <button onClick={input}>
                      <Plus size={15} />
                      重新选择收藏
                    </button>
                  </div>
                  {saveMessage && <p className="memory-save-status" role="status">{saveMessage} <button onClick={showHistory}>查看回望 ↗</button></p>}
                </>
              )
            )}
          </main>
        )}
        {view !== "home" && (
          <footer className="footer">
            <span>CANGJIAN © 2026 · Ruiying Liu</span>
          </footer>
        )}
        {detail === 'save-memory' ? <Dialog title="保存这次看见" close={() => D('')}>
          <div className="memory-save-dialog"><div className="eyebrow">留住一次发现</div><h2>保存这次看见</h2><form onSubmit={e => { e.preventDefault(); persistMemory(); }}><label htmlFor="memory-title">给这组收藏起个名字</label><input id="memory-title" autoFocus maxLength={60} required value={memoryTitle} onChange={e => setMemoryTitle(e.target.value)}/>{(saveMessage || historyError) && <p role="alert">{historyError || saveMessage}</p>}<button className="primary memory-save-submit" disabled={!memoryTitle.trim() || !!historyError} type="submit">{memoryId ? '更新保存' : '保存到回望'} <ArrowUpRight size={16}/></button></form></div>
        </Dialog> : detail && (
          <Dialog
            title={pattern?.name || tension?.name || save?.title || "关于藏见"}
            close={() => {
              D("");
              N("");
            }}
          >
            {pattern ? (
              <>
                <div className="eyebrow">PATTERN / 偏好线索</div>
                <div className="detail-bubble">
                  <Bubble
                    name={pattern.name}
                    count={pattern.evidence.length}
                    small
                    onClick={() =>
                      document
                        .getElementById("evidence")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  />
                </div>
                <h2>{pattern.name}</h2>
                <p className="interpretation">{pattern.description}</p>
                <h3 id="evidence">
                  这些收藏，让藏见这样想{" "}
                  <small>{pattern.evidence.length} 条</small>
                </h3>
                <div className="evidence">
                  {items
                    .filter((i) => pattern.evidence.includes(i.id))
                    .map((i) => (
                      <article key={i.id}>
                        <Photo item={i} />
                        <div>
                          <h4>{i.title}</h4>
                          <p>{i.content}</p>
                        </div>
                      </article>
                    ))}
                </div>
                <div className="feedback">
                  <p>这个判断，像你吗？</p>
                  <div>
                    {(["yes", "no", "maybe"] as const).map((v, n) => (
                      <button
                        key={v}
                        disabled={busy}
                        className={feedback[pattern.id] === v ? "active" : ""}
                        aria-pressed={feedback[pattern.id] === v}
                        onClick={() => vote(pattern.id, v)}
                      >
                        {["✓ 很像我", "× 不太像我", "◯ 再看看"][n]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : tension ? (
              <>
                <div className="eyebrow">TENSION / 同时存在的喜欢</div>
                <div className="tension-icon">◯ ↔ ◯</div>
                <h2>{tension.name}</h2>
                <p className="interpretation">{tension.description}</p>
                <div className="tension-sides">
                  {tension.sides.map((side) => (
                    <section key={side.name}>
                      <h3>{side.name}</h3>
                      {items
                        .filter((i) => side.itemIds.includes(i.id))
                        .map((i) => (
                          <article key={i.id}>
                            <Photo item={i} />
                            <h4>{i.title}</h4>
                            <p>{i.content}</p>
                          </article>
                        ))}
                    </section>
                  ))}
                </div>
                <p className="hint">偏好可以有层次，你不需要只选一个方向。</p>
              </>
            ) : save ? (
              <>
                <div className="detail-photo">
                  <Photo item={save} />
                </div>
                <div className="eyebrow">SAVED FRAGMENT / 收藏原文</div>
                <h2>{save.title}</h2>
                <p className="interpretation">
                  {save.content || "这条收藏暂时只有标题。"}
                </p>
                <p>{save.tags.map((t) => "#" + t).join("　")}</p>
              </>
            ) : (
              <>
                <div className="eyebrow">CANGJIAN / 关于藏见</div>
                <h2>
                  藏，是行为。
                  <br />
                  见，是发现。
                </h2>
                <p className="interpretation">
                  我们保存了许多喜欢，却很少把它们放在一起看。藏见陪你发现，收藏之间那些反复出现的线索。
                </p>
                <h3>理解这组收藏，不定义你</h3>
                <p>
                  每个偏好都有原文依据。你可以认同、否定，或先保留。每一条线索，都留给你自己判断。
                </p>
              </>
            )}
          </Dialog>
        )}
      </div>
    </MotionConfig>
  );
}
