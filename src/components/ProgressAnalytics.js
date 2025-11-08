import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Backend URL used by your project
const BACKEND_URL = 'http://localhost:8000';

const TOPIC_OPTIONS = [
  'Arrays', 'Linked List', 'Stack/Queue', 'Trees', 'Graphs',
  'Dynamic Programming', 'Sorting', 'Greedy', 'Recursion', 'Math'
];

function ProgressAnalytics() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Existing fields ---
  const [quizId, setQuizId] = useState('Quiz 3');
  const [score, setScore] = useState('72');
  const [classAverage, setClassAverage] = useState('78');

  // --- New fields ---
  const [course, setCourse] = useState('CSE220 – Data Structures');
  const [target, setTarget] = useState('85');            // % target
  const [examDate, setExamDate] = useState('');          // yyyy-mm-dd
  const [hoursPerWeek, setHoursPerWeek] = useState('6'); // study time
  const [weakTopics, setWeakTopics] = useState(['Dynamic Programming']);
  const [notes, setNotes] = useState('');

  // helper: toggle topics
  const toggleTopic = (t) => {
    setWeakTopics((prev) =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // existing payload
          quizId,
          score: parseInt(score, 10),
          classAverage: parseInt(classAverage, 10),
          // new payload
          course,
          target: parseInt(target, 10),
          examDate, // as string (yyyy-mm-dd)
          hoursPerWeek: parseInt(hoursPerWeek, 10),
          weakTopics,
          notes
        }),
      });

      if (!response.ok) throw new Error('Failed to get analysis.');
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPlan = async () => {
    if (!analysis) return;
    const text =
      `Title: ${analysis.title}\n\n` +
      `${analysis.summary}\n\n` +
      `Action Plan:\n- ${Array.isArray(analysis.plan) ? analysis.plan.join('\n- ') : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Plan copied to clipboard ✅');
    } catch {
      alert('Could not copy. Select text and copy manually.');
    }
  };

  const savePlan = async () => {
    if (!analysis) return;
    try {
      await addDoc(collection(db, 'progress_plans'), {
        quizId,
        course,
        target: parseInt(target, 10),
        examDate,
        score: parseInt(score, 10),
        classAverage: parseInt(classAverage, 10),
        hoursPerWeek: parseInt(hoursPerWeek, 10),
        weakTopics,
        notes,
        analysis,
        createdAt: serverTimestamp(),
      });
      alert('Plan saved! ✅');
    } catch (e) {
      alert('Failed to save plan: ' + e.message);
    }
  };

  return (
    <div className="page-container">
      <h2>📈 Progress Analyst AI</h2>
      <p className="subtitle">Your personalized path to academic success.</p>

      {/* --- Form --- */}
      <div className="form-container analytics-card" style={{ marginBottom: '2rem' }}>
        <h4>Analyze My Performance</h4>

        <form onSubmit={handleSubmit} className="review-form">

          {/* Row 1: Course + Quiz Id */}
          <div className="form-row">
            <input
              type="text"
              placeholder="Course (e.g., CSE220 – Data Structures)"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
            <input
              type="text"
              placeholder="Quiz/Exam ID (e.g., Quiz 3)"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
            />
          </div>

          {/* Row 2: Score + Class Avg */}
          <div className="form-row">
            <input
              type="number"
              placeholder="Your Score (%)"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
            <input
              type="number"
              placeholder="Class Average (%)"
              value={classAverage}
              onChange={(e) => setClassAverage(e.target.value)}
            />
          </div>

          {/* Row 3: Target + Exam Date */}
          <div className="form-row">
            <input
              type="number"
              placeholder="Target Score (%)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>

          {/* Row 4: Hours/week + Notes */}
          <div className="form-row">
            <input
              type="number"
              placeholder="Study Hours / Week"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
            />
            <input
              type="text"
              placeholder="Any constraints/notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Weak topics as checkboxes */}
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Weak Topics (select any):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {TOPIC_OPTIONS.map((t) => (
                <label key={t} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={weakTopics.includes(t)}
                    onChange={() => toggleTopic(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Generate My Plan'}
          </button>
          {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
        </form>
      </div>

      {/* --- Output --- */}
      {analysis && (
        <div className="analytics-card large">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>💡 {analysis.title}</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={copyPlan}>Copy Plan</button>
              <button onClick={savePlan}>Save Plan</button>
            </div>
          </div>

          <p style={{ marginTop: '0.75rem' }}>{analysis.summary}</p>

          <div style={{ marginTop: '1rem' }}>
            <p><strong>Your Personalized Action Plan:</strong></p>
            <ul>
              {Array.isArray(analysis.plan) && analysis.plan.map((item, idx) => (
                <li key={idx}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <input type="checkbox" />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressAnalytics;
