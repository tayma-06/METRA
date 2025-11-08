import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = import.meta?.env?.VITE_BACKEND_URL ?? 'http://localhost:8000';

function Dashboard() {
  const { currentUser } = useAuth();

  // --- New: Personalized payload ---
  const [pData, setPData] = useState(null);
  const [pState, setPState] = useState({ loading: true, error: '' });

  // --- Existing: Summary cards (Hub/Materials/Groups) ---
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Team members data - only names
  const teamMembers = [
    { name: 'Jeba Sajida' },
    { name: 'Kanetah Khan' },
    { name: 'Khadiza Sultana' },
    { name: 'Anika Tahsin Rahman' },
  ];

  // --- Fetch both personalized dashboard & summary in parallel ---
  useEffect(() => {
    let ignore = false;

    const fetchPersonalized = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/personalized-dashboard?uid=${currentUser?.uid}`
        );
        if (!res.ok) throw new Error('Failed to load personalized dashboard');
        const json = await res.json();
        if (!ignore) setPData(json);
      } catch (e) {
        if (!ignore) setPState((s) => ({ ...s, error: e.message }));
      } finally {
        if (!ignore) setPState((s) => ({ ...s, loading: false }));
      }
    };

    const fetchSummary = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard-summary`);
        if (!res.ok) throw new Error('Failed to fetch dashboard summary');
        const json = await res.json();
        if (!ignore) setSummary(json);
      } catch (e) {
        // keep silent UI; you can surface an inline error if preferred
      } finally {
        if (!ignore) setIsLoadingSummary(false);
      }
    };

    fetchPersonalized();
    fetchSummary();
    return () => {
      ignore = true;
    };
  }, [currentUser?.uid]);

  // Quick actions (unchanged)
  const quickActions = [
    { icon: '🚀', label: 'Quick Question', path: '/solver', color: '#007aff' },
    { icon: '📚', label: 'Browse Materials', path: '/materials', color: '#5856d6' },
    { icon: '👥', label: 'Find Groups', path: '/groups', color: '#ff2d55' },
    { icon: '💬', label: 'Ask Seniors', path: '/hub', color: '#ff9500' },
  ];

  // Local progress bar
  const ProgressBar = ({ completed = 0, total = 0 }) => {
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return (
      <div>
        <div className="pbar-outer">
          <div className="pbar-inner" style={{ width: `${pct}%` }} />
        </div>
        <div className="pbar-text">
          {completed} of {total} tasks • {pct}%
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      {/* Welcome */}
      <div className="welcome-section-simple">
        <h1>Welcome back, {currentUser?.displayName || 'Student'}!</h1>
        <p className="welcome-sub">
          Your dashboard adapts to your goals, weak areas, and recent progress.
        </p>
      </div>

      {/* =========================
          AI-Personalized Section
         ========================= */}
      <div className="personalized-section">
        <h3>✨ Personalized for You</h3>

        {pState.loading && <p className="loading-line">Loading your personalized insights…</p>}
        {pState.error && <p className="error-line">{pState.error}</p>}

        {pData && (
          <div className="dashboard-grid">
            {/* Overview */}
            <div className="analytics-card">
              <h4>Overview</h4>
              <p className="mt-0">{pData.greeting}</p>
              <div className="kv">
                <span className="kv-key">Peer Percentile</span>
                <span className="kv-val">Top {pData?.progress?.percentile ?? 0}%</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <ProgressBar
                  completed={pData?.progress?.completed ?? 0}
                  total={pData?.progress?.total ?? 0}
                />
              </div>
            </div>

            {/* Focus: Weak Areas + Goals */}
            <div className="analytics-card">
              <h4>Your Focus</h4>
              <div className="two-col">
                <div>
                  <p><strong>Weak Areas</strong></p>
                  <ul className="tight-list">
                    {(pData?.weakAreas ?? []).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {(pData?.weakAreas ?? []).length === 0 && <li>No weak areas identified yet.</li>}
                  </ul>
                </div>
                <div>
                  <p><strong>Goals</strong></p>
                  <ul className="tight-list">
                    {(pData?.goals ?? []).map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                    {(pData?.goals ?? []).length === 0 && <li>Add goals from Progress page.</li>}
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="analytics-card">
              <h4>AI Recommendations</h4>
              <ul className="tight-list">
                {(pData?.recommendations ?? []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="cta-row">
                <Link to="/progress" className="cta-pill">Open My Progress</Link>
                <Link to="/solver" className="cta-pill alt">Practice With AI</Link>
              </div>
            </div>

            {/* Resources */}
            <div className="analytics-card">
              <h4>Resources For You</h4>
              <ul className="tight-list">
                {(pData?.resources ?? []).map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  </li>
                ))}
                {(pData?.resources ?? []).length === 0 && <li>No recommendations yet.</li>}
              </ul>
              <p className="muted mt-1">Tip: Save any link to your Materials for quick access.</p>
            </div>

            {/* Next Actions */}
            <div className="analytics-card">
              <h4>Next Actions</h4>
              <ul className="tight-list">
                {(pData?.nextActions ?? []).map((a, i) => (
                  <li key={i}>
                    <label className="checkline">
                      <input type="checkbox" /> <span>{a}</span>
                    </label>
                  </li>
                ))}
                {(pData?.nextActions ?? []).length === 0 && <li>Nothing queued — add tasks from Progress.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className="quick-action-card"
              style={{ '--action-color': action.color }}
            >
              <div className="action-icon" style={{ backgroundColor: action.color }}>
                {action.icon}
              </div>
              <span className="action-label">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Live Activity */}
      <div className="activity-section">
        <h3>Live Activity</h3>
        <div className="dashboard-summary-grid">
          {/* Latest Senior Hub Post */}
          <Link to="/hub" className="summary-card hub-card">
            <div className="card-header">
              <div className="card-icon">💡</div>
              <h4>New in Senior Hub</h4>
            </div>
            <div className="card-content">
              {isLoadingSummary ? (
                <div className="loading-skeleton"></div>
              ) : summary && summary.latestPost ? (
                <>
                  <p className="summary-text">"{summary.latestPost.question}"</p>
                  <div className="card-meta">
                    <span className="meta-tag">New Post</span>
                  </div>
                </>
              ) : (
                <p className="summary-text">No new posts yet.</p>
              )}
            </div>
          </Link>

          {/* Newest Material */}
          <Link to="/materials" className="summary-card materials-card">
            <div className="card-header">
              <div className="card-icon">📚</div>
              <h4>Newest Material</h4>
            </div>
            <div className="card-content">
              {isLoadingSummary ? (
                <div className="loading-skeleton"></div>
              ) : summary && summary.latestMaterial ? (
                <>
                  <p className="summary-text">{summary.latestMaterial.title}</p>
                  <div className="card-meta">
                    <span className="meta-tag">{summary.latestMaterial.category}</span>
                  </div>
                </>
              ) : (
                <p className="summary-text">No new materials.</p>
              )}
            </div>
          </Link>

          {/* Open Study Group */}
          <Link to="/groups" className="summary-card groups-card">
            <div className="card-header">
              <div className="card-icon">👥</div>
              <h4>Open Study Group</h4>
            </div>
            <div className="card-content">
              {isLoadingSummary ? (
                <div className="loading-skeleton"></div>
              ) : summary && summary.openGroup ? (
                <>
                  <p className="summary-text">{summary.openGroup.name}</p>
                  <div className="card-meta">
                    <span className="meta-tag">
                      {summary.openGroup.memberIds?.length || 0} members
                    </span>
                  </div>
                </>
              ) : (
                <p className="summary-text">No open groups.</p>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="features-section">
        <h3>Explore Features</h3>
        <div className="dashboard-grid">
          <Link to="/reviews" className="feature-card">
            <div className="feature-icon">🎓</div>
            <h4>Course & Faculty Reviews</h4>
            <p>Make informed choices for next semester with real student experiences.</p>
            <div className="feature-badge">Updated Daily</div>
          </Link>

          <Link to="/hub" className="feature-card">
            <div className="feature-icon">💡</div>
            <h4>Senior Suggestion Hub</h4>
            <p>Get roadmaps and advice from experienced senior students.</p>
            <div className="feature-badge">Community</div>
          </Link>

          <Link to="/groups" className="feature-card">
            <div className="feature-icon">🤝</div>
            <h4>Smart Study Groups</h4>
            <p>Find your perfect study partners, intelligently matched by AI.</p>
            <div className="feature-badge">AI-Powered</div>
          </Link>

          <Link to="/solver" className="feature-card">
            <div className="feature-icon">🤖</div>
            <h4>AI Problem Solver</h4>
            <p>Get step-by-step solutions for tough problems instantly.</p>
            <div className="feature-badge">Instant Help</div>
          </Link>

          <Link to="/progress" className="feature-card">
            <div className="feature-icon">📈</div>
            <h4>Progress Analyst AI</h4>
            <p>See your personalized improvement plan and track growth.</p>
            <div className="feature-badge">Analytics</div>
          </Link>

          <Link to="/materials" className="feature-card">
            <div className="feature-icon">📚</div>
            <h4>Material Repository</h4>
            <p>Access notes, slides, past questions, and study resources.</p>
            <div className="feature-badge">Resource Hub</div>
          </Link>
        </div>
      </div>

      {/* Team Section (names only; no broken profile links) */}
      <div className="team-section">
        <div className="section-header">
          <h3>Meet Our Team</h3>
        </div>

        <div className="team-members-row">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="team-member-simple">
              <div className="member-name">{member.name}</div>
            </div>
          ))}
        </div>

        <div className="university-info">Islamic University of Technology</div>
      </div>

      {/* Inline styles for the new bits + your existing ones */}
      <style jsx>{`
        .dashboard { max-width: 1200px; margin: 0 auto; padding: 2rem; }

        /* Welcome */
        .welcome-section-simple { text-align: center; margin-bottom: 2rem; padding: 1.75rem 0; }
        .welcome-section-simple h1 { font-size: 2.25rem; font-weight: 700; margin: 0; color: var(--text-dark); }
        .welcome-sub { color: var(--text-light); margin: .5rem 0 0; }

        /* Personalized */
        .personalized-section { margin-bottom: 2.25rem; }
        .personalized-section h3 { margin: 0 0 1rem 0; font-size: 1.5rem; color: var(--text-dark); }
        .loading-line { color: var(--primary-color); }
        .error-line { color: var(--error-color); }

        .kv { display:flex; justify-content:space-between; background:#f8fafc; border:1px solid var(--border-color); padding:.6rem .8rem; border-radius:10px; }
        .kv-key { color:#6b7280; }
        .kv-val { font-weight:600; color:#111827; }

        .two-col { display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .tight-list { margin: .25rem 0 0; padding-left: 1rem; }
        .muted { color:#6b7280; }

        .cta-row { display:flex; gap:.5rem; margin-top: .75rem; }
        .cta-pill { background: var(--primary-color); color:#fff; padding:.55rem .9rem; border-radius:999px; text-decoration:none; font-weight:600; }
        .cta-pill.alt { background:#10b981; }

        .pbar-outer { height: 10px; background:#e5e7eb; border-radius:999px; overflow:hidden; }
        .pbar-inner { height:100%; background: var(--primary-color); transition: width .3s ease; }
        .pbar-text { margin-top: 6px; font-size: 13px; color:#6b7280; }

        /* Quick Actions (kept) */
        .quick-actions-section { margin-bottom: 3rem; }
        .quick-actions-section h3 { margin-bottom: 1.25rem; font-size: 1.25rem; color: var(--text-dark); }
        .quick-actions-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .quick-action-card { display:flex; flex-direction:column; align-items:center; padding:1.25rem; background:var(--card-background); border-radius:15px; text-decoration:none; color:var(--text-dark); transition:all .3s; border:1px solid var(--border-color); }
        .quick-action-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,.1); }
        .action-icon { width:60px; height:60px; border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:.75rem; }
        .action-label { font-weight:600; font-size:.95rem; }

        /* Live Activity (kept) */
        .activity-section { margin-bottom: 3rem; }
        .activity-section h3 { margin-bottom: 1.25rem; font-size: 1.25rem; color: var(--text-dark); }
        .dashboard-summary-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.25rem; }
        .summary-card { background: var(--card-background); border-radius:15px; padding:1.25rem; text-decoration:none; color:var(--text-dark); border:1px solid var(--border-color); transition:all .3s; position:relative; overflow:hidden; }
        .summary-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,.1); }
        .summary-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; }
        .hub-card::before{ background:#007aff; } .materials-card::before{ background:#5856d6; } .groups-card::before{ background:#00a859; }
        .card-header{ display:flex; align-items:center; gap:.75rem; margin-bottom:.75rem; }
        .card-icon{ width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; background: var(--light-blue); }
        .summary-text{ margin:0 0 .75rem 0; line-height:1.5; }
        .card-meta{ display:flex; gap:.5rem; }
        .meta-tag{ background: var(--light-blue); color: var(--primary-color); padding:.25rem .7rem; border-radius:12px; font-size:.8rem; font-weight:500; }
        .loading-skeleton{ height:20px; background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:loading 1.5s infinite; border-radius:4px; }
        @keyframes loading{ 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

        /* Features (kept) */
        .features-section { margin-bottom: 3rem; }
        .features-section h3 { margin-bottom: 1.25rem; font-size: 1.25rem; color: var(--text-dark); }
        .dashboard-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; }
        .feature-card{ background:var(--card-background); border-radius:15px; padding:1.5rem; text-decoration:none; color:var(--text-dark); border:1px solid var(--border-color); transition:all .3s; position:relative; }
        .feature-card:hover{ transform:translateY(-5px); box-shadow:0 15px 35px rgba(0,0,0,.1); border-color: var(--primary-color); }
        .feature-icon{ font-size:2rem; margin-bottom:.75rem; }
        .feature-card h4{ margin:0 0 .75rem; font-size:1.1rem; }
        .feature-card p{ margin:0 0 1rem; color:var(--text-light); }
        .feature-badge{ display:inline-block; background:var(--light-blue); color:var(--primary-color); padding:.35rem .8rem; border-radius:20px; font-size:.8rem; font-weight:600; }

        /* Team (kept but simplified links) */
        .team-section{ background: linear-gradient(135deg,#f4f7f6 0%,#e8eceb 100%); border-radius:20px; padding:1.75rem; text-align:center; }
        .section-header{ margin-bottom: 1.25rem; }
        .section-header h3{ font-size:1.4rem; margin:0; }
        .team-members-row{ display:flex; justify-content:center; align-items:center; gap:2rem; margin-bottom:1rem; flex-wrap:wrap; }
        .team-member-simple{ text-align:center; }
        .member-name{ font-size:1.05rem; font-weight:600; }
        .university-info{ font-size:.95rem; color:var(--text-light); font-style:italic; }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard{ padding: 1rem; }
          .two-col{ grid-template-columns: 1fr; }
          .quick-actions-grid{ grid-template-columns: repeat(2, 1fr); }
          .dashboard-summary-grid, .dashboard-grid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
