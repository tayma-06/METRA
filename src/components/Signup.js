import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // --- NEW FIELDS ---
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState('1st Year Student'); // Default role
    // --- END NEW FIELDS ---

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth(); // Get signup function from context
    const navigate = useNavigate(); // To redirect after signup

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!displayName) {
            return setError('Please enter a display name.');
        }

        setLoading(true);

        try {
            // --- UPDATED SIGNUP CALL ---
            // Pass all the new info to our signup function
            await signup(email, password, displayName, role);
            navigate('/'); // Redirect to dashboard on success
        } catch (err) {
            setError('Failed to create an account. ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="page-container" style={{maxWidth: '450px', margin: '4rem auto'}}>

            {/* --- THIS IS THE REFINEMENT --- */}
            <h1 style={{textAlign: 'center', color: '#007aff', margin: '0 0 0.5rem 0'}}>METRA</h1>
            <h2 style={{textAlign: 'center', marginBottom: '1rem', fontWeight: '500'}}>Create Your Account</h2>
            <p className="subtitle" style={{textAlign: 'center', marginTop: 0, marginBottom: '2rem'}}>
                Join the community and get organized.
            </p>
            {/* --- END REFINEMENT --- */}

            <form onSubmit={handleSubmit} className="review-form">
                {error && <p style={{color: 'red', textAlign: 'center', background: '#ffebee', padding: '0.5rem', borderRadius: '4px'}}>{error}</p>}

                {/* I've removed the <label> tags for a cleaner look */}
                <input
                    type="text"
                    placeholder="Display Name (e.g., Jeba Shajida)"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{marginBottom: '1rem'}}
                />

                {/* We can make the <select> a placeholder-style */}
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{marginBottom: '1rem', width: '100%', padding: '0.85rem', border: '1px solid #ccc', borderRadius: '8px', color: role ? '#333' : '#757575'}}
                >
                    <option>1st Year Student</option>
                    <option>2nd Year Student</option>
                    <option>3rd Year Student</option>
                    <option>4th Year Student</option>
                    <option>Graduate Student</option>
                    <option>Alumni / Senior</option>
                </select>

                <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{marginBottom: '1rem'}}
                />
                <input
                    type="password"
                    placeholder="Password (6+ characters)"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{marginBottom: '1.5rem'}}
                />
                <button type="submit" disabled={loading} style={{width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: '500'}}>
                    {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
            </form>
            <p style={{textAlign: 'center', marginTop: '1.5rem', color: '#555'}}>
                Already have an account? <Link to="/login" style={{color: '#007aff', fontWeight: '500'}}>Log In</Link>
            </p>
        </div>
    );
}

export default Signup;