// StudyGroups.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

function StudyGroups() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // --- Create Group form state ---
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupCapacity, setGroupCapacity] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  // --- Fetch all groups ---
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`${BACKEND_URL}/api/study-groups`);
        if (!res.ok) throw new Error('Failed to fetch study groups.');
        const data = await res.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  // --- Join a group ---
  const handleJoinGroup = async (groupId, groupName) => {
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/study-groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, userId: currentUser.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to join group.');

      setGroups(groups.map(g => (g.id === groupId ? data.group : g)));
      setMessage(`Successfully joined "${groupName}"!`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  // --- Create a new group ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsCreating(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDesc,
          capacity: groupCapacity,
          creatorId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create group.');

      setGroups([data, ...groups]);
      setMessage(`Successfully created "${data.name}"!`);

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

  // --- Filter my groups and available groups ---
  const myGroups = groups.filter(g => g.memberIds?.includes(currentUser.uid));
  const availableGroups = groups.filter(g => !g.memberIds?.includes(currentUser.uid));

  // --- Helper: render a group card with video call button ---
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isMember ? (
              <>
                <button
                  onClick={() => navigate(`/groups/${group.id}`)}
                  style={{ backgroundColor: '#00a859', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6 }}
                >
                  View Chat
                </button>
                <button
                  onClick={() => navigate(`/groups/${group.id}/call`)}
                  style={{ backgroundColor: '#10b981', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6 }}
                >
                  📹 Video Call
                </button>
              </>
            ) : (
              <button
                onClick={() => handleJoinGroup(group.id, group.name)}
                disabled={isFull}
                style={{ backgroundColor: isFull ? '#aaa' : '#007aff', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6 }}
              >
                {isFull ? 'Group Full' : 'Join Group'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <h2>🤝 Smart Study Groups</h2>
      <p className="subtitle">Join a group and start collaborating.</p>

      {/* Create Group Section */}
      <div className="analytics-card" style={{ marginBottom: '2rem' }}>
        {!showCreateForm ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Want to start your own group?</h4>
            <button onClick={() => setShowCreateForm(true)}>Create New Group</button>
          </div>
        ) : (
          <form onSubmit={handleCreateGroup} className="review-form">
            <h4>Create a New Study Group</h4>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <input
              type="text"
              placeholder="Group Name (e.g., CSE420 Final Review)"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <textarea
              placeholder="Short description of the group's goals"
              required
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
            />
            <label style={{ marginBottom: '0.5rem', fontWeight: '500', display: 'block' }}>
              Capacity: {groupCapacity} members
            </label>
            <input
              type="range"
              min="2"
              max="20"
              value={groupCapacity}
              onChange={(e) => setGroupCapacity(Number(e.target.value))}
              style={{ width: '100%', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" disabled={isCreating} onClick={() => setShowCreateForm(false)} style={{ backgroundColor: '#888', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6 }}>
                Cancel
              </button>
              <button type="submit" disabled={isCreating} style={{ padding: '0.5rem 1rem', borderRadius: 6 }}>
                {isCreating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className="analytics-card" style={{ marginBottom: '2rem', backgroundColor: message.includes('Successfully') ? '#e6f9f0' : '#ffebee', padding: '1rem', borderRadius: 6 }}>
          <p>{message}</p>
        </div>
      )}

      {/* My Groups */}
      <h3 style={{ marginTop: '2rem' }}>My Groups</h3>
      <div className="reviews-list">
        {isLoading && <p>Loading groups...</p>}
        {myGroups.length > 0 ? myGroups.map(g => renderGroupCard(g, true)) : !isLoading && <p>You haven't joined any groups yet.</p>}
      </div>

      {/* Available Groups */}
      <h3 style={{ marginTop: '2rem' }}>Available Groups to Join</h3>
      <div className="reviews-list">
        {isLoading && <p>Loading groups...</p>}
        {availableGroups.length > 0 ? availableGroups.map(g => renderGroupCard(g, false)) : !isLoading && <p>No available groups. Why not create one?</p>}
      </div>
    </div>
  );
}

export default StudyGroups;
