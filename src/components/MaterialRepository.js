import React, { useState, useEffect } from 'react';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function MaterialRepository() {
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- State for the new material form ---
    const [course, setCourse] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Notes');
    const [formError, setFormError] = useState('');

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
                setMaterials(data.reverse()); // Show newest first
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMaterials();
    }, []);

    // 2. --- SUBMIT A NEW MATERIAL (POST Request) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!course || !title || !category) {
            setFormError('Please fill out all fields.');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/materials/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course, title, category }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit material.');
            }

            const newMaterial = await response.json();
            setMaterials([newMaterial, ...materials]); // Add to list

            // Clear the form
            setCourse('');
            setTitle('');
            setCategory('Notes');

        } catch (err) {
            setFormError(err.message);
        }
    };

    return (
        <div className="page-container">
            <h2>📚 Centralized Material Repository</h2>
            <p className="subtitle">Find and share notes, slides, and past papers.</p>

            {/* --- Section 1: Upload New Material --- */}
            <div className="form-container analytics-card" style={{ marginBottom: '2rem' }}>
                <h4>Share a Resource</h4>
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
                            placeholder="Title (e.g., Midterm 2023 Solved)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="Notes">Notes</option>
                            <option value="Past Paper">Past Paper</option>
                            <option value="Slides">Slides</option>
                            <option value="Book">Book</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    {/* In a real app, this would be a file input */}
                    <button type="submit">Share Material</button>
                    {formError && <p style={{ color: 'red' }}>{formError}</p>}
                </form>
            </div>

            {/* --- Section 2: Display Existing Materials --- */}
            <h3 style={{ marginTop: '2rem' }}>All Materials</h3>
            <div className="reviews-list">
                {isLoading && <p>Loading materials...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {materials.length === 0 && !isLoading && <p>No materials yet. Be the first to share!</p>}

                {materials.map((material) => (
                    <div key={material.id} className="review-card analytics-card">
                        <h4>
              <span style={{backgroundColor: '#e6f2ff', padding: '3px 8px', borderRadius: '5px', color: '#007aff', marginRight: '10px'}}>
                {material.category}
              </span>
                            {material.title}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <span style={{fontWeight: '600'}}>{material.course}</span>
                            <a href={material.link} target="_blank" rel="noopener noreferrer">
                                <button>Download</button>
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MaterialRepository;