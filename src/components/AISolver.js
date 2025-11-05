import React, { useState } from 'react';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function AISolver() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For a loading spinner
    const [error, setError] = useState(null); // To show error messages

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setAnswer(''); // Clear old answer

        try {
            // 1. Send the question to your backend's /api/solve endpoint
            const response = await fetch(`${BACKEND_URL}/api/solve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: question }), // Send the question in the body
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // 2. Get the AI's answer back from the backend
            const data = await response.json();
            setAnswer(data.answer); // Set the answer in our state

        } catch (err) {
            console.error("Fetch Error:", err);
            setError('Failed to get an answer. Is your backend server running?');
        } finally {
            setIsLoading(false); // Stop loading
            setQuestion(''); // Clear the input box
        }
    };

    return (
        <div className="page-container">
            <h2>AI Problem Solver</h2>
            <p className="subtitle">Stuck on a tough algorithm? Ask METRA.</p>

            <div className="chat-box">
                {/* Show a loading message */}
                {isLoading && <p>Getting an answer...</p>}

                {/* Show an error message if something went wrong */}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {/* Show the AI's answer */}
                {!isLoading && (
                    <div
                        className="chat-answer"
                        dangerouslySetInnerHTML={{ __html: answer || "<p>Ask me anything...</p>" }}
                    />
                )}
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., 'Explain the Knapsack problem...'"
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Thinking...' : 'Ask'}
                </button>
            </form>
        </div>
    );
}

export default AISolver;