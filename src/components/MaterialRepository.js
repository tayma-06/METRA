import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function MaterialRepository() {
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    // --- State for the new material form ---
    const [course, setCourse] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Notes');
    const [link, setLink] = useState(''); // State for the shareable link
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { currentUser } = useAuth(); // Get the current user

    // 1. --- FETCH ALL MATERIALS (GET Request) ---
    useEffect(() => {
        const fetchMaterials = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/materials`);
                if (!response.ok) {
                    throw new Error('Failed to fetch materials.');
                }
                const data = await response.json();
                setMaterials(data); // Save the materials
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMaterials();
    }, []); // Runs once on mount

    // 2. --- SUBMIT A NEW MATERIAL (POST Request) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setMessage(null);
        if (!course || !title || !category || !link) {
            setFormError('Please fill out all fields.');
            return;
        }
        if (!link.startsWith('http')) {
            setFormError('Please enter a valid link (e.g., https://...)');
            return;
        }

        setIsSubmitting(true);
        try {
            // Use signInAnonymously if currentUser is null, otherwise use the real UID/Display name
            const authorId = currentUser ? currentUser.uid : 'anonymous-' + Math.random().toString(36).substring(2, 9);
            const authorName = currentUser ? (currentUser.displayName || 'Authenticated User') : 'Anonymous';

            const response = await fetch(`${BACKEND_URL}/api/materials/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course,
                    title,
                    category,
                    link,
                    authorId: authorId,
                    authorName: authorName
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to share material.');
            }

            const newMaterial = await response.json();
            setMaterials([newMaterial, ...materials]);
            setMessage('Material shared successfully!');

            // Clear the form
            setCourse('');
            setTitle('');
            setCategory('Notes');
            setLink('');

        } catch (err) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. --- NEW: DELETE A MATERIAL (DELETE Request) ---
    const handleDelete = async (materialId) => {
        // We use a custom modal or simple confirmation since alert() is forbidden
        if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
            return;
        }

        setError(null);
        setMessage(null);
        try {
            // IMPORTANT: We must still send the current user's UID for the *backend* check
            const userId = currentUser ? currentUser.uid : 'temp-user';

            const response = await fetch(`${BACKEND_URL}/api/materials/${materialId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });

            const data = await response.json();
            if (!response.ok) {
                // The backend still enforces the ownership check! (Unless you commented it out in server.js)
                throw new Error(data.message || 'Failed to delete material. The server still requires ownership verification.');
            }

            // Remove the material from the state
            setMaterials(materials.filter(m => m.id !== materialId));
            setMessage('Material deleted successfully.');

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="page-container">
            <h2>📚 Centralized Material Repository</h2>
            <p className="subtitle">Find and share notes, slides, and past papers using shareable links (e.g., Google Drive).</p>

            {/* --- Section 1: Submit a New Material --- */}
            <div className="form-container analytics-card">
                <h4>Share a Resource</h4>
                <form onSubmit={handleSubmit} className="review-form">
                    {formError && <p style={{ color: 'red' }}>{formError}</p>}
                    {message && <p style={{ color: 'green' }}>{message}</p>}

                    <div className="form-row">
                        <input
                            type="text"
                            placeholder="Course Code (e.g., CSE321)"
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Title (e.g., Midterm 2023 Solved)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="Notes">Notes</option>
                            <option value="Slides">Slides</option>
                            <option value="Past Paper">Past Paper</option>
                            <option value="Book">Book</option>
                            <option value="Other">Other</option>
                        </select>
                        {/* Shareable Link input */}
                        <input
                            type="text"
                            placeholder="Shareable Link (e.g., Google Drive)"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Sharing...' : 'Share Material'}
                    </button>
                </form>
            </div>

            {/* --- Section 2: Display Existing Materials --- */}
            <h3 style={{ marginTop: '2rem' }}>Shared Materials</h3>
            <div className="reviews-list">
                {isLoading && <p>Loading materials...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {materials.length === 0 && !isLoading && <p>No materials shared yet. Be the first!</p>}

                {materials.map((material) => (
                    <div key={material.id} className="review-card analytics-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                <span
                    style={{
                        backgroundColor: '#eee',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        color: '#555'
                    }}
                >
                  {material.category}
                </span>
                                <h4 style={{ margin: '0.5rem 0 0.25rem 0' }}>{material.title}</h4>
                                <p style={{ margin: 0, color: '#5f6368' }}>For Course: {material.course}</p>
                            </div>

                            {/* --- EXTREME HARDCODE: Always show the delete button --- */}
                            {/* Removed {currentUser && ...} check */}
                            <button
                                onClick={() => handleDelete(material.id)}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: '#d9534f',
                                    border: '1px solid #d9534f',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                        </div>

                        <p style={{fontSize: '0.9rem', color: '#5f6368', marginTop: '1rem'}}>
                            Posted by: {material.authorName || 'Anonymous'}
                        </p>

                        {/* --- Link Button --- */}
                        <a
                            href={material.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                textDecoration: 'none',
                                display: 'inline-block',
                                width: '100%',
                                textAlign: 'center',
                                padding: '0.75rem',
                                backgroundColor: '#007aff',
                                color: 'white',
                                borderRadius: '8px',
                                marginTop: '1rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Open Material
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MaterialRepository;