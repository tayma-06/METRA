import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth(); // Get signup function from context
    const navigate = useNavigate(); // To redirect after signup

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signup(email, password);
            navigate('/'); // Redirect to dashboard on success
        } catch (err) {
            setError('Failed to create an account. ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="page-container" style={{maxWidth: '500px', margin: '4rem auto'}}>
            <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>Create Your METRA Account</h2>
            <form onSubmit={handleSubmit} className="review-form">
                {error && <p style={{color: 'red', textAlign: 'center', background: '#ffebee', padding: '0.5rem', borderRadius: '4px'}}>{error}</p>}
                <label style={{marginBottom: '0.5rem', fontWeight: '500'}}>Email</label>
                <input
                    type="email"
                    placeholder="you@university.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{marginBottom: '1rem'}}
                />
                <label style={{marginBottom: '0.5rem', fontWeight: '500'}}>Password</label>
                <input
                    type="password"
                    placeholder="6+ characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{marginBottom: '1.5rem'}}
                />
                <button type="submit" disabled={loading} style={{width: '100%', padding: '0.85rem'}}>
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