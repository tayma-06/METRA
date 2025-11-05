import React, { useState, useEffect } from 'react';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function SeniorHub() {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- State for the new post form ---
    const [newQuestion, setNewQuestion] = useState('');
    const [formError, setFormError] = useState('');

    // 1. --- FETCH ALL POSTS (GET Request) ---
    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/hub/posts`);
                if (!response.ok) {
                    throw new Error('Failed to fetch posts.');
                }
                const data = await response.json();
                setPosts(data.reverse()); // Show newest posts first
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, []); // The empty array [] means this runs only once

    // 2. --- SUBMIT A NEW POST (POST Request) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!newQuestion) {
            setFormError('Please type your question before posting.');
            return;
        }

        try {
            // For the demo, we'll hard-code the author
            const author = "Ayesha (2nd Year)";

            const response = await fetch(`${BACKEND_URL}/api/hub/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author, question: newQuestion }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit post.');
            }

            const newPost = await response.json();

            // Add the new post to the top of our list
            setPosts([newPost, ...posts]);
            setNewQuestion(''); // Clear the textarea

        } catch (err) {
            setFormError(err.message);
        }
    };

    return (
        <div className="page-container">
            <h2>💡 Senior Suggestion Hub</h2>
            <p className="subtitle">Connect with seniors for guidance and resources.</p>

            {/* --- Section 1: Submit a New Post --- */}
            {/* We re-use 'analytics-card' style from the other page for consistency */}
            <div className="forum-post-box analytics-card">
                <h4>Ask a Question</h4>
                <form onSubmit={handleSubmit}>
          <textarea
              placeholder="Ask a question... e.g., 'Need a roadmap for Machine Learning...'"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
          ></textarea>
                    <button type="submit" style={{width: '100%', borderRadius: '8px'}}>Post Question</button>
                    {formError && <p style={{ color: 'red', marginTop: '10px' }}>{formError}</p>}
                </form>
            </div>

            {/* --- Section 2: Display Existing Posts --- */}
            <h3 style={{ marginTop: '2rem' }}>Recent Posts</h3>
            <div className="forum-feed">
                {isLoading && <p>Loading posts...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {posts.length === 0 && !isLoading && <p>No posts yet. Be the first!</p>}

                {posts.map((post) => (
                    <div key={post.id} className="forum-post analytics-card" style={{marginBottom: '1.5rem'}}>
                        <h4><a href="#">{post.question}</a></h4>
                        <p style={{fontSize: '0.9rem', color: '#5f6368'}}>Posted by {post.author}</p>

                        {/* Show the senior's reply if it exists */}
                        {post.reply && (
                            <div className="forum-answer">
                                <p style={{whiteSpace: 'pre-wrap'}}><strong>{post.reply}</strong></p>
                            </div>
                        )}
                        {!post.reply && (
                            <p style={{fontStyle: 'italic', color: '#5f6368'}}>No replies yet.</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SeniorHub;