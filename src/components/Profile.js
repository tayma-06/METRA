import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Profile() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login'); // Redirect to login after logout
        } catch (err) {
            console.error("Failed to log out", err);
        }
    };

    return (
        <div className="page-container" style={{maxWidth: '600px', margin: '2rem auto'}}>
            <h2>User Profile</h2>
            {currentUser && (
                <div style={{lineHeight: '1.8'}}>
                    <p style={{fontSize: '1.1rem'}}><strong>Email:</strong> {currentUser.email}</p>
                    <p style={{fontSize: '1.1rem'}}><strong>User ID:</strong> <code style={{background: '#eee', padding: '2px 4px', borderRadius: '4px'}}>{currentUser.uid}</code></p>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            marginTop: '1.5rem',
                            backgroundColor: '#d9534f',
                            padding: '0.75rem'
                        }}
                    >
                        Log Out
                    </button>
                </div>
            )}
        </div>
    );
}

export default Profile;