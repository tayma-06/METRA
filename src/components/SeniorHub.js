import React, { useState, useEffect } from 'react';
// Assuming useAuth is correctly imported from '../contexts/AuthContext'
// and provides { currentUser }
// NOTE: For this environment, we'll mock useAuth if not available.
const useAuth = () => ({ currentUser: { uid: 'mock-user-123', displayName: 'Mock User' } });

const BACKEND_URL = 'http://localhost:8000';

// Helper function moved outside the component for cleanliness
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Check if it's a Firestore Timestamp object or a plain object from the API response
    // The API response sends an object with _seconds and _nanoseconds
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


function SeniorHub() {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null); // For success messages

    // --- Post Form States ---
    const [course, setCourse] = useState('');
    const [question, setQuestion] = useState('');
    const [postError, setPostError] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // --- Reply Form States ---
    const [replyState, setReplyState] = useState({
        postId: null,
        text: '',
        isSubmitting: false,
        submitError: null
    });

    const { currentUser } = useAuth(); // Get user context

    // --- 1. Fetch Posts ---
    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/hub/posts`);
                if (!response.ok) {
                    throw new Error('Failed to fetch senior hub posts.');
                }
                const data = await response.json();
                const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setPosts(sortedData);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPosts();
    }, []);

    // --- 2. Handle New Post Submission ---
    const handlePostSubmit = async (e) => {
        e.preventDefault();
        setPostError(null);
        setMessage(null);

        if (!currentUser) {
            setPostError('You must be logged in to post a question.');
            return;
        }

        if (!course.trim() || !question.trim()) {
            setPostError('Please fill out both course code and question.');
            return;
        }

        setIsPosting(true);

        try {
            const authorId = currentUser.uid;
            const authorName = currentUser.displayName || 'Authenticated User';

            const response = await fetch(`${BACKEND_URL}/api/hub/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course: course.trim(),
                    question: question.trim(),
                    authorId: authorId,
                    authorName: authorName
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit post.');
            }

            const newPost = await response.json();
            setPosts([newPost, ...posts]);
            setCourse('');
            setQuestion('');
            setMessage('Question posted successfully!');

        } catch (err) {
            setPostError(err.message);
        } finally {
            setIsPosting(false);
        }
    };

    // --- 3. Handle Reply Submission ---
    const handleReplySubmit = async (postId) => {
        const { text } = replyState;
        setReplyState(prev => ({ ...prev, submitError: null }));

        if (!currentUser) {
            setReplyState(prev => ({ ...prev, submitError: 'You must be logged in to reply.' }));
            return;
        }
        if (!text.trim()) {
            setReplyState(prev => ({ ...prev, submitError: 'Reply cannot be empty.' }));
            return;
        }

        setReplyState(prev => ({ ...prev, isSubmitting: true }));

        try {
            const authorId = currentUser.uid;
            const authorName = currentUser.displayName || 'Senior Mentor';

            const response = await fetch(`${BACKEND_URL}/api/hub/posts/${postId}/reply`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    replyText: text.trim(),
                    authorId: authorId,
                    authorName: authorName
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit reply.');
            }

            // Update the local state with the new reply object
            setPosts(posts.map(p =>
                p.id === postId ? { ...p, reply: data.reply } : p
            ));

            // Reset the reply form state
            setReplyState({ postId: null, text: '', isSubmitting: false, submitError: null });

        } catch (err) {
            setReplyState(prev => ({ ...prev, isSubmitting: false, submitError: err.message }));
        }
    };

    // --- 4. Handle Post Deletion ---
    const handleDelete = async (postId) => {
        // NOTE: In a real app, replace window.confirm with a custom modal UI.
        if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        setError(null);
        setMessage(null);

        if (!currentUser) {
            setError('You must be logged in to delete a post.');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/hub/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid }), // Security check
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete post.');
            }

            // Remove the post from the state
            setPosts(posts.filter(p => p.id !== postId));
            setMessage('Post deleted successfully.');

        } catch (err) {
            setError(err.message);
        }
    };

    const isReplyVisible = (postId) => replyState.postId === postId;

    return (
        <div className="page-container forum-section">
            <h2 className="text-4xl font-extrabold text-indigo-700 mb-2">🎓 Senior Hub: Ask-a-Mentor</h2>
            <p className="subtitle">Ask specific, course-related questions. Any senior student can provide guidance (one reply per post).</p>

            {/* --- Section 1: Post Question Form (Using 'card' class) --- */}
            <div className="card mb-8">
                <h4 className="text-2xl font-semibold text-gray-800 mb-4">Post Your Question</h4>
                <form onSubmit={handlePostSubmit} className="review-form">
                    {postError && <p className="p-2 bg-red-100 text-red-700 rounded-md">{postError}</p>}
                    {message && <p className="p-2 bg-green-100 text-green-700 rounded-md">{message}</p>}

                    <div className="form-row">
                        <input
                            type="text"
                            placeholder="Course Code (e.g., CSE321)"
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                        />
                    </div>
                    <textarea
                        placeholder="Your detailed question..."
                        rows="4"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                    />
                    <button type="submit" disabled={isPosting || !currentUser}>
                        {isPosting ? 'Posting...' : (currentUser ? 'Submit Question' : 'Log in to Post')}
                    </button>
                </form>
            </div>

            {/* --- Section 2: Display Posts --- */}
            <h3 className="text-3xl font-bold text-gray-800 mb-4">All Questions</h3>
            <div className="reviews-list">
                {isLoading && <p className="text-center text-indigo-600">Loading posts...</p>}
                {error && <p className="p-3 bg-red-100 text-red-700 rounded-md">{error}</p>}

                {posts.length === 0 && !isLoading && <p className="text-gray-500 text-center">No questions posted yet. Be the first to ask!</p>}

                {posts.map((post) => (
                    <div key={post.id} className="review-card">

                        {/* --- Original Post Content & Delete Button --- */}
                        <div className="post-header">
                            <div>
                                <span className="post-course-tag">
                                    {post.course}
                                </span>
                                <p className="post-question">
                                    {post.question}
                                </p>
                                <div className="post-meta">
                                    <span>Asked by: <strong>{post.authorName || 'Anonymous'}</strong></span>
                                    <span className="ml-3">on {post.createdAt ? formatTimestamp(post.createdAt) : '...'}</span>
                                </div>
                            </div>

                            {/* Delete Button (Only shown if logged in) */}
                            {currentUser && currentUser.uid === post.authorId && (
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="delete-button"
                                    title="Delete this post"
                                >
                                    🗑️ Delete
                                </button>
                            )}
                        </div>

                        {/* --- Reply Section --- */}
                        {post.reply ? (
                            // --- Display Existing Reply (Using 'mentor-reply-box' class) ---
                            <div className="mentor-reply-box">
                                <div className="reply-header">
                                    ✅ Senior Mentor Response
                                </div>
                                <p className="reply-text whitespace-pre-wrap">{post.reply.text}</p>
                                <div className="reply-meta flex justify-between">
                                    <span>
                                        Replied by: <strong>{post.reply.authorName || 'Mentor'}</strong>
                                    </span>
                                    <span>
                                        {post.reply.repliedAt ? formatTimestamp(post.reply.repliedAt) : '...'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            // --- Reply Button/Form ---
                            currentUser && (
                                <div className="mt-3">
                                    {isReplyVisible(post.id) ? (
                                        // Reply Form (Using 'reply-form-container' class)
                                        <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(post.id); }} className="reply-form-container">
                                            <h5 className="text-lg font-semibold mb-3">Provide Senior Guidance</h5>
                                            <textarea
                                                rows="4"
                                                placeholder="Write your detailed advice here..."
                                                value={replyState.text}
                                                onChange={(e) => setReplyState(prev => ({ ...prev, text: e.target.value, postId: post.id }))}
                                                className="w-full p-3 border rounded-lg resize-none text-base"
                                                required
                                            />
                                            {replyState.submitError && <p className="text-red-500 text-sm mt-1">{replyState.submitError}</p>}
                                            <div className='flex justify-end space-x-2 mt-3'>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyState({ postId: null, text: '', isSubmitting: false, submitError: null })}
                                                    className="px-4 py-2 text-sm rounded-lg"
                                                    disabled={replyState.isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-4 py-2 text-sm rounded-lg"
                                                    disabled={replyState.isSubmitting}
                                                >
                                                    {replyState.isSubmitting ? 'Posting...' : 'Post Guidance'}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        // Reply Button
                                        <button
                                            onClick={() => setReplyState({ postId: post.id, text: '', isSubmitting: false, submitError: null })}
                                            className="px-4 py-2 text-base rounded-lg shadow-md flex items-center space-x-2"
                                        >
                                            <span role="img" aria-label="reply">✍️</span>
                                            <span>Reply as Senior Mentor</span>
                                        </button>
                                    )}
                                </div>
                            )
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
}

export default SeniorHub;