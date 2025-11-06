import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

function AISolver() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    const chatBoxRef = useRef(null);
    const inputRef = useRef(null);
    const { currentUser } = useAuth();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [conversation, answer, isLoading]);

    // Focus input on component mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Enhanced typing animation simulation
    useEffect(() => {
        if (answer && !isLoading) {
            setIsTyping(true);
            const timer = setTimeout(() => {
                setIsTyping(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [answer, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!question.trim()) {
            setError('Please enter a question.');
            return;
        }

        setError(null);
        setIsLoading(true);

        // Add user question to conversation (aligned right)
        const userMessage = {
            type: 'user',
            content: question,
            timestamp: new Date().toLocaleTimeString()
        };

        setConversation(prev => [...prev, userMessage]);
        setQuestion(''); // Clear input immediately

        try {
            const response = await fetch(`${BACKEND_URL}/api/solve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser?.uid}` // Optional: Add auth header
                },
                body: JSON.stringify({
                    question: question,
                    userId: currentUser?.uid,
                    userName: currentUser?.displayName || currentUser?.email
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Parse the Markdown answer
            const htmlAnswer = marked.parse(data.answer);

            // Add AI response to conversation (aligned left)
            const aiMessage = {
                type: 'ai',
                content: htmlAnswer,
                timestamp: new Date().toLocaleTimeString(),
                rawAnswer: data.answer
            };

            setConversation(prev => [...prev, aiMessage]);
            setAnswer(htmlAnswer);

        } catch (err) {
            console.error('AI Solver error:', err);
            const errorMessage = err.message.includes('Failed to fetch')
                ? 'Unable to connect to the server. Please check if your backend is running.'
                : err.message;

            setError(errorMessage);

            // Add error to conversation (centered)
            const errorMessageObj = {
                type: 'error',
                content: `Error: ${errorMessage}`,
                timestamp: new Date().toLocaleTimeString()
            };
            setConversation(prev => [...prev, errorMessageObj]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearConversation = () => {
        setConversation([]);
        setAnswer('');
        setError(null);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleKeyPress = (e) => {
        // Submit on Enter (but allow Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Sample questions for quick input
    const sampleQuestions = [
        "Explain the time complexity of binary search",
        "How do I implement a linked list in JavaScript?",
        "What's the difference between DFS and BFS?",
        "Help me understand dynamic programming with an example"
    ];

    const insertSampleQuestion = (sampleQuestion) => {
        setQuestion(sampleQuestion);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Message component for better organization
    const Message = ({ message }) => {
        if (message.type === 'user') {
            return (
                <div className="message-user">
                    <div className="message-bubble user-bubble">
                        <div className="message-content">
                            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                        </div>
                        <div className="message-time">{message.timestamp}</div>
                    </div>
                </div>
            );
        } else if (message.type === 'ai') {
            return (
                <div className="message-ai">
                    <div className="message-bubble ai-bubble">
                        <div className="message-header">
                            <strong>🤖 METRA</strong>
                        </div>
                        <div className="message-content">
                            <div
                                className="prose"
                                dangerouslySetInnerHTML={{ __html: message.content }}
                            />
                        </div>
                        <div className="message-time">{message.timestamp}</div>
                    </div>
                </div>
            );
        } else if (message.type === 'error') {
            return (
                <div className="message-error">
                    <div className="message-bubble error-bubble">
                        <div className="message-header">
                            <strong>❌ Error</strong>
                        </div>
                        <div className="message-content">
                            {message.content}
                        </div>
                        <div className="message-time">{message.timestamp}</div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="page-container">
            <div className="chat-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h2>🤖 AI Problem Solver</h2>
                        <p className="subtitle">Stuck on a tough algorithm? Ask METRA for step-by-step solutions.</p>
                    </div>
                    {conversation.length > 0 && (
                        <button
                            onClick={clearConversation}
                            className="clear-chat-btn"
                        >
                            🗑️ Clear Chat
                        </button>
                    )}
                </div>

                {/* Sample Questions */}
                {conversation.length === 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-light)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            Try asking:
                        </p>
                        <div className="sample-questions">
                            {sampleQuestions.map((q, index) => (
                                <button
                                    key={index}
                                    onClick={() => insertSampleQuestion(q)}
                                    className="sample-question-btn"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Box */}
                <div
                    ref={chatBoxRef}
                    className="chat-box"
                >
                    {conversation.length === 0 && !isLoading && (
                        <div className="chat-placeholder">
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                            <h3 style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                Welcome to AI Problem Solver
                            </h3>
                            <p>Ask me anything about algorithms, data structures, or programming concepts!</p>
                        </div>
                    )}

                    {/* Conversation History */}
                    <div className="messages-container">
                        {conversation.map((message, index) => (
                            <Message key={index} message={message} />
                        ))}
                    </div>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="message-ai">
                            <div className="message-bubble ai-bubble">
                                <div className="chat-loading">
                                    <span>METRA is thinking</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Typing Indicator */}
                    {isTyping && conversation.length > 0 && (
                        <div className="typing-indicator">
                            METRA is formatting the answer...
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="chat-error" style={{ marginBottom: '1rem' }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Input Form */}
                <form className="chat-form" onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., 'Explain the Knapsack problem with time complexity analysis...'"
                        disabled={isLoading}
                        style={{ flexGrow: 1 }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !question.trim()}
                        title={!question.trim() ? "Please enter a question" : "Ask METRA"}
                    >
                        {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="loading-spinner-small"></div>
                                Thinking...
                            </span>
                        ) : (
                            'Ask 🤖'
                        )}
                    </button>
                </form>

                {/* Character Counter */}
                <div className="character-counter">
                    {question.length}/500
                    {question.length > 500 && ' - Question too long'}
                </div>
            </div>

            {/* Add CSS for the chat layout */}
            <style jsx>{`
                .messages-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .message-user {
                    display: flex;
                    justify-content: flex-end;
                    margin-left: auto;
                    max-width: 80%;
                }

                .message-ai {
                    display: flex;
                    justify-content: flex-start;
                    margin-right: auto;
                    max-width: 80%;
                }

                .message-error {
                    display: flex;
                    justify-content: center;
                    max-width: 90%;
                    margin: 0 auto;
                }

                .message-bubble {
                    padding: 1rem 1.25rem;
                    border-radius: 18px;
                    box-shadow: var(--shadow);
                    position: relative;
                    max-width: 100%;
                }

                .user-bubble {
                    background-color: var(--primary-color);
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .ai-bubble {
                    background-color: var(--card-background);
                    border: 1px solid var(--border-color);
                    border-bottom-left-radius: 4px;
                }

                .error-bubble {
                    background-color: #ffe6e6;
                    border: 1px solid var(--error-color);
                    border-radius: 12px;
                    color: var(--error-color);
                }

                .message-header {
                    margin-bottom: 0.5rem;
                }

                .message-header strong {
                    color: inherit;
                }

                .message-content {
                    line-height: 1.5;
                }

                .message-time {
                    font-size: 0.75rem;
                    color: inherit;
                    opacity: 0.7;
                    margin-top: 0.5rem;
                    text-align: right;
                }

                .user-bubble .message-time {
                    text-align: right;
                }

                .ai-bubble .message-time {
                    text-align: left;
                }

                .error-bubble .message-time {
                    text-align: center;
                }

                .typing-indicator {
                    font-size: 0.8rem;
                    color: var(--text-light);
                    text-align: center;
                    font-style: italic;
                    margin-top: 0.5rem;
                }

                .clear-chat-btn {
                    padding: 0.5rem 1rem;
                    background-color: transparent;
                    color: var(--text-light);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }

                .clear-chat-btn:hover {
                    background-color: var(--background-color);
                    color: var(--error-color);
                    border-color: var(--error-color);
                }

                .sample-questions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .sample-question-btn {
                    padding: 0.5rem 0.75rem;
                    background-color: var(--light-blue);
                    color: var(--primary-color);
                    border: 1px solid var(--light-blue);
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }

                .sample-question-btn:hover {
                    background-color: var(--primary-color);
                    color: white;
                    transform: translateY(-1px);
                }

                .loading-spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .character-counter {
                    font-size: 0.75rem;
                    color: ${question.length > 500 ? 'var(--error-color)' : 'var(--text-light)'};
                    text-align: right;
                    margin-top: 0.5rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .message-user,
                    .message-ai {
                        max-width: 90%;
                    }

                    .message-bubble {
                        padding: 0.75rem 1rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default AISolver;