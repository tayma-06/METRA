import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

const CATEGORIES = ['Notes', 'Slides', 'Past Paper', 'Book', 'Other'];
const SORT_OPTIONS = [
  { v: 'createdAt_desc', label: 'Newest' },
  { v: 'likes_desc', label: 'Most liked' },
  { v: 'clicks_desc', label: 'Most opened' },
];

function MaterialRepository() {
  const { currentUser } = useAuth();

  // list + ui state
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // form state
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Notes');
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // search / filter / sort
  const [q, setQ] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const myUid = currentUser?.uid || '';

  // === Fetch materials ===
  const fetchMaterials = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (courseFilter) params.set('course', courseFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (sort) params.set('sort', sort);
      params.set('limit', '100');

      const res = await fetch(`${BACKEND_URL}/api/materials?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch materials.');
      let data = await res.json();

      // client-side trims
      if (onlyMine && myUid) data = data.filter(m => m.authorId === myUid);
      if (onlyBookmarked && myUid) data = data.filter(m => (m.bookmarkedBy || []).includes(myUid));

      setMaterials(data);
    } catch (e) {
      setError(e.message || 'Failed to fetch materials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); /* eslint-disable-next-line */ }, []);
  // refetch when filters change (debounce q in real apps)
  useEffect(() => { fetchMaterials(); /* eslint-disable-next-line */ }, [q, courseFilter, categoryFilter, sort, onlyMine, onlyBookmarked]);

  // === Create material ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setMessage('');
    if (!course || !title || !category || !link) {
      setFormError('Please fill out all fields.');
      return;
    }
    if (!/^https?:\/\//i.test(link)) {
      setFormError('Please enter a valid link (e.g., https://...)');
      return;
    }
    setIsSubmitting(true);
    try {
      const authorId = myUid || `anonymous-${Math.random().toString(36).slice(2, 9)}`;
      const authorName = currentUser?.displayName || (myUid ? 'Authenticated User' : 'Anonymous');

      const res = await fetch(`${BACKEND_URL}/api/materials/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, title, category, link, authorId, authorName }),
      });
      if (!res.ok) throw new Error('Failed to share material.');
      const created = await res.json();
      setMaterials(prev => [created, ...prev]);
      setMessage('Material shared successfully!');
      setCourse(''); setTitle(''); setCategory('Notes'); setLink('');
    } catch (e) {
      setFormError(e.message || 'Failed to share material.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // === Delete ===
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? This cannot be undone.')) return;
    setError(''); setMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/materials/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myUid || 'temp-user' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete material.');
      setMaterials(prev => prev.filter(m => m.id !== id));
      setMessage('Material deleted.');
    } catch (e) {
      setError(e.message);
    }
  };

  // === Like / Unlike (optimistic) ===
  const toggleLike = async (m) => {
    if (!myUid) { setMessage('Sign in to like.'); return; }
    const liked = (m.likedBy || []).includes(myUid);
    // optimistic UI
    setMaterials(prev => prev.map(x => x.id === m.id ? {
      ...x,
      likes: (x.likes || 0) + (liked ? -1 : 1),
      likedBy: liked ? (x.likedBy || []).filter(u => u !== myUid) : [...(x.likedBy || []), myUid],
    } : x));
    try {
      await fetch(`${BACKEND_URL}/api/materials/${m.id}/like`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myUid, like: !liked })
      });
    } catch { /* ignore – optimistic */ }
  };

  // === Bookmark / Unbookmark (optimistic) ===
  const toggleBookmark = async (m) => {
    if (!myUid) { setMessage('Sign in to bookmark.'); return; }
    const marked = (m.bookmarkedBy || []).includes(myUid);
    setMaterials(prev => prev.map(x => x.id === m.id ? {
      ...x,
      bookmarkedBy: marked ? (x.bookmarkedBy || []).filter(u => u !== myUid) : [...(x.bookmarkedBy || []), myUid],
    } : x));
    try {
      await fetch(`${BACKEND_URL}/api/materials/${m.id}/bookmark`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myUid, bookmark: !marked })
      });
    } catch { /* ignore */ }
  };

  // === Track click then open ===
  const openMaterial = async (m) => {
    try {
      fetch(`${BACKEND_URL}/api/materials/${m.id}/click`, { method: 'POST' }).catch(()=>{});
    } finally {
      window.open(m.link, '_blank', 'noopener,noreferrer');
    }
  };

  // === Report broken/inappropriate ===
  const reportMaterial = async (m) => {
    const reason = window.prompt('Report this material. Reason? (e.g., broken link, wrong course, inappropriate)');
    if (!reason) return;
    try {
      await fetch(`${BACKEND_URL}/api/materials/${m.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      setMessage('Thanks. We recorded your report.');
    } catch {
      setError('Failed to send report.');
    }
  };

  const coursesInList = useMemo(
    () => Array.from(new Set(materials.map(m => m.course).filter(Boolean))).sort(),
    [materials]
  );

  return (
    <div className="page-container">
      <h2>📚 Centralized Material Repository</h2>
      <p className="subtitle">
        Find and share notes, slides, and past papers using shareable links (e.g., Google Drive).
      </p>

      {/* Share form */}
      <div className="form-container analytics-card">
        <h4>Share a Resource</h4>
        <form onSubmit={handleSubmit} className="review-form">
          {formError && <p style={{ color: 'red' }}>{formError}</p>}
          {message && !formError && <p style={{ color: 'green' }}>{message}</p>}

          <div className="form-row">
            <input
              type="text"
              placeholder="Course Code (e.g., CSE321)"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
            <input
              type="text"
              placeholder="Title (e.g., Midterm 2023 Solved)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="Shareable Link (e.g., Google Drive)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sharing...' : 'Share Material'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="analytics-card" style={{ marginTop: '1rem', paddingTop: '0.8rem' }}>
        <div className="form-row" style={{ alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search title or course…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All Courses</option>
            {coursesInList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Only my uploads
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={onlyBookmarked}
              onChange={(e) => setOnlyBookmarked(e.target.checked)}
            />
            Bookmarked
          </label>
          <button type="button" onClick={fetchMaterials} style={{ marginLeft: 'auto' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <h3 style={{ marginTop: '1.4rem' }}>Shared Materials</h3>
      {isLoading && <p>Loading materials...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && materials.length === 0 && <p>No materials match your filters.</p>}

      <div className="reviews-list">
        {materials.map((m) => {
          const iLike = (m.likedBy || []).includes(myUid);
          const iSaved = (m.bookmarkedBy || []).includes(myUid);
          return (
            <div key={m.id} className="review-card analytics-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <span
                    style={{
                      backgroundColor: '#eef2ff',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      color: '#4338ca'
                    }}
                  >
                    {m.category}
                  </span>
                  <h4 style={{ margin: '0.5rem 0 0.25rem 0' }}>{m.title}</h4>
                  <p style={{ margin: 0, color: '#5f6368' }}>For Course: {m.course}</p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: 12, color: '#6b7280' }}>
                    Posted by: {m.authorName || 'Anonymous'}
                  </p>
                </div>

                {(currentUser && (myUid === m.authorId || currentUser.role === 'admin')) && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#d9534f',
                      border: '1px solid #d9534f',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      height: 36
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* actions row */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => toggleLike(m)}
                  title={iLike ? 'Unlike' : 'Like'}
                  style={{ padding: '6px 10px' }}
                >
                  {iLike ? '❤️' : '🤍'} {m.likes || 0}
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmark(m)}
                  title={iSaved ? 'Remove bookmark' : 'Bookmark'}
                  style={{ padding: '6px 10px' }}
                >
                  {iSaved ? '🔖 Saved' : '🔖 Save'}
                </button>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  Opens: {m.clicks || 0}
                </span>
                <button
                  type="button"
                  onClick={() => reportMaterial(m)}
                  title="Report"
                  style={{ marginLeft: 'auto', padding: '6px 10px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: 8 }}
                >
                  Report
                </button>
              </div>

              <button
                onClick={() => openMaterial(m)}
                style={{
                  textDecoration: 'none',
                  display: 'inline-block',
                  width: '100%',
                  textAlign: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#007aff',
                  color: 'white',
                  borderRadius: 8,
                  marginTop: 12,
                  fontWeight: 500
                }}
              >
                Open Material
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MaterialRepository;
