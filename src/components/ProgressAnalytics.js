import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BACKEND_URL = 'http://localhost:8000';

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual 🎨' },
  { value: 'auditory', label: 'Auditory 🎵' },
  { value: 'kinesthetic', label: 'Hands-on 🔧' },
  { value: 'reading', label: 'Reading/Writing 📚' },
  { value: 'mixed', label: 'Mixed Approach 🔄' }
];

const PRIORITY_OPTIONS = [
  { value: 'exam_focused', label: 'Exam Preparation 📝' },
  { value: 'concept_mastery', label: 'Deep Understanding 🧠' },
  { value: 'balanced', label: 'Balanced Approach ⚖️' },
  { value: 'project_focused', label: 'Project/Application 🚀' }
];

const KNOWLEDGE_LEVELS = [
  { value: 'beginner', label: 'Beginner 🌱' },
  { value: 'intermediate', label: 'Intermediate 📚' },
  { value: 'advanced', label: 'Advanced 🚀' }
];

function ProgressAnalytics() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');

  // Progress Analysis Fields
  const [assessmentName, setAssessmentName] = useState('');
  const [score, setScore] = useState('');
  const [classAverage, setClassAverage] = useState('');
  const [subject, setSubject] = useState('');
  const [target, setTarget] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [weakAreas, setWeakAreas] = useState('');
  const [notes, setNotes] = useState('');
  const [learningStyle, setLearningStyle] = useState('visual');
  const [priority, setPriority] = useState('balanced');

  // Study Plan Fields
  const [studyTopic, setStudyTopic] = useState('');
  const [studyLevel, setStudyLevel] = useState('beginner');
  const [timeframe, setTimeframe] = useState('1 week');
  const [studyHours, setStudyHours] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [priorKnowledge, setPriorKnowledge] = useState('none');

  const handleProgressAnalysis = async (e) => {
    e.preventDefault();

    if (!assessmentName.trim() || !score || !subject.trim()) {
      setError('Please fill in required fields: Assessment Name, Score, and Subject');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: assessmentName,
          score: parseInt(score, 10),
          classAverage: classAverage ? parseInt(classAverage, 10) : null,
          course: subject,
          target: target ? parseInt(target, 10) : null,
          examDate,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
          weakTopics: weakAreas.split(',').map(area => area.trim()).filter(area => area),
          notes,
          learningStyle,
          priority
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get analysis');
      }

      const data = await response.json();
      setAnalysis({ ...data, type: 'progress' });
    } catch (err) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudyPlan = async (e) => {
    e.preventDefault();

    if (!studyTopic.trim()) {
      setError('Please enter what you want to learn');
      return;
    }

    if (!studyHours) {
      setError('Please specify hours per week');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: studyTopic,
          level: studyLevel,
          timeframe,
          hoursPerWeek: parseInt(studyHours, 10),
          learningGoals,
          priorKnowledge
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate study plan');
      }

      const data = await response.json();
      setAnalysis({ ...data, type: 'studyPlan' });
    } catch (err) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPlan = async () => {
    if (!analysis) return;

    try {
      let text = '';

      if (analysis.type === 'progress') {
        text = `📊 Performance Analysis: ${analysis.title}\n\n` +
            `${analysis.summary}\n\n` +
            `🎯 Action Plan:\n${analysis.plan.map(item => `• ${item}`).join('\n')}\n\n` +
            `📅 Study Schedule:\n${analysis.studySchedule?.map(item => `• ${item}`).join('\n') || 'Not specified'}\n\n` +
            `💪 Confidence Boosters:\n${analysis.confidenceBoosters?.map(item => `• ${item}`).join('\n') || 'Not specified'}`;
      } else {
        text = `📚 Study Plan: ${analysis.topic}\n\n` +
            `📖 Overview:\n${analysis.plan.overview}\n\n` +
            `📅 Weekly Schedule:\n${analysis.plan.weeklySchedule.map(item => `• ${item}`).join('\n')}\n\n` +
            `📋 Resources:\n${analysis.plan.resources.map(item => `• ${item}`).join('\n')}\n\n` +
            `🎯 Milestones:\n${analysis.plan.milestones.map(item => `• ${item}`).join('\n')}`;
      }

      await navigator.clipboard.writeText(text);
      alert('Plan copied to clipboard! 📋');
    } catch {
      alert('Could not copy. Please select and copy manually.');
    }
  };

  const savePlan = async () => {
    if (!analysis) return;

    try {
      const userId = 'user-' + Date.now(); // In real app, get from auth
      const userName = 'Current User'; // In real app, get from auth

      if (analysis.type === 'progress') {
        await addDoc(collection(db, 'progress_analyses'), {
          userId,
          userName,
          assessmentName,
          score: parseInt(score, 10),
          classAverage: classAverage ? parseInt(classAverage, 10) : null,
          subject,
          target: target ? parseInt(target, 10) : null,
          examDate,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
          weakAreas: weakAreas.split(',').map(area => area.trim()).filter(area => area),
          notes,
          learningStyle,
          priority,
          analysis,
          createdAt: serverTimestamp(),
          planType: 'progress'
        });
      } else {
        await addDoc(collection(db, 'study_plans'), {
          userId,
          userName,
          topic: studyTopic,
          level: studyLevel,
          timeframe,
          hoursPerWeek: parseInt(studyHours, 10),
          learningGoals,
          priorKnowledge,
          analysis,
          createdAt: serverTimestamp(),
          planType: 'studyPlan'
        });
      }

      alert('Plan saved successfully! ✅');
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save plan: ' + e.message);
    }
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    if (analysis.type === 'progress') {
      return (
          <div className="analytics-card large">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>💡 {analysis.title}</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={copyPlan}>Copy Plan</button>
                <button onClick={savePlan}>Save Plan</button>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p><strong>Performance Analysis:</strong></p>
              <p>{analysis.summary}</p>
            </div>

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

            {analysis.studySchedule && analysis.studySchedule.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Recommended Study Schedule:</strong></p>
                  <ul>
                    {analysis.studySchedule.map((item, idx) => (
                        <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
            )}

            {analysis.confidenceBoosters && analysis.confidenceBoosters.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Confidence Boosters:</strong></p>
                  <ul>
                    {analysis.confidenceBoosters.map((item, idx) => (
                        <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
            )}

            {analysis.resources && analysis.resources.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Recommended Resources:</strong></p>
                  <ul>
                    {analysis.resources.map((resource, idx) => (
                        <li key={idx}>{resource}</li>
                    ))}
                  </ul>
                </div>
            )}
          </div>
      );
    } else {
      return (
          <div className="analytics-card large">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>📚 Study Plan: {analysis.topic}</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={copyPlan}>Copy Plan</button>
                <button onClick={savePlan}>Save Plan</button>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p><strong>Overview:</strong></p>
              <p>{analysis.plan.overview}</p>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p><strong>Weekly Schedule:</strong></p>
              <ul>
                {analysis.plan.weeklySchedule.map((item, idx) => (
                    <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {analysis.plan.dailyActivities && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Daily Activities:</strong></p>
                  <ul>
                    {analysis.plan.dailyActivities.map((activity, idx) => (
                        <li key={idx}>{activity}</li>
                    ))}
                  </ul>
                </div>
            )}

            {analysis.plan.resources && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Recommended Resources:</strong></p>
                  <ul>
                    {analysis.plan.resources.map((resource, idx) => (
                        <li key={idx}>{resource}</li>
                    ))}
                  </ul>
                </div>
            )}

            {analysis.plan.milestones && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Learning Milestones:</strong></p>
                  <ul>
                    {analysis.plan.milestones.map((milestone, idx) => (
                        <li key={idx}>{milestone}</li>
                    ))}
                  </ul>
                </div>
            )}
          </div>
      );
    }
  };

  const clearForm = () => {
    if (activeTab === 'analysis') {
      setAssessmentName('');
      setScore('');
      setClassAverage('');
      setSubject('');
      setTarget('');
      setExamDate('');
      setHoursPerWeek('');
      setWeakAreas('');
      setNotes('');
    } else {
      setStudyTopic('');
      setStudyHours('');
      setLearningGoals('');
    }
    setAnalysis(null);
    setError(null);
  };

  return (
      <div className="page-container">
        <h2>🎯 AI Learning Assistant</h2>
        <p className="subtitle">Get personalized study plans and progress analysis powered by AI.</p>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #eee' }}>
          <button
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => { setActiveTab('analysis'); clearForm(); }}
          >
            📈 Progress Analysis
          </button>
          <button
              className={`tab-button ${activeTab === 'studyPlan' ? 'active' : ''}`}
              onClick={() => { setActiveTab('studyPlan'); clearForm(); }}
          >
            📚 Study Plan Generator
          </button>
        </div>

        {/* Progress Analysis Form */}
        {activeTab === 'analysis' && (
            <div className="form-container analytics-card" style={{ marginBottom: '2rem' }}>
              <h4>Analyze My Academic Performance</h4>
              <form onSubmit={handleProgressAnalysis} className="review-form">
                <div className="form-row">
                  <input
                      type="text"
                      placeholder="Assessment Name (e.g., Midterm Exam, Quiz 1)"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      required
                  />
                  <input
                      type="text"
                      placeholder="Subject/Course (e.g., Calculus, Physics, History)"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                  />
                </div>

                <div className="form-row">
                  <input
                      type="number"
                      placeholder="Your Score (%)"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      min="0"
                      max="100"
                      required
                  />
                  <input
                      type="number"
                      placeholder="Class Average (%) - Optional"
                      value={classAverage}
                      onChange={(e) => setClassAverage(e.target.value)}
                      min="0"
                      max="100"
                  />
                </div>

                <div className="form-row">
                  <input
                      type="number"
                      placeholder="Target Score (%) - Optional"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      min="0"
                      max="100"
                  />
                  <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      placeholder="Next Exam Date - Optional"
                  />
                </div>

                <div className="form-row">
                  <select
                      value={learningStyle}
                      onChange={(e) => setLearningStyle(e.target.value)}
                      style={{ flex: 1 }}
                  >
                    {LEARNING_STYLES.map(style => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                    ))}
                  </select>
                  <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      style={{ flex: 1 }}
                  >
                    {PRIORITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <input
                      type="number"
                      placeholder="Study Hours Available Per Week"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      min="1"
                  />
                  <input
                      type="text"
                      placeholder="Specific weak areas (comma separated) - Optional"
                      value={weakAreas}
                      onChange={(e) => setWeakAreas(e.target.value)}
                  />
                </div>

                <textarea
                    placeholder="Additional notes about your learning situation, challenges, or goals - Optional"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    style={{ width: '100%', marginBottom: '1rem' }}
                />

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? '🔍 Analyzing...' : 'Generate Personalized Plan'}
                  </button>
                  <button type="button" onClick={clearForm} style={{ background: '#6c757d' }}>
                    Clear Form
                  </button>
                </div>
                {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
              </form>
            </div>
        )}

        {/* Study Plan Generator Form */}
        {activeTab === 'studyPlan' && (
            <div className="form-container analytics-card" style={{ marginBottom: '2rem' }}>
              <h4>Create Custom Study Plan</h4>
              <form onSubmit={handleStudyPlan} className="review-form">
                <div className="form-row">
                  <input
                      type="text"
                      placeholder="What do you want to learn? (e.g., Machine Learning, Spanish, Quantum Physics)"
                      value={studyTopic}
                      onChange={(e) => setStudyTopic(e.target.value)}
                      style={{ flex: 2 }}
                      required
                  />
                  <select
                      value={studyLevel}
                      onChange={(e) => setStudyLevel(e.target.value)}
                      style={{ flex: 1 }}
                  >
                    {KNOWLEDGE_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      style={{ flex: 1 }}
                  >
                    <option value="1 week">1 Week</option>
                    <option value="2 weeks">2 Weeks</option>
                    <option value="1 month">1 Month</option>
                    <option value="3 months">3 Months</option>
                    <option value="6 months">6 Months</option>
                  </select>
                  <input
                      type="number"
                      placeholder="Hours available per week"
                      value={studyHours}
                      onChange={(e) => setStudyHours(e.target.value)}
                      min="1"
                      style={{ flex: 1 }}
                      required
                  />
                </div>

                <div className="form-row">
                  <select
                      value={priorKnowledge}
                      onChange={(e) => setPriorKnowledge(e.target.value)}
                      style={{ flex: 1 }}
                  >
                    <option value="none">No prior knowledge</option>
                    <option value="basic">Basic familiarity</option>
                    <option value="some">Some experience</option>
                    <option value="experienced">Experienced but rusty</option>
                  </select>
                </div>

                <textarea
                    placeholder="Specific learning goals or what you want to achieve (optional)"
                    value={learningGoals}
                    onChange={(e) => setLearningGoals(e.target.value)}
                    rows="3"
                    style={{ width: '100%', marginBottom: '1rem' }}
                />

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? '📝 Generating...' : 'Create Study Plan'}
                  </button>
                  <button type="button" onClick={clearForm} style={{ background: '#6c757d' }}>
                    Clear Form
                  </button>
                </div>
                {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
              </form>
            </div>
        )}

        {/* Analysis Output */}
        {renderAnalysis()}
      </div>
  );
}

export default ProgressAnalytics;