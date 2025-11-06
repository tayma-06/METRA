import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

function CourseReviews() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- State for the new review form ---
    const [course, setCourse] = useState('');
    const [professor, setProfessor] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [formError, setFormError] = useState('');

    const { currentUser } = useAuth();

    // 1. --- FETCH ALL REVIEWS (GET Request) ---
    useEffect(() => {
        const fetchReviews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/reviews`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch reviews: ${response.status}`);
                }
                const data = await response.json();
                setReviews(data);
            } catch (err) {
                console.error('Error fetching reviews:', err);
                setError(err.message || 'Failed to load reviews. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();
    }, []);

    // 2. --- SUBMIT A NEW REVIEW (POST Request) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        // Enhanced validation
        if (!course.trim() || !professor.trim() || !comment.trim()) {
            setFormError('Please fill out all fields.');
            return;
        }

        if (comment.length < 10) {
            setFormError('Please provide a more detailed review (at least 10 characters).');
            return;
        }

        if (!currentUser) {
            setFormError('You must be logged in to submit a review.');
            return;
        }

        setIsSubmitting(true);

        try {
            const author = currentUser.displayName || currentUser.email;
            const authorId = currentUser.uid;

            const response = await fetch(`${BACKEND_URL}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course: course.trim(),
                    professor: professor.trim(),
                    rating,
                    comment: comment.trim(),
                    author,
                    authorId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to submit review: ${response.status}`);
            }

            const newReview = await response.json();

            // Add the new review to the top of our list
            setReviews([newReview, ...reviews]);

            // Clear the form
            setCourse('');
            setProfessor('');
            setRating(5);
            setComment('');

            // Show success message
            setFormError(''); // Clear any previous errors
            // You could add a success state here if needed

        } catch (err) {
            console.error('Error submitting review:', err);
            setFormError(err.message || 'Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date for display
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Recently';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Recently';
        }
    };

    // Render star rating
    const renderStars = (rating) => {
        return (
            <div className="review-rating">
                {Array(rating).fill('★').join('')}
                {Array(5 - rating).fill('☆').join('')}
                <span className="rating-number">({rating}/5)</span>
            </div>
        );
    };

    return (
        <div className="page-container">
            <h2>🎓 Course & Faculty Reviews</h2>
            <p className="subtitle">See what seniors are saying and share your own experience.</p>

            {/* --- Section 1: Submit a New Review --- */}
            <div className="form-container analytics-card">
                <h4>Leave a Review</h4>
                <form onSubmit={handleSubmit} className="review-form">
                    <div className="form-row">
                        <input
                            type="text"
                            placeholder="Course Code (e.g., CSE321)"
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                            disabled={isSubmitting}
                            maxLength={50}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Professor's Name"
                            value={professor}
                            onChange={(e) => setProfessor(e.target.value)}
                            disabled={isSubmitting}
                            maxLength={100}
                            required
                        />
                    </div>
                    <div className="form-row">
                        <select
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            disabled={isSubmitting}
                        >
                            <option value={5}>5 ★ (Excellent)</option>
                            <option value={4}>4 ★ (Good)</option>
                            <option value={3}>3 ★ (Average)</option>
                            <option value={2}>2 ★ (Poor)</option>
                            <option value={1}>1 ★ (Avoid)</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <textarea
                            placeholder="Share your experience... (minimum 10 characters)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            disabled={isSubmitting}
                            maxLength={1000}
                            required
                        ></textarea>
                    </div>
                    <div className="form-footer">
                        <div className="character-count">
                            {comment.length}/1000
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !currentUser}
                            className={!currentUser ? 'disabled-btn' : ''}
                        >
                            {isSubmitting ? (
                                <span className="loading-text">
                                    <span className="loading-spinner"></span>
                                    Submitting...
                                </span>
                            ) : (
                                'Submit Review'
                            )}
                        </button>
                        {!currentUser && (
                            <p className="login-warning">
                                Please log in to submit a review.
                            </p>
                        )}
                    </div>
                    {formError && (
                        <div className={`form-message ${formError.includes('success') ? 'success' : 'error'}`}>
                            {formError}
                        </div>
                    )}
                </form>
            </div>

            {/* --- Section 2: Display Existing Reviews --- */}
            <div className="reviews-section">
                <div className="section-header">
                    <h3>All Reviews</h3>
                    {reviews.length > 0 && (
                        <span className="review-count">
                            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="reviews-list">
                    {isLoading && (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading reviews...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-state">
                            <p>❌ {error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="retry-btn"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {reviews.length === 0 && !isLoading && !error && (
                        <div className="empty-state">
                            <p>📝 No reviews yet. Be the first to share your experience!</p>
                        </div>
                    )}

                    {reviews.map((review) => (
                        <div key={review.id} className="review-card analytics-card">
                            <div className="review-header">
                                <h4>
                                    <span className="course-code">{review.course}</span>
                                    <span className="separator">-</span>
                                    <span className="professor-name">{review.professor}</span>
                                </h4>
                                {renderStars(review.rating)}
                            </div>
                            <p className="review-comment">{review.comment}</p>
                            <div className="review-footer">
                                <span className="review-author">
                                    Posted by: {review.author || 'Anonymous'}
                                </span>
                                <span className="review-date">
                                    {formatDate(review.createdAt)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add some inline styles for new elements */}
            <style jsx>{`
                .form-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .character-count {
                    font-size: 0.8rem;
                    color: var(--text-light);
                    text-align: right;
                }
                
                .loading-text {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                .disabled-btn {
                    background-color: var(--text-light) !important;
                    cursor: not-allowed !important;
                }
                
                .login-warning {
                    font-size: 0.9rem;
                    color: var(--warning-color);
                    margin: 0;
                    text-align: center;
                }
                
                .form-message {
                    padding: 0.75rem;
                    border-radius: 8px;
                    margin-top: 1rem;
                    font-size: 0.9rem;
                }
                
                .form-message.error {
                    background-color: #ffe6e6;
                    color: var(--error-color);
                    border: 1px solid var(--error-color);
                }
                
                .form-message.success {
                    background-color: #e6f9f0;
                    color: var(--success-color);
                    border: 1px solid var(--success-color);
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .review-count {
                    font-size: 0.9rem;
                    color: var(--text-light);
                    background-color: var(--light-blue);
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                }
                
                .loading-state,
                .error-state,
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-light);
                }
                
                .retry-btn {
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
                
                .review-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .review-header h4 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .course-code {
                    font-weight: 600;
                    color: var(--primary-color);
                }
                
                .separator {
                    color: var(--text-light);
                }
                
                .professor-name {
                    font-weight: 500;
                }
                
                .review-rating {
                    font-size: 1.2rem;
                    color: #ffb400;
                    white-space: nowrap;
                }
                
                .rating-number {
                    font-size: 0.8rem;
                    color: var(--text-light);
                    margin-left: 0.5rem;
                }
                
                .review-comment {
                    line-height: 1.6;
                    margin-bottom: 1rem;
                    white-space: pre-wrap;
                }
                
                .review-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.8rem;
                    color: var(--text-light);
                    border-top: 1px dashed var(--border-color);
                    padding-top: 0.75rem;
                    margin-top: 0.75rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .review-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .review-footer {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default CourseReviews;