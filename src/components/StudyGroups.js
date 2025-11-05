import React, { useState, useEffect } from 'react';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function StudyGroups() {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [joinMessage, setJoinMessage] = useState(null);

    // This state will hold our new, non-blocking message
    const [featureMessage, setFeatureMessage] = useState(null);

    // 1. --- FETCH ALL GROUPS (GET Request) ---
    useEffect(() => {
        const fetchGroups = async () => {
            setIsLoading(true);
            setError(null);
            setFeatureMessage(null); // Clear messages on load
            setJoinMessage(null);

            try {
                const response = await fetch(`${BACKEND_URL}/api/study-groups`);
                if (!response.ok) {
                    throw new Error('Failed to fetch study groups.');
                }
                const data = await response.json();
                setGroups(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGroups();
    }, []); // The empty array [] means this runs only once

    // 2. --- "JOIN" A GROUP (POST Request) ---
    const handleJoinGroup = async (groupId) => {
        setError(null);
        setJoinMessage(null);
        setFeatureMessage(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/study-groups/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to join group.');
            }

            // If successful, update the group count in our state
            setGroups(currentGroups =>
                currentGroups.map(group =>
                    group.id === groupId ? data.group : group
                )
            );
            setJoinMessage(data.message); // Show success message

        } catch (err) {
            setJoinMessage(err.message); // Show error message
        }
    };

    // 3. --- Handle "Find Group" button click ---
    const handleFindGroupClick = () => {
        // Instead of an alert, we set a message in our state.
        setFeatureMessage("This feature is coming soon! Our AI is busy learning.");
    };

    return (
        <div className="page-container">
            <h2>🤝 Smart Study Groups</h2>
            <p className="subtitle">Find your perfect study partners, matched by AI.</p>

            {/* --- Section 1: AI Match Button --- */}
            <div className="analytics-card" style={{ marginBottom: '2rem' }}>
                <h4>Find Your Perfect Group</h4>
                <p>Our AI will match you with other students based on your courses, goals, and schedule.</p>
                <button onClick={handleFindGroupClick}>
                    Find a New Group
                </button>
            </div>

            {/* This is where our new message will appear */}
            {featureMessage && (
                <div className="analytics-card" style={{ marginBottom: '2rem', backgroundColor: '#fffbe6' }}>
                    <p>{featureMessage}</p>
                </div>
            )}

            {joinMessage && (
                <div className="analytics-card" style={{ marginBottom: '2rem', backgroundColor: '#e6f2ff' }}>
                    <p>{joinMessage}</p>
                </div>
            )}

            {/* --- Section 2: Display Existing Groups --- */}
            <h3 style={{ marginTop: '2rem' }}>Available Groups</h3>
            <div className="reviews-list">
                {isLoading && <p>Loading groups...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {groups.map((group) => {
                    const isFull = group.members >= group.capacity;
                    return (
                        <div key={group.id} className="review-card analytics-card">
                            <h4>{group.name}</h4>
                            <p>{group.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <span>Members: {group.members} / {group.capacity}</span>
                                <button
                                    onClick={() => handleJoinGroup(group.id)}
                                    disabled={isFull}
                                    style={{ backgroundColor: isFull ? '#aaa' : '#007aff' }}
                                >
                                    {isFull ? 'Full' : 'Join Group'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default StudyGroups;