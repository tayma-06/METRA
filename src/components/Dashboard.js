import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- FETCH DASHBOARD SUMMARY (GET Request) ---
    useEffect(() => {
        const fetchSummary = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${BACKEND_URL}/api/dashboard-summary`);
                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard summary.');
                }
                const data = await response.json();
                setSummary(data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);

    return (
        <div className="dashboard">
            <h2>Welcome back, Ayesha!</h2>
            <p className="subtitle">Your integrated academic partner. What do you need help with today?</p>

            {/* --- Section 1: Dynamic Summary Cards --- */}
            <div className="dashboard-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

                {/* Latest Senior Hub Post */}
                <Link to="/hub" className="dashboard-card" style={{ backgroundColor: '#e6f2ff' }}>
                    <h4 style={{marginTop: 0, color: '#007aff'}}>New in Senior Hub</h4>
                    {isLoading && <p>Loading...</p>}
                    {summary && summary.latestPost ? (
                        <p>"{summary.latestPost.question}"</p>
                    ) : (
                        !isLoading && <p>No new posts.</p>
                    )}
                </Link>

                {/* Latest Material */}
                <Link to="/materials" className="dashboard-card" style={{ backgroundColor: '#f0f0f0' }}>
                    <h4 style={{marginTop: 0, color: '#333'}}>Newest Material</h4>
                    {isLoading && <p>Loading...</p>}
                    {summary && summary.latestMaterial ? (
                        <p>{summary.latestMaterial.title}</p>
                    ) : (
                        !isLoading && <p>No new materials.</p>
                    )}
                </Link>

                {/* Open Study Group */}
                <Link to="/groups" className="dashboard-card" style={{ backgroundColor: '#e6f9f0' }}>
                    <h4 style={{marginTop: 0, color: '#00a859'}}>Open Study Group</h4>
                    {isLoading && <p>Loading...</p>}
                    {summary && summary.openGroup ? (
                        <p>{summary.openGroup.name}</p>
                    ) : (
                        !isLoading && <p>No open groups.</p>
                    )}
                </Link>
            </div>

            {/* --- Section 2: Main Feature Grid --- */}
            <div className="dashboard-grid">
                <Link to="/reviews" className="dashboard-card">
                    <h3>🎓 Course & Faculty Reviews</h3>
                    <p>Make informed choices for next semester.</p>
                </Link>

                <Link to="/hub" className="dashboard-card">
                    <h3>💡 Senior Suggestion Hub</h3>
                    <p>Get roadmaps and advice from senior students.</p>
                </Link>

                <Link to="/groups" className="dashboard-card">
                    <h3>🤝 Smart Study Groups</h3>
                    <p>Find your perfect study partners, matched by AI.</p>
                </Link>

                <Link to="/solver" className="dashboard-card">
                    <h3>🤖 AI Problem Solver</h3>
                    <p>Get step-by-step solutions for tough problems.</p>
                </Link>

                <Link to="/progress" className="dashboard-card">
                    <h3>📈 Progress Analyst AI</h3>
                    <p>See your personalized improvement plan.</p>
                </Link>

                <Link to="/materials" className="dashboard-card">
                    <h3>📚 Material Repository</h3>
                    <p>Access notes, slides, and past questions.</p>
                </Link>
            </div>
        </div>
    );
}

export default Dashboard;