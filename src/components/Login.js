import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth(); // Get login function from context
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/'); // Redirect to dashboard on success
        } catch (err) {
            setError('Failed to log in. Check your email and password.');
        }
        setLoading(false);
    };

    return (
        <div className="page-container" style={{maxWidth: '500px', margin: '4rem auto'}}>
            <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>Welcome Back to METRA</h2>
            <form onSubmit={handleSubmit} className="review-form">
                {error && <p style={{color: 'red', textAlign: 'center', background: '#ffebee', padding: '0.5rem', borderRadius: '4px'}}>{error}</p>}
                <label style={{marginBottom: '0.5rem', fontWeight: '500'}}>Email</label>
                <input
                    type="email"
                    placeholder="you@university.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{marginBottom: '1.rem'}}
                />
                <label style={{marginBottom: '0.5rem', fontWeight: '500'}}>Password</label>
                <input
                    type="password"
                    placeholder="Your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{marginBottom: '1.5rem'}}
                />
                <button type="submit" disabled={loading} style={{width: '100%', padding: '0.85rem'}}>
                    {loading ? 'Logging In...' : 'Log In'}
                </button>
            </form>
            <p style={{textAlign: 'center', marginTop: '1.5rem', color: '#555'}}>
                Need an account? <Link to="/signup" style={{color: '#007aff', fontWeight: '500'}}>Sign Up</Link>
            </p>
        </div>
    );
}

export default Login;