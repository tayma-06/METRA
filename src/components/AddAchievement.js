import React, { useState } from 'react';
import { addAchievement } from '../firebase';

function AddAchievement({ userId, onAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [score, setScore] = useState('');
  const [type, setType] = useState('badge');
  const [shared, setShared] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError('');
    setLoading(true);

    try {
      await addAchievement(userId, {
        title: title.trim(),
        description: description.trim(),
        course: course.trim() || null,
        score: score ? Number(score) : null,
        type,
        shared,
      });

      // reset form
      setTitle('');
      setDescription('');
      setCourse('');
      setScore('');
      setType('badge');
      setShared(true);

      onAdded?.();
    } catch (err) {
      console.error(err);
      setError('Failed to add achievement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="achievement-card-container">
      <div className="achievement-header-row">
        <div>
          <h3 className="achievement-title-heading">🏆 Achievements & Skills</h3>
          <p className="achievement-subtitle">
            Showcase your milestones so others can discover your strengths and collaborate with you.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="achievement-form">
        {error && <p className="achievement-error">{error}</p>}

        <div className="achievement-grid">
          <div className="achievement-field">
            <label>Title *</label>
            <input
              type="text"
              placeholder="e.g. Dynamic Programming Mastery"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="achievement-field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="badge">Badge</option>
              <option value="certificate">Certificate</option>
              <option value="skill">Skill</option>
              <option value="project">Project</option>
            </select>
          </div>

          <div className="achievement-field full">
            <label>Description</label>
            <input
              type="text"
              placeholder="Short description (what did you do / build / solve?)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="achievement-field">
            <label>Course / Domain</label>
            <input
              type="text"
              placeholder="e.g. CSE420, Web Dev, ML"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
          </div>

          <div className="achievement-field">
            <label>Score / Level (optional)</label>
            <input
              type="number"
              placeholder="e.g. 95"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              min="0"
              max="100"
            />
          </div>

          <div className="achievement-field full">
            <label>Visibility</label>
            <div className="achievement-toggle-row">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={shared}
                  onChange={(e) => setShared(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <div className="toggle-texts">
                <div className="toggle-main">
                  {shared ? 'Shared with others' : 'Private only for you'}
                </div>
                <div className="toggle-sub">
                  {shared
                    ? 'Visible in study groups and potential collab searches.'
                    : 'Only you can see this achievement.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="achievement-submit-btn"
          disabled={loading}
        >
          {loading ? 'Adding...' : '＋ Add Achievement'}
        </button>
      </form>
    </div>
  );
}

export default AddAchievement;
