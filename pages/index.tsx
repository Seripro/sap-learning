import { useEffect, useState, type FormEvent } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  RotateCcw,
  Bookmark,
  Settings,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  ChevronRight,
  LogOut,
  Layers,
  Menu,
  ShieldCheck,
  Clock3,
  Target,
  CheckCircle2,
  Circle,
  LoaderCircle,
} from 'lucide-react';
import {
  api,
  ApiError,
  percent,
  type User,
  type State,
  type Exercise,
} from '../src/client';
import './style.css';
type View = 'home' | 'practice' | 'review' | 'settings' | 'question' | 'result';
const titles: Record<View, string> = {
  home: 'ダッシュボード',
  practice: '演習をはじめる',
  review: '復習ノート',
  settings: 'アカウント設定',
  question: '演習',
  result: '演習結果',
};
const nav = [
  { id: 'home', label: 'ダッシュボード', icon: LayoutDashboard },
  { id: 'practice', label: '演習をはじめる', icon: BookOpen },
  { id: 'review', label: '復習ノート', icon: RotateCcw },
] as const;
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [initial, setInitial] = useState(true),
    [state, setState] = useState<State | null>(null);
  const [view, setView] = useState<View>('home'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false);
  const [exercise, setExercise] = useState<Exercise | null>(null),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [uncertain, setUncertain] = useState(false);
  const [domain, setDomain] = useState('all'),
    [count, setCount] = useState(5),
    [mode, setMode] = useState('all'),
    [reviewTab, setReviewTab] = useState<'wrong' | 'bookmarks'>('wrong');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    api<{ user: User | null }>('me')
      .then((r) => setUser(r.user))
      .catch((e) => setError(e.message))
      .finally(() => setInitial(false));
  }, []);
  useEffect(() => {
    if (user) refresh().catch(handleError);
  }, [user]);
  useEffect(() => {
    setSelected([]);
    setUncertain(false);
  }, [index, exercise?.id]);
  async function refresh() {
    const s = await api<State>('state');
    setState(s);
    return s;
  }
  function handleError(e: unknown) {
    if (user && e instanceof ApiError && e.status === 401) {
      setUser(null);
      setState(null);
      setExercise(null);
      setView('home');
      setMobile(false);
      setError('セッションが終了しました。もう一度ログインしてください');
      return;
    }
    setError(e instanceof Error ? e.message : '通信に失敗しました');
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  function navigate(v: View) {
    setView(v);
    setMobile(false);
    setError('');
    setNotice('');
  }
  async function openExercise(id: string) {
    const e = await api<Exercise>('exercise?id=' + encodeURIComponent(id));
    setExercise(e);
    const next = e.questions.findIndex((q) => !q.answer);
    setIndex(next < 0 ? 0 : next);
    navigate(next < 0 ? 'result' : 'question');
  }
  async function start() {
    await run(async () => {
      const e = await api<Exercise>('start', { domain, count, mode });
      setExercise(e);
      setIndex(0);
      navigate('question');
      await refresh();
    });
  }
  async function mark(id: string) {
    await run(async () => {
      await api('bookmark', {
        questionId: id,
        marked: !state?.bookmarks.includes(id),
      });
      await refresh();
    });
  }
  const q = exercise?.questions[index];
  const complete = exercise?.questions.every((q) => q.answer);
  if (initial)
    return (
      <div className="loading">
        <LoaderCircle className="spin" />
        読み込み中…
      </div>
    );
  if (!user)
    return (
      <Auth
        busy={busy}
        error={error}
        onSubmit={(username, password, register) =>
          run(async () => {
            const r = await api<{ user: User }>(
              register ? 'register' : 'login',
              { username, password },
            );
            setUser(r.user);
          })
        }
      />
    );
  const stats = state?.stats;
  const pending = state?.exercises.find((e) => e.answered < e.total);
  const reviewIds = state?.[reviewTab] ?? [];
  return (
    <div className="app-shell">
      <aside className={mobile ? 'sidebar open' : 'sidebar'}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('home');
          }}
        >
          <span className="brand-icon">
            <Layers size={23} />
          </span>
          <span>
            STACK<span className="brand-accent">UP</span>
            <small>AWS SAP LEARNING</small>
          </span>
        </a>
        <div className="workspace-label">学習スペース</div>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={
                'nav-item ' +
                (view === id ||
                (id === 'practice' && ['question', 'result'].includes(view))
                  ? 'active'
                  : '')
              }
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              {label}
              {id === 'review' && !!state?.wrong.length && (
                <span className="nav-count">{state.wrong.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={22} />
          <strong>次のレベルの設計力へ。</strong>
          <p>
            小さな積み重ねを、
            <br />
            プロフェッショナルの力に。
          </p>
          <span>
            Solutions Architect
            <br />
            <b>PROFESSIONAL</b>
          </span>
        </div>
        <div className="sidebar-bottom">
          <button
            className={'nav-item ' + (view === 'settings' ? 'active' : '')}
            onClick={() => navigate('settings')}
          >
            <Settings size={18} />
            アカウント設定
          </button>
          <div className="user-card">
            <span className="avatar">{user.username[0].toUpperCase()}</span>
            <div>
              <strong>{user.username}</strong>
              <small>学習アカウント</small>
            </div>
            <button
              className="icon-button"
              aria-label="ログアウト"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api('logout', {});
                  setUser(null);
                  setState(null);
                  setExercise(null);
                  navigate('home');
                })
              }
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="backdrop"
          aria-label="メニューを閉じる"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="メニュー"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span>学習スペース</span>
            <ChevronRight size={14} />
            <strong>{titles[view]}</strong>
          </div>
          <span className="exam-badge">
            <span /> AWS SAP · Professional
          </span>
        </header>
        <main className="content">
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="エラーを閉じる" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
            </div>
          )}
          {!state ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              学習データを読み込み中…
              <button
                className="button secondary"
                onClick={() =>
                  run(async () => {
                    await refresh();
                  })
                }
              >
                再読み込み
              </button>
            </div>
          ) : (
            <>
              {view === 'home' && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">YOUR LEARNING JOURNEY</div>
                      <h1>一問ずつ、その先へ。</h1>
                      <p>
                        {user.username}さん、今日もAWSの理解を深めましょう。
                      </p>
                    </div>
                    <span className="date-chip">
                      AWS SAP 学習ダッシュボード
                    </span>
                  </div>
                  <section className="hero-card">
                    <div className="hero-copy">
                      <span className="pill">AWS CERTIFIED</span>
                      <h2>
                        知識をつなげて、
                        <br />
                        設計する力に。
                      </h2>
                      <p>
                        問題を解き、理由を理解する。
                        <br />
                        Solutions Architect – Professionalへの一歩を。
                      </p>
                      <button
                        className="button light"
                        onClick={() => {
                          setMode('all');
                          navigate('practice');
                        }}
                      >
                        演習をはじめる
                        <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="art-tile tile-back">
                        <Layers size={37} />
                      </div>
                      <div className="art-tile tile-front">
                        <ShieldCheck size={57} />
                        <span>PROFESSIONAL</span>
                      </div>
                      <span className="art-dot dot-one" />
                      <span className="art-dot dot-two" />
                      <span className="art-plus">+</span>
                    </div>
                  </section>
                  <div className="stats-grid">
                    <Stat
                      icon={<BookOpen />}
                      label="解答数"
                      value={String(stats?.answered ?? 0)}
                      suffix="問"
                      note={`全 ${state.catalog.length} 問のサンプルを収録`}
                    />
                    <Stat
                      icon={<Target />}
                      label="初回正答率"
                      value={
                        stats?.firstAnswered
                          ? String(
                              percent(stats.firstCorrect, stats.firstAnswered),
                            )
                          : '—'
                      }
                      suffix={stats?.firstAnswered ? '%' : ''}
                      note={`${stats?.firstAnswered ?? 0} 問に初めて挑戦`}
                    />
                    <Stat
                      icon={<CheckCircle2 />}
                      label="全回答の正答率"
                      value={
                        stats?.answered
                          ? String(percent(stats.correct, stats.answered))
                          : '—'
                      }
                      suffix={stats?.answered ? '%' : ''}
                      note="繰り返しの解答を含む"
                    />
                    <Stat
                      icon={<RotateCcw />}
                      label="復習したい問題"
                      value={String(state.wrong.length)}
                      suffix="問"
                      note="不正解・自信がなかった問題"
                    />
                  </div>
                  {pending && (
                    <button
                      className="resume-banner"
                      onClick={() => run(() => openExercise(pending.id))}
                    >
                      <span className="stat-icon">
                        <Clock3 />
                      </span>
                      <div>
                        <strong>途中の演習を続ける</strong>
                        <span>
                          {pending.answered} / {pending.total} 問 回答済み ·
                          進捗は保存されています
                        </span>
                      </div>
                      <ArrowRight size={20} />
                    </button>
                  )}
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="section-title">
                        <div>
                          <h2>分野別の学習状況</h2>
                          <p>得意と苦手を見つけよう</p>
                        </div>
                        <span className="subtle-label">全回答の正答率</span>
                      </div>
                      <div className="domain-list">
                        {state.domains.map((d, i) => {
                          const h = state.history.filter((h) => h.domain === d);
                          const p = percent(
                            h.filter((h) => h.correct).length,
                            h.length,
                          );
                          return (
                            <button
                              className="domain-row"
                              key={d}
                              onClick={() => {
                                setDomain(d);
                                setMode('all');
                                navigate('practice');
                              }}
                            >
                              <span className={'domain-icon color-' + i}>
                                <Layers size={19} />
                              </span>
                              <div className="domain-info">
                                <div>
                                  <strong>{d}</strong>
                                  <span>{h.length ? `${p}%` : '未学習'}</span>
                                </div>
                                <div className="progress-track">
                                  <span style={{ width: p + '%' }} />
                                </div>
                                <small>
                                  {h.length} 回解答 ·{' '}
                                  {
                                    state.catalog.filter((q) => q.domain === d)
                                      .length
                                  }{' '}
                                  問収録
                                </small>
                              </div>
                              <ChevronRight size={17} />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    <section className="panel review-panel">
                      <div className="section-title">
                        <div>
                          <h2>復習で、理解を確かなものに。</h2>
                          <p>もう一度考えることが、力になる。</p>
                        </div>
                      </div>
                      <button
                        className="review-link"
                        onClick={() => {
                          setReviewTab('wrong');
                          navigate('review');
                        }}
                      >
                        <span className="review-icon orange">
                          <RotateCcw />
                        </span>
                        <div>
                          <strong>間違えた・自信がない問題</strong>
                          <small>判断のポイントを振り返る</small>
                        </div>
                        <b>{state.wrong.length}</b>
                        <ChevronRight size={16} />
                      </button>
                      <button
                        className="review-link"
                        onClick={() => {
                          setReviewTab('bookmarks');
                          navigate('review');
                        }}
                      >
                        <span className="review-icon purple">
                          <Bookmark />
                        </span>
                        <div>
                          <strong>ブックマーク</strong>
                          <small>気になった問題をもう一度</small>
                        </div>
                        <b>{state.bookmarks.length}</b>
                        <ChevronRight size={16} />
                      </button>
                      <div className="tip">
                        <span>LEARNING TIP</span>
                        <p>
                          正解だけでなく「ほかの選択肢がなぜ違うのか」も説明できると、理解が深まります。
                        </p>
                      </div>
                    </section>
                  </div>
                  <section className="panel recent-panel">
                    <div className="section-title">
                      <div>
                        <h2>最近の演習</h2>
                        <p>積み重ねた学習の記録</p>
                      </div>
                    </div>
                    {!state.exercises.length ? (
                      <div className="empty-inline">
                        <BookOpen size={24} />
                        <span>
                          まだ演習の記録はありません。最初の一歩をはじめましょう。
                        </span>
                      </div>
                    ) : (
                      state.exercises.slice(0, 5).map((e) => (
                        <button
                          className="history-row"
                          key={e.id}
                          onClick={() => run(() => openExercise(e.id))}
                        >
                          <span className="history-icon">
                            <BookOpen size={18} />
                          </span>
                          <div>
                            <strong>{e.total}問の演習</strong>
                            <small>
                              {new Date(e.createdAt).toLocaleString('ja-JP')}
                            </small>
                          </div>
                          <span
                            className={
                              'status-badge ' +
                              (e.answered === e.total ? 'done' : '')
                            }
                          >
                            {e.answered === e.total ? '完了' : '学習中'}
                          </span>
                          <span>
                            {e.answered === e.total
                              ? `${e.correct} / ${e.total} 問正解`
                              : `${e.answered} / ${e.total} 問回答`}
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))
                    )}
                  </section>
                </>
              )}
              {view === 'practice' && (
                <>
                  <PageHeading
                    eyebrow="PRACTICE"
                    title="今日の演習を設定する"
                    text="分野と問題数を選んで、自分のペースで進めましょう。"
                  />
                  <section className="panel form-panel">
                    <h2>演習設定</h2>
                    <label className="field">
                      出題範囲
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        <option value="all">すべての問題</option>
                        <option value="wrong">間違えた・自信がない問題</option>
                        <option value="bookmarks">ブックマークした問題</option>
                      </select>
                    </label>
                    <label className="field">
                      分野
                      <select
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                      >
                        <option value="all">すべての分野</option>
                        {state.domains.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      問題数
                      <select
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      >
                        {[3, 5, 10, 20].map((n) => (
                          <option key={n} value={n}>
                            {n}問
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="help">
                      対象の問題が指定数より少ない場合は、対象の全問を出題します。回答ごとに解説を確認でき、進捗は自動保存されます。
                    </p>
                    <div className="sample-note">
                      収録中の問題は動作確認用のサンプルです。本番レベルの予想問題ではありません。
                    </div>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={start}
                    >
                      演習を開始する
                      <ArrowRight size={18} />
                    </button>
                  </section>
                </>
              )}
              {view === 'review' && (
                <>
                  <PageHeading
                    eyebrow="REVIEW NOTE"
                    title="振り返りを、次の正解へ。"
                    text="不正解や自信がなかった問題は、直近の解答に基づいて表示します。"
                  />
                  <div className="tabs">
                    <button
                      className={reviewTab === 'wrong' ? 'selected' : ''}
                      onClick={() => setReviewTab('wrong')}
                    >
                      間違えた・自信がない問題 <span>{state.wrong.length}</span>
                    </button>
                    <button
                      className={reviewTab === 'bookmarks' ? 'selected' : ''}
                      onClick={() => setReviewTab('bookmarks')}
                    >
                      ブックマーク <span>{state.bookmarks.length}</span>
                    </button>
                  </div>
                  <section className="panel">
                    <div className="section-title">
                      <h2>{reviewIds.length}問の復習リスト</h2>
                      <button
                        className="button primary"
                        disabled={!reviewIds.length}
                        onClick={() => {
                          setMode(reviewTab);
                          setDomain('all');
                          navigate('practice');
                        }}
                      >
                        まとめて復習
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    {!reviewIds.length ? (
                      <div className="empty-state">
                        <CheckCircle2 size={36} />
                        <h3>復習する問題はまだありません</h3>
                        <p>
                          演習で間違えた問題や、保存した問題がここに表示されます。
                        </p>
                      </div>
                    ) : (
                      state.catalog
                        .filter((q) => reviewIds.includes(q.id))
                        .map((q) => (
                          <div className="review-question" key={q.id}>
                            <div>
                              <span className="tag">{q.domain}</span>
                              <p>{q.question}</p>
                            </div>
                            <button
                              className={
                                'icon-button ' +
                                (state.bookmarks.includes(q.id) ? 'marked' : '')
                              }
                              aria-label="ブックマーク切り替え"
                              disabled={busy}
                              onClick={() => mark(q.id)}
                            >
                              <Bookmark
                                size={19}
                                fill={
                                  state.bookmarks.includes(q.id)
                                    ? 'currentColor'
                                    : 'none'
                                }
                              />
                            </button>
                          </div>
                        ))
                    )}
                  </section>
                </>
              )}
              {view === 'question' && q && exercise && (
                <>
                  <div className="question-top">
                    <button
                      className="text-button"
                      onClick={() =>
                        run(async () => {
                          await refresh();
                          navigate('home');
                        })
                      }
                    >
                      <ArrowLeft size={16} />
                      中断してホームへ
                    </button>
                    <span>
                      {index + 1} / {exercise.questions.length} 問
                    </span>
                  </div>
                  <div className="progress-track exercise-progress">
                    <span
                      style={{
                        width: `${(exercise.questions.filter((q) => q.answer).length / exercise.questions.length) * 100}%`,
                      }}
                    />
                  </div>
                  <section className="panel question-panel">
                    <div className="question-meta">
                      <span className="tag">{q.domain}</span>
                      {q.isSample && (
                        <span className="sample-label">サンプル問題</span>
                      )}
                      <button
                        className={
                          'icon-button ' +
                          (state.bookmarks.includes(q.id) ? 'marked' : '')
                        }
                        aria-label="ブックマーク切り替え"
                        disabled={busy}
                        onClick={() => mark(q.id)}
                      >
                        <Bookmark
                          fill={
                            state.bookmarks.includes(q.id)
                              ? 'currentColor'
                              : 'none'
                          }
                          size={21}
                        />
                      </button>
                    </div>
                    <div className="eyebrow">
                      QUESTION {String(index + 1).padStart(2, '0')} ·{' '}
                      {q.type === 'multiple' ? '複数選択' : '単一選択'}
                    </div>
                    <h1 className="question-text">{q.question}</h1>
                    <div className="service-tags">
                      {q.services.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    <div className="choices">
                      {q.choices.map((choice) => {
                        const chosen = (
                          q.answer?.selected ?? selected
                        ).includes(choice.id);
                        const correct = q.answer?.correctAnswers.includes(
                          choice.id,
                        );
                        return (
                          <button
                            disabled={!!q.answer || busy}
                            key={choice.id}
                            aria-pressed={chosen}
                            className={
                              'choice ' +
                              (chosen ? 'chosen ' : '') +
                              (q.answer
                                ? correct
                                  ? 'correct'
                                  : chosen
                                    ? 'incorrect'
                                    : ''
                                : '')
                            }
                            onClick={() =>
                              setSelected(
                                q.type === 'single'
                                  ? [choice.id]
                                  : selected.includes(choice.id)
                                    ? selected.filter((x) => x !== choice.id)
                                    : [...selected, choice.id],
                              )
                            }
                          >
                            <span className="choice-letter">
                              {choice.id.toUpperCase()}
                            </span>
                            <span>{choice.text}</span>
                            {q.answer ? (
                              correct ? (
                                <Check size={20} />
                              ) : chosen ? (
                                <X size={20} />
                              ) : null
                            ) : chosen ? (
                              <CheckCircle2 size={20} />
                            ) : (
                              <Circle size={20} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {!q.answer ? (
                      <>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={uncertain}
                            onChange={(e) => setUncertain(e.target.checked)}
                          />
                          自信がないので、あとで復習する
                        </label>
                        <div className="question-actions">
                          <p>回答を確定すると解説が表示されます。</p>
                          <button
                            className="button primary"
                            disabled={!selected.length || busy}
                            onClick={() =>
                              run(async () => {
                                const result = await api<Exercise>('answer', {
                                  exerciseId: exercise.id,
                                  questionId: q.id,
                                  selected,
                                  uncertain,
                                });
                                setExercise(result);
                                await refresh();
                              })
                            }
                          >
                            回答を確定
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="answer-section">
                        <div
                          className={
                            'answer-heading ' +
                            (q.answer.correct ? 'right' : 'wrong')
                          }
                        >
                          {q.answer.correct ? <CheckCircle2 /> : <X />}
                          <h2>
                            {q.answer.correct
                              ? '正解です！'
                              : 'もう一度、ポイントを確認しましょう'}
                          </h2>
                          <span>
                            正解：
                            {q.answer.correctAnswers
                              .map((x) => x.toUpperCase())
                              .join('・')}
                          </span>
                        </div>
                        <p className="explanation">{q.answer.explanation}</p>
                        <h3>各選択肢のポイント</h3>
                        {q.choices.map((x) => (
                          <div className="choice-explanation" key={x.id}>
                            <span
                              className={
                                q.answer!.correctAnswers.includes(x.id)
                                  ? 'correct-text'
                                  : ''
                              }
                            >
                              {x.id.toUpperCase()}
                            </span>
                            <p>{q.answer!.choiceExplanations[x.id]}</p>
                          </div>
                        ))}
                        <div className="reference-links">
                          {q.answer.references.map((r, i) => (
                            <a
                              key={r}
                              href={r}
                              target="_blank"
                              rel="noreferrer"
                            >
                              AWS公式ドキュメント {i + 1} ↗
                            </a>
                          ))}
                        </div>
                        <div className="question-actions">
                          <button
                            className="button secondary"
                            disabled={index === 0}
                            onClick={() => setIndex(index - 1)}
                          >
                            <ArrowLeft size={17} />
                            前の問題
                          </button>
                          <button
                            className="button primary"
                            onClick={() => {
                              if (index < exercise.questions.length - 1)
                                setIndex(index + 1);
                              else if (complete) navigate('result');
                              else
                                setIndex(
                                  exercise.questions.findIndex(
                                    (q) => !q.answer,
                                  ),
                                );
                            }}
                          >
                            {index < exercise.questions.length - 1
                              ? '次の問題へ'
                              : complete
                                ? '結果を見る'
                                : '未回答の問題へ'}
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
              {view === 'result' && exercise && (
                <>
                  <PageHeading
                    eyebrow="PRACTICE COMPLETE"
                    title="おつかれさまでした。"
                    text="解説を振り返って、次の学習につなげましょう。"
                  />
                  <section className="panel result-panel">
                    <span className="result-icon">
                      <CheckCircle2 size={42} />
                    </span>
                    <h2>今回の演習結果</h2>
                    <div className="result-score">
                      {
                        exercise.questions.filter((q) => q.answer?.correct)
                          .length
                      }
                      <span> / {exercise.questions.length} 問正解</span>
                    </div>
                    <p>
                      正答率{' '}
                      {percent(
                        exercise.questions.filter((q) => q.answer?.correct)
                          .length,
                        exercise.questions.length,
                      )}
                      %
                    </p>
                    <div className="result-list">
                      {exercise.questions.map((q, i) => (
                        <button
                          key={q.id}
                          onClick={() => {
                            setIndex(i);
                            navigate('question');
                          }}
                        >
                          {q.answer?.correct ? (
                            <CheckCircle2 className="correct-text" size={20} />
                          ) : (
                            <X className="incorrect-text" size={20} />
                          )}
                          <span>
                            問{i + 1} · {q.domain}
                          </span>
                          {q.answer?.uncertain && (
                            <span className="sample-label">要復習</span>
                          )}
                          <ChevronRight size={17} />
                        </button>
                      ))}
                    </div>
                    <div className="result-actions">
                      <button
                        className="button secondary"
                        onClick={() => navigate('home')}
                      >
                        ホームへ
                      </button>
                      <button
                        className="button primary"
                        onClick={() => {
                          setMode('wrong');
                          setDomain('all');
                          navigate('practice');
                        }}
                      >
                        苦手な問題を復習する
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </section>
                </>
              )}
              {view === 'settings' && (
                <>
                  <PageHeading
                    eyebrow="ACCOUNT"
                    title="アカウント設定"
                    text={`ログイン中のユーザー：${user.username}`}
                  />
                  <PasswordForm
                    busy={busy}
                    onSubmit={(current, password) =>
                      run(async () => {
                        await api('password', { current, password });
                        setNotice(
                          'パスワードを変更しました。他の端末のログインは解除されました。',
                        );
                      })
                    }
                  />
                </>
              )}
              <footer className="footer">
                <span>
                  STACKUP <span>·</span> Learn. Understand. Build.
                </span>
                <span>AWS非公式の学習アプリ · サンプル問題収録</span>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  suffix,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
  note: string;
}) {
  return (
    <section className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <span>{suffix}</span>
      </div>
      <p>{note}</p>
    </section>
  );
}
function Auth({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  onSubmit: (u: string, p: string, r: boolean) => void;
}) {
  const [register, setRegister] = useState(false),
    [mismatch, setMismatch] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMismatch('');
    const d = new FormData(e.currentTarget);
    const p = String(d.get('password'));
    if (register && p !== d.get('confirm')) {
      setMismatch('パスワードが一致しません');
      return;
    }
    onSubmit(String(d.get('username')), p, register);
  }
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="brand">
          <span className="brand-icon">
            <Layers />
          </span>
          <span>
            STACKUP<small>AWS SAP LEARNING</small>
          </span>
        </div>
        <div>
          <div className="eyebrow">BUILD YOUR NEXT CHAPTER</div>
          <h1>
            知る。その先の、
            <br />
            設計する力へ。
          </h1>
          <p>
            AWS Solutions Architect – Professional
            <br />
            一問ずつ、理解を積み重ねよう。
          </p>
          <div className="auth-art">
            <ShieldCheck size={110} />
            <span>PROFESSIONAL</span>
          </div>
        </div>
        <small>AWS非公式の学習アプリ</small>
      </div>
      <main className="auth-main">
        <div className="auth-card">
          <span className="tag">YOUR LEARNING SPACE</span>
          <h1>{register ? '学習をはじめましょう' : 'おかえりなさい。'}</h1>
          <p>
            {register
              ? '自分だけの学習記録を作成しましょう。'
              : 'ログインして、前回の続きから。'}
          </p>
          <div className="tabs">
            <button
              className={!register ? 'selected' : ''}
              onClick={() => {
                setRegister(false);
                setMismatch('');
              }}
            >
              ログイン
            </button>
            <button
              className={register ? 'selected' : ''}
              onClick={() => {
                setRegister(true);
                setMismatch('');
              }}
            >
              新規登録
            </button>
          </div>
          {(error || mismatch) && (
            <div className="alert error" role="alert">
              {mismatch || error}
            </div>
          )}
          <form onSubmit={submit}>
            <label className="field">
              ユーザーID
              <input
                aria-label="ユーザーID"
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,24}"
                minLength={3}
                maxLength={24}
                autoComplete="username"
                placeholder="例：aws_learner"
              />
              <small>
                半角英数字・_、3〜24文字（大文字と小文字は区別しません）
              </small>
            </label>
            <label className="field">
              パスワード
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="12文字以上"
              />
            </label>
            {register && (
              <label className="field">
                パスワード（確認）
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            )}
            <div className="sample-note">
              メールアドレスは不要です。パスワードを忘れた場合、アカウントを復旧できません。安全な場所に保管してください。
            </div>
            <button
              className="button primary full"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : register ? (
                'アカウントを作成'
              ) : (
                'ログイン'
              )}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-footnote">収録問題は動作確認用のサンプルです。</p>
        </div>
      </main>
    </div>
  );
}
function PasswordForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (c: string, p: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  return (
    <section className="panel form-panel">
      <h2>パスワードを変更</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            d = new FormData(form);
          if (d.get('password') !== d.get('confirm')) {
            setError('新しいパスワードが一致しません');
            return;
          }
          setError('');
          await onSubmit(String(d.get('current')), String(d.get('password')));
        }}
      >
        <label className="field">
          現在のパスワード
          <input
            type="password"
            name="current"
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </label>
        <label className="field">
          新しいパスワード
          <input
            type="password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          新しいパスワード（確認）
          <input
            type="password"
            name="confirm"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        {error && (
          <p role="alert" className="incorrect-text">
            {error}
          </p>
        )}
        <p className="help">
          変更すると他の端末のログインは解除されます。パスワードリセット機能はありません。
        </p>
        <button className="button primary" disabled={busy}>
          パスワードを変更
        </button>
      </form>
    </section>
  );
}
