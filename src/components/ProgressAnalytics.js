import React, { useState } from 'react';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function ProgressAnalytics() {
    const [analysis, setAnalysis] = useState(null); // Will hold the AI's plan
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- State for the form ---
    const [quizId, setQuizId] = useState('Quiz 3');
    const [score, setScore] = useState('72');
    const [classAverage, setClassAverage] = useState('78');

    // --- SUBMIT QUIZ DATA (POST Request) ---
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
                    quizId: quizId,
                    score: parseInt(score),
                    classAverage: parseInt(classAverage),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get analysis.');
            }

            const data = await response.json();
            setAnalysis(data); // Save the AI's analysis

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <h2>📈 Progress Analyst AI</h2>
            <p className="subtitle">Your personalized path to academic success.</p>

            {/* --- Section 1: Submit Quiz Data --- */}
            <div className="form-container analytics-card" style={{ marginBottom: '2rem' }}>
                <h4>Analyze My Performance</h4>
                <form onSubmit={handleSubmit} className="review-form">
                    <div className="form-row">
                        <input
                            type="text"
                            placeholder="Quiz/Exam ID (e.g., Quiz 3)"
                            value={quizId}
                            onChange={(e) => setQuizId(e.target.value)}
                        />
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
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Analyzing...' : 'Generate My Plan'}
                    </button>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </form>
            </div>

            {/* --- Section 2: Display AI Analysis --- */}
            {/* This section will appear *after* you submit */}
            {analysis && (
                <div className="analytics-card large">
                    <h4>💡 {analysis.title}</h4>
                    <p>{analysis.summary}</p>
                    <p><strong>Your Personalized Action Plan:</strong></p>
                    <ul>
                        {analysis.plan.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ProgressAnalytics;