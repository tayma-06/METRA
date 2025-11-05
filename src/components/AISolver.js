import React, { useState } from 'react';
import { marked } from 'marked'; // 1. Import the 'marked' library
import { useAuth } from '../contexts/AuthContext'; // We'll use this later

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function AISolver() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Get user info to personalize the prompt (optional)
    const { currentUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        setAnswer(''); // Clear previous answer

        // You could personalize the question:
        // const fullQuestion = `A student (${currentUser.email}) is asking: ${question}`;

        try {
            const response = await fetch(`${BACKEND_URL}/api/solve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question }), // Send the question
            });

            if (!response.ok) {
                throw new Error('Failed to get an answer. Is your backend server running?');
            }

            const data = await response.json();

            // 2. Parse the Markdown answer from the AI
            const htmlAnswer = marked.parse(data.answer);
            setAnswer(htmlAnswer);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <h2>🤖 AI Problem Solver</h2>
            <p className="subtitle">Stuck on a tough algorithm? Ask METRA.</p>

            <div className="chat-box" style={{minHeight: '250px'}}>
                {/* 3. Use dangerouslySetInnerHTML to render the HTML */}
                {/* We add a 'prose' class for styling */}
                <div
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: answer || "<p>Ask me anything...</p>" }}
                />

                {isLoading && <p>Thinking...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., 'Explain the Knapsack problem...'"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? '...' : 'Ask'}
                </button>
            </form>
        </div>
    );
}

export default AISolver;