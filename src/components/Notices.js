import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// IMPORTANT: use || so empty string falls back correctly
const BACKEND_URL = import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000';

// If you want only admins to post, set this to false and let backend enforce.
const SHOW_CREATE_FORM = true;

const CATS = [
  { value: 'event', label: 'Event' },
  { value: 'competition', label: 'Competition' },
  { value: 'notice', label: 'Notice' },
  { value: 'other', label: 'Other' },
];

export default function Notices() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Create form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('event');
  const [link, setLink] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('category', filter);
      if (activeOnly) params.set('active', 'true');

      const res = await fetch(`${BACKEND_URL}/api/notices?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load notices (${res.status}). ${text.slice(0, 160)}`);
      }
      const json = await res.json();
      setItems(json.items || []);
    } catch (e) {
      setErr(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeOnly]);

  const submit = async (e) => {
    e.preventDefault();
    if (!currentUser) return setErr('Please log in to post.');
    setPosting(true);
    setErr('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          category,
          link: link || null,
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          pinned,
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email || 'User',
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Failed to post (${res.status}). ${text.slice(0, 160)}`);

      const data = JSON.parse(text);
      setItems((prev) => [data, ...prev]); // optimistic add
      setTitle('');
      setBody('');
      setCategory('event');
      setLink('');
      setStartAt('');
      setEndAt('');
      setTags('');
      setPinned(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="page-container">
      <h2>📣 Announcements & Updates</h2>
      <p className="subtitle">Post and browse events, competitions, and important notices.</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Show active only
        </label>
        <button onClick={load} style={{ width: 'auto' }}>
          Refresh
        </button>
      </div>

      {err && <p style={{ color: 'var(--error-color)' }}>{err}</p>}

      {/* Create form */}
      {SHOW_CREATE_FORM && currentUser && (
        <div className="form-container analytics-card" style={{ marginBottom: '1.5rem' }}>
          <h4>Post a New Announcement</h4>
          <form className="review-form" onSubmit={submit}>
            <div className="form-row">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Details (what, where, how to join…)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <div className="form-row">
              <input
                type="url"
                placeholder="Optional Link (registration/info)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div className="form-row">
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin to top
            </label>
            <button type="submit" disabled={posting}>
              {posting ? 'Posting…' : 'Publish'}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      <div className="reviews-list">
        {loading && <p>Loading…</p>}
        {!loading && items.length === 0 && <p>No announcements yet.</p>}
        {items.map((n) => {
          const date = n.startAt ? new Date(n.startAt) : null;
          const end = n.endAt ? new Date(n.endAt) : null;
          return (
            <div
              key={n.id || `${n.title}-${n.createdAt}`}
              className="analytics-card"
              style={{ marginBottom: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <h4 style={{ marginTop: 0 }}>
                    {n.pinned ? '📌 ' : ''}
                    {n.title}
                    <span 
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#eef2ff',
                        color: '#4f46e5',
                      }}
                    >
                      {(n.category || 'notice').toUpperCase()}
                    </span>
                  </h4>
                  <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{n.body}</p>
                  {n.tags?.length ? (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {n.tags.map((t, i) => (
                        <span key={i} className="pill">
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right', minWidth: 200 }}>
                  {date && (
                    <div>
                      <strong>Starts:</strong> {date.toLocaleString()}
                    </div>
                  )}
                  {end && (
                    <div>
                      <strong>Ends:</strong> {end.toLocaleString()}
                    </div>
                  )}
                  {n.link && (
                    <div style={{ marginTop: 8 }}>
                      <a href={n.link} target="_blank" rel="noreferrer">
                        Open link ↗
                      </a>
                    </div>
                  )}
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                    Posted by {n.createdByName || 'Staff'} • {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
