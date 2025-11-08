import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, addAchievement } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';


// ---------------- AddAchievement Component ----------------
function AddAchievement({ userId, onAdded }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('badge'); // badge | certificate | skill | project
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [score, setScore] = useState('');
  const [shared, setShared] = useState(true);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await addAchievement(userId, {
        title: title.trim(),
        type,
        description: description.trim(),
        course: course.trim(),
        score: score ? Number(score) : undefined,
        dateEarned: new Date(),
        shared
      });

      // reset
      setTitle('');
      setDescription('');
      setCourse('');
      setScore('');
      setType('badge');
      setShared(true);

      if (onAdded) onAdded();
    } catch (err) {
      console.error('Failed to add achievement:', err);
    }
  };

  return (
    <div className="achievement-card-wrapper">
      <div className="achievement-card-header">
        <h3>🏆 Achievements & Skills</h3>
        <p className="achievement-subtitle">
          Showcase your wins so others (and future recruiters) can see what you’re great at.
        </p>
      </div>

      <form onSubmit={handleAdd} className="achievement-form-grid">
        <div className="field-full">
          <label>Title<span className="required">*</span></label>
          <input
            type="text"
            placeholder="e.g. Dynamic Programming Mastery"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="field-full">
          <label>Description</label>
          <textarea
            placeholder="Short highlight of what you achieved…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="field-half">
          <label>Course / Context</label>
          <input
            type="text"
            placeholder="e.g. CSE420"
            value={course}
            onChange={e => setCourse(e.target.value)}
          />
        </div>

        <div className="field-half">
          <label>Score / Level (optional)</label>
          <input
            type="number"
            placeholder="e.g. 95"
            value={score}
            onChange={e => setScore(e.target.value)}
          />
        </div>

        <div className="field-half">
          <label>Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="badge">Badge</option>
            <option value="certificate">Certificate</option>
            <option value="skill">Skill</option>
            <option value="project">Project</option>
          </select>
        </div>

        <div className="field-half share-toggle">
          <label className="share-label">
            <input
              type="checkbox"
              checked={shared}
              onChange={e => setShared(e.target.checked)}
            />
            <span>Share publicly with others</span>
          </label>
          <small className="share-hint">
            When enabled, your group members can see this and get inspired or reach out to collaborate.
          </small>
        </div>

        <div className="field-full">
          <button type="submit" className="primary-btn">
            + Add Achievement
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------- ProfileAchievements Component ----------------
function ProfileAchievements({ userId }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        // Read from subcollection: users/{userId}/achievements
        const qRef = query(
          collection(db, 'users', userId, 'achievements'),
          orderBy('dateEarned', 'desc')
        );
        const snap = await getDocs(qRef);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAchievements(list);
      } catch (e) {
        console.error('Failed to fetch achievements:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, [userId]);

  if (loading) {
    return <p>Loading achievements...</p>;
  }

  if (!achievements.length) {
    return (
      <div className="achievement-empty">
        <p>No achievements yet. Add your first highlight above ✨</p>
      </div>
    );
  }

  const typeLabel = (t) => {
    if (t === 'certificate') return 'Certificate';
    if (t === 'skill') return 'Skill';
    if (t === 'project') return 'Project';
    return 'Badge';
  };

  return (
    <div className="achievement-section">
      <h3 className="section-title">My Highlighted Achievements</h3>
      <div className="achievements-grid">
        {achievements.map(a => (
          <div key={a.id} className={`achievement-pill-card ${a.type || 'badge'}`}>
            <div className="achievement-pill-header">
              <span className="achievement-type-tag">
                {typeLabel(a.type)}
              </span>
              {a.course && (
                <span className="achievement-course-tag">
                  {a.course}
                </span>
              )}
            </div>

            <h4 className="achievement-title">{a.title}</h4>

            {a.description && (
              <p className="achievement-desc">{a.description}</p>
            )}

            <div className="achievement-footer">
              {a.score != null && (
                <span className="achievement-score">Score: {a.score}%</span>
              )}
              {a.dateEarned && (
                <span className="achievement-date">
                  {new Date(a.dateEarned.seconds
                    ? a.dateEarned.seconds * 1000
                    : a.dateEarned).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Profile Page ----------------
function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('1st Year Student');
  const [error, setError] = useState('');
  const [refreshAchievements, setRefreshAchievements] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const fetchUserProfile = async () => {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            setEditName(data.displayName || currentUser.displayName);
            setEditRole(data.role || '1st Year Student');
          } else {
            setEditName(currentUser.displayName || '');
          }
        } catch (err) {
          console.error('Failed to fetch user profile', err);
          setError('Failed to load profile data.');
        }
        setLoading(false);
      };
      fetchUserProfile();
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateProfile(currentUser, { displayName: editName });
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: editName,
          role: editRole
        },
        { merge: true }
      );
      setUserProfile({ ...userProfile, displayName: editName, role: editRole });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile.');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      {isEditing ? (
        <>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Edit Profile</h2>
          <form onSubmit={handleProfileUpdate} className="review-form">
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            <label style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Display Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />

            <label style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Your Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              style={{
                marginBottom: '1.5rem',
                width: '100%',
                padding: '0.85rem',
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            >
              <option>1st Year Student</option>
              <option>2nd Year Student</option>
              <option>3rd Year Student</option>
              <option>4th Year Student</option>
              <option>Graduate Student</option>
              <option>Alumni / Senior</option>
            </select>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{ width: '100%', backgroundColor: '#888' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ width: '100%' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h2 style={{ marginBottom: '0.5rem' }}>
            {userProfile?.displayName || currentUser.displayName || 'My Profile'}
          </h2>
          <p style={{ fontSize: '1.05rem' }}>
            <strong>Email:</strong> {currentUser.email}
          </p>
          <p style={{ fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            <strong>Role:</strong> {userProfile?.role || 'N/A'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
            <button onClick={() => setIsEditing(true)} style={{ flex: 1 }}>
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              style={{ flex: 1, backgroundColor: '#d9534f', padding: '0.75rem' }}
            >
              Log Out
            </button>
          </div>

          {/* Add Achievement Section */}
          <AddAchievement
            userId={currentUser.uid}
            onAdded={() => setRefreshAchievements(!refreshAchievements)}
          />

          {/* Achievements list */}
          <ProfileAchievements
            userId={currentUser.uid}
            key={refreshAchievements}
          />
        </>
      )}

      {/* Scoped styles for achievement UI */}
      <style jsx>{`
        .achievement-card-wrapper {
          background: #ffffff;
          border-radius: 16px;
          padding: 1.75rem 1.75rem 1.5rem;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          border: 1px solid #e5e7eb;
          margin-top: 1.5rem;
        }

        .achievement-card-header h3 {
          margin: 0 0 0.35rem 0;
          font-size: 1.3rem;
        }

        .achievement-subtitle {
          margin: 0 0 1.25rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .achievement-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.25rem;
        }

        .field-full {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .field-half {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .achievement-form-grid label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #4b5563;
        }

        .achievement-form-grid input,
        .achievement-form-grid textarea,
        .achievement-form-grid select {
          padding: 0.7rem 0.85rem;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
        }

        .achievement-form-grid textarea {
          resize: vertical;
        }

        .primary-btn {
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 999px;
          background: #007aff;
          color: #fff;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        .primary-btn:hover {
          background: #0062c7;
        }

        .required {
          color: #ef4444;
          margin-left: 0.1rem;
        }

        .share-toggle {
          align-items: flex-start;
        }

        .share-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .share-label input {
          margin-top: 0.1rem;
        }

        .share-hint {
          display: block;
          margin-top: 0.15rem;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .achievement-section {
          margin-top: 2rem;
        }

        .section-title {
          font-size: 1.1rem;
          margin-bottom: 0.75rem;
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .achievement-pill-card {
          background: #f9fafb;
          border-radius: 14px;
          padding: 1rem 1rem 0.9rem;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .achievement-pill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .achievement-type-tag {
          font-size: 0.75rem;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 600;
        }

        .achievement-pill-card.certificate .achievement-type-tag {
          background: #fef3c7;
          color: #92400e;
        }

        .achievement-pill-card.skill .achievement-type-tag {
          background: #dcfce7;
          color: #166534;
        }

        .achievement-pill-card.project .achievement-type-tag {
          background: #ede9fe;
          color: #5b21b6;
        }

        .achievement-course-tag {
          font-size: 0.75rem;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .achievement-title {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 600;
        }

        .achievement-desc {
          margin: 0;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .achievement-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.35rem;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .achievement-empty {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #6b7280;
        }

        @media (max-width: 640px) {
          .achievement-form-grid {
            grid-template-columns: 1fr;
          }
          .field-half {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}

export default Profile;
