import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

function ProfileAchievements({ userId, compact = false }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users', userId, 'achievements'),
          orderBy('dateEarned', 'desc')
        );
        const snap = await getDocs(q);
        setAchievements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to fetch achievements:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [userId]);

  if (loading) {
    return <p className="achievement-loading">Loading achievements…</p>;
  }

  if (!achievements.length) {
    return (
      <p className="achievement-empty">
        No achievements yet. Add your first milestone to build your academic portfolio.
      </p>
    );
  }

  // compact mode is handy later for “chips” in group chat etc.
  if (compact) {
    return (
      <div className="achievement-badge-row">
        {achievements.map((a) => (
          <span
            key={a.id}
            className={`achievement-chip ${a.type || ''}`}
            title={a.description || ''}
          >
            {a.title}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="achievement-list-wrapper">
      <h3 className="achievement-list-title">My Highlighted Achievements</h3>
      <div className="achievement-list">
        {achievements.map((a) => (
          <div key={a.id} className="achievement-item-card">
            <div className="achievement-item-top">
              <div>
                <div className="achievement-item-title">{a.title}</div>
                <div className="achievement-item-tags">
                  {a.type && (
                    <span className="pill pill-type">
                      {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                    </span>
                  )}
                  {a.course && <span className="pill">{a.course}</span>}
                  {a.score != null && <span className="pill">Score {a.score}%</span>}
                  {a.shared === false && <span className="pill pill-private">Private</span>}
                </div>
              </div>
              {a.dateEarned?.toDate && (
                <div className="achievement-item-date">
                  {a.dateEarned.toDate().toLocaleDateString()}
                </div>
              )}
            </div>

            {a.description && (
              <p className="achievement-item-desc">{a.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileAchievements;
