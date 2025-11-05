import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // 1. Import useAuth

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function CourseReviews() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- State for the new review form ---
    const [course, setCourse] = useState('');
    const [professor, setProfessor] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [formError, setFormError] = useState('');

    const { currentUser } = useAuth(); // 2. Get the current user

    // 1. --- FETCH ALL REVIEWS (GET Request) ---
    useEffect(() => {
        const fetchReviews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/reviews`);
                if (!response.ok) {
                    throw new Error('Failed to fetch reviews.');
                }
                const data = await response.json();
                setReviews(data); // Save the reviews from the backend
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();
    }, []); // The empty array [] means this runs only once on mount

    // 2. --- SUBMIT A NEW REVIEW (POST Request) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!course || !professor || !comment) {
            setFormError('Please fill out all fields.');
            return;
        }

        try {
            // 3. --- ADD THE AUTHOR'S NAME & ID ---
            const author = currentUser.displayName || currentUser.email;
            const authorId = currentUser.uid; // Get the unique ID

            const response = await fetch(`${BACKEND_URL}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 4. Send the new authorId to the backend
                body: JSON.stringify({ course, professor, rating, comment, author, authorId }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit review.');
            }

            const newReview = await response.json();

            // Add the new review to the top of our list
            setReviews([newReview, ...reviews]);

            // Clear the form
            setCourse('');
            setProfessor('');
            setRating(5);
            setComment('');

        } catch (err) {
            setFormError(err.message);
        }
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
                        />
                        <input
                            type="text"
                            placeholder="Professor's Name"
                            value={professor}
                            onChange={(e) => setProfessor(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                            <option value={5}>5 ★ (Excellent)</option>
                            <option value={4}>4 ★ (Good)</option>
                            <option value={3}>3 ★ (Average)</option>
                            <option value={2}>2 ★ (Poor)</option>
                            <option value={1}>1 ★ (Avoid)</option>
                        </select>
                    </div>
                    <textarea
                        placeholder="Share your experience..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    ></textarea>
                    <button type="submit">Submit Review</button>
                    {formError && <p style={{ color: 'red' }}>{formError}</p>}
                </form>
            </div>

            {/* --- Section 2: Display Existing Reviews --- */}
            <h3 style={{ marginTop: '2rem' }}>All Reviews</h3>
            <div className="reviews-list">
                {isLoading && <p>Loading reviews...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {reviews.length === 0 && !isLoading && <p>No reviews yet. Be the first!</p>}

                {reviews.map((review) => (
                    <div key={review.id} className="review-card analytics-card">
                        <h4>{review.course} - <span>{review.professor}</span></h4>
                        <div className="review-rating">{Array(review.rating).fill('★').join('')}{Array(5 - review.rating).fill('☆').join('')}</div>
                        <p>{review.comment}</p>
                        {/* 4. --- SHOW THE AUTHOR --- */}
                        <p style={{fontSize: '0.9rem', color: '#5f6368', borderTop: '1px dashed #eee', paddingTop: '10px', marginTop: '10px'}}>
                            Posted by: {review.author || 'Anonymous'}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CourseReviews;