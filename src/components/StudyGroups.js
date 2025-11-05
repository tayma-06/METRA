import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function StudyGroups() {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null); // For success/error messages

    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // --- State for the "Create Group" form ---
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [groupCapacity, setGroupCapacity] = useState(5);
    const [isCreating, setIsCreating] = useState(false);

    // --- 1. FETCH ALL GROUPS ---
    useEffect(() => {
        const fetchGroups = async () => {
            setIsLoading(true);
            setError(null);
            setMessage(null);

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
    }, []); // The empty array [] means this runs only once on mount

    // --- 2. "JOIN" A GROUP (POST Request) ---
    const handleJoinGroup = async (groupId, groupName) => {
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/study-groups/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: groupId,
                    userId: currentUser.uid // Send the user's ID
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to join group.');
            }

            // Update the local state to show the new member
            setGroups(groups.map(g =>
                g.id === groupId ? data.group : g // Replace the group with the updated one
            ));

            setMessage(`Successfully joined "${groupName}"!`); // Show success

        } catch (err) {
            // Show the specific error from the backend (e.g., "You are already in this group.")
            setMessage(err.message);
        }
    };

    // --- 3. "CREATE" A NEW GROUP (POST Request) ---
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsCreating(true);

        try {
            const response = await fetch(`${BACKEND_URL}/api/study-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName,
                    description: groupDesc,
                    capacity: groupCapacity,
                    creatorId: currentUser.uid
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create group.');
            }

            // Add the new group to the top of our list
            setGroups([data, ...groups]);
            setMessage(`Successfully created "${data.name}"!`);

            // Reset form and hide it
            setShowCreateForm(false);
            setGroupName('');
            setGroupDesc('');
            setGroupCapacity(5);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    // --- 4. Filter groups into two lists ---
    const myGroups = groups.filter(g => g.memberIds?.includes(currentUser.uid));
    const availableGroups = groups.filter(g => !g.memberIds?.includes(currentUser.uid));

    // --- 5. Render Helper for a single group card ---
    const renderGroupCard = (group, isMember) => {
        const isFull = (group.memberIds?.length || 0) >= group.capacity;

        return (
            <div key={group.id} className="review-card analytics-card">
                <h4>{group.name}</h4>
                <p>{group.description}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <span>
            Members: {group.memberIds?.length || 0} / {group.capacity}
          </span>

                    {isMember ? (
                        // User is a member, show "View Chat"
                        <button
                            onClick={() => navigate(`/groups/${group.id}`)}
                            style={{backgroundColor: '#00a859'}} // Green color
                        >
                            View Chat
                        </button>
                    ) : (
                        // User is NOT a member, show "Join Group"
                        <button
                            onClick={() => handleJoinGroup(group.id, group.name)}
                            disabled={isFull} // Disable if full
                            style={{backgroundColor: isFull ? '#aaa' : '#007aff'}}
                        >
                            {isFull ? 'Group Full' : 'Join Group'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <h2>🤝 Smart Study Groups</h2>
            <p className="subtitle">Join a group and start collaborating.</p>

            {/* --- Section 1: Create Group Button & Form --- */}
            <div className="analytics-card" style={{ marginBottom: '2rem' }}>
                {!showCreateForm ? (
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h4>Want to start your own group?</h4>
                        <button onClick={() => setShowCreateForm(true)}>
                            Create New Group
                        </button>
                    </div>
                ) : (
                    // --- The "Create Group" Form ---
                    <form onSubmit={handleCreateGroup} className="review-form">
                        <h4>Create a New Study Group</h4>
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        <input
                            type="text"
                            placeholder="Group Name (e.g., CSE420 Final Review)"
                            required
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            style={{marginBottom: '1rem'}}
                        />
                        <textarea
                            placeholder="Short description of the group's goals"
                            required
                            value={groupDesc}
                            onChange={(e) => setGroupDesc(e.target.value)}
                        />
                        <label style={{marginBottom: '0.5rem', fontWeight: '500', display: 'block'}}>
                            Capacity: {groupCapacity} members
                        </label>
                        <input
                            type="range"
                            min="2" max="20"
                            value={groupCapacity}
                            onChange={(e) => setGroupCapacity(Number(e.target.value))}
                            style={{width: '100%', marginBottom: '1.5rem'}}
                        />
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <button
                                type="button"
                                disabled={isCreating}
                                onClick={() => setShowCreateForm(false)}
                                style={{backgroundColor: '#888'}}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                            >
                                {isCreating ? 'Creating...' : 'Create Group'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* --- User Messages --- */}
            {message && (
                <div className="analytics-card" style={{ marginBottom: '2rem', backgroundColor: message.includes('Successfully') ? '#e6f9f0' : '#ffebee' }}>
                    <p>{message}</p>
                </div>
            )}

            {/* --- Section 2: "My Groups" List --- */}
            <h3 style={{ marginTop: '2rem' }}>My Groups</h3>
            <div className="reviews-list">
                {isLoading && <p>Loading groups...</p>}
                {myGroups.length > 0 ? (
                    myGroups.map(group => renderGroupCard(group, true))
                ) : (
                    !isLoading && <p>You haven't joined any groups yet.</p>
                )}
            </div>

            {/* --- Section 3: "Available Groups" List --- */}
            <h3 style={{ marginTop: '2rem' }}>Available Groups to Join</h3>
            <div className="reviews-list">
                {isLoading && <p>Loading groups...</p>}
                {availableGroups.length > 0 ? (
                    availableGroups.map(group => renderGroupCard(group, false))
                ) : (
                    !isLoading && <p>No available groups. Why not create one?</p>
                )}
            </div>
        </div>
    );
}

export default StudyGroups;