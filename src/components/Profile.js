import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
// 1. Import the functions we need
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

function Profile() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- 2. Add state for editing ---
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('1st Year Student');
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser) {
            const fetchUserProfile = async () => {
                setLoading(true);
                const userDocRef = doc(db, "users", currentUser.uid);
                try {
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile(data);
                        // 3. Set initial state for the edit form
                        setEditName(data.displayName);
                        setEditRole(data.role);
                    } else {
                        console.log("No profile document found for this user.");
                        // 3. Set edit state from auth, since firestore doc is missing
                        setEditName(currentUser.displayName || '');
                    }
                } catch (err) {
                    console.error("Failed to fetch user profile", err);
                    setError("Failed to load profile data.");
                }
                setLoading(false);
            };

            fetchUserProfile();
        }
    }, [currentUser]); // Run this effect when currentUser changes

    const handleLogout = async () => {
        // ... (This function is the same)
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error("Failed to log out", err);
        }
    };

    // --- 4. NEW: Handle saving the edited profile ---
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Update the Firebase Auth profile (this updates currentUser.displayName)
            await updateProfile(currentUser, {
                displayName: editName
            });

            // 2. Update/Create the Firestore document
            const userDocRef = doc(db, "users", currentUser.uid);
            await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: editName,
                role: editRole
            }, { merge: true }); // {merge: true} is the magic!
            // It creates the doc if it's missing,
            // or updates it if it exists.

            // 3. Update our local state
            setUserProfile({ ...userProfile, displayName: editName, role: editRole });
            setIsEditing(false); // Exit edit mode

        } catch (err) {
            console.error("Failed to update profile:", err);
            setError('Failed to update profile.');
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="page-container" style={{maxWidth: '600px', margin: '2rem auto'}}><p>Loading profile...</p></div>
    }

    return (
        <div className="page-container" style={{maxWidth: '600px', margin: '2rem auto'}}>

            {/* --- 5. Show either Edit Form or Profile View --- */}
            {isEditing ? (
                // --- EDIT MODE ---
                <>
                    <h2 style={{textAlign: 'center'}}>Edit Profile</h2>
                    <form onSubmit={handleProfileUpdate} className="review-form">
                        {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}

                        <label style={{marginBottom: '0.5rem', fontWeight: '500'}}>Display Name</label>
                        <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{marginBottom: '1rem'}}
                        />

                        <label style={{marginBottom: '0.5rem', fontWeight: '500'}}>Your Role</label>
                        <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            style={{marginBottom: '1.5rem', width: '100%', padding: '0.85rem', border: '1px solid #ccc', borderRadius: '8px'}}
                        >
                            <option>1st Year Student</option>
                            <option>2nd Year Student</option>
                            <option>3rd Year Student</option>
                            <option>4th Year Student</option>
                            <option>Graduate Student</option>
                            <option>Alumni / Senior</option>
                        </select>

                        <div style={{display: 'flex', gap: '1rem'}}>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setIsEditing(false)}
                                style={{width: '100%', backgroundColor: '#888'}}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{width: '100%'}}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </>
            ) : (
                // --- VIEW MODE ---
                <>
                    <h2>User Profile</h2>
                    <div style={{lineHeight: '1.8'}}>
                        <p style={{fontSize: '1.1rem'}}>
                            <strong>Name:</strong> {userProfile?.displayName || currentUser.displayName || 'N/A'}
                        </p>
                        <p style={{fontSize: '1.1rem'}}>
                            <strong>Email:</strong> {currentUser.email}
                        </p>
                        <p style={{fontSize: '1.1rem'}}>
                            <strong>Role:</strong> {userProfile?.role || '(Profile data not found)'}
                        </p>
                    </div>

                    <button
                        onClick={() => setIsEditing(true)}
                        style={{width: '100%', marginTop: '1.5rem'}}
                    >
                        Edit Profile
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{width: '100%', marginTop: '1rem', backgroundColor: '#d9534f', padding: '0.75rem'}}
                    >
                        Log Out
                    </button>

                    {/* Your helpful note is still here! */}
                    {!userProfile && currentUser && (
                        <div className="analytics-card" style={{marginTop: '1rem', backgroundColor: '#fffbe6'}}>
                            <p style={{color: '#8a6d3b'}}>
                                **Note:** We couldn't load your full profile (e.g., your "Role"). Please click "Edit Profile" above to set your information.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Profile;