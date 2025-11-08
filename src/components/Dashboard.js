import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { currentUser } = useAuth();

    // Team members data - only names as requested
    const teamMembers = [
        { name: "Jeba Sajida" },
        { name: "Kanetah Khan" },
        { name: "Khadiza Sultana" },
        { name: "Anika Tahsin" }
    ];

    // Fetch dashboard summary
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
                console.error('Dashboard fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);

    // Quick actions data
    const quickActions = [
        { icon: '🚀', label: 'Quick Question', path: '/solver', color: '#007aff' },
        { icon: '📚', label: 'Browse Materials', path: '/materials', color: '#5856d6' },
        { icon: '👥', label: 'Find Groups', path: '/groups', color: '#ff2d55' },
        { icon: '💬', label: 'Ask Seniors', path: '/hub', color: '#ff9500' }
    ];

    return (
        <div className="dashboard">
            {/* Simple Welcome Section */}
            <div className="welcome-section-simple">
                <h1>Welcome back, {currentUser?.displayName || 'Student'}!</h1>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
                <h3>Quick Actions</h3>
                <div className="quick-actions-grid">
                    {quickActions.map((action, index) => (
                        <Link
                            key={index}
                            to={action.path}
                            className="quick-action-card"
                            style={{ '--action-color': action.color }}
                        >
                            <div className="action-icon" style={{ backgroundColor: action.color }}>
                                {action.icon}
                            </div>
                            <span className="action-label">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Live Activity Section */}
            <div className="activity-section">
                <h3>Live Activity</h3>
                <div className="dashboard-summary-grid">
                    {/* Latest Senior Hub Post */}
                    <Link to="/hub" className="summary-card hub-card">
                        <div className="card-header">
                            <div className="card-icon">💡</div>
                            <h4>New in Senior Hub</h4>
                        </div>
                        <div className="card-content">
                            {isLoading ? (
                                <div className="loading-skeleton"></div>
                            ) : summary && summary.latestPost ? (
                                <>
                                    <p className="summary-text">"{summary.latestPost.question}"</p>
                                    <div className="card-meta">
                                        <span className="meta-tag">New Post</span>
                                    </div>
                                </>
                            ) : (
                                <p className="summary-text">No new posts yet.</p>
                            )}
                        </div>
                    </Link>

                    {/* Latest Material */}
                    <Link to="/materials" className="summary-card materials-card">
                        <div className="card-header">
                            <div className="card-icon">📚</div>
                            <h4>Newest Material</h4>
                        </div>
                        <div className="card-content">
                            {isLoading ? (
                                <div className="loading-skeleton"></div>
                            ) : summary && summary.latestMaterial ? (
                                <>
                                    <p className="summary-text">{summary.latestMaterial.title}</p>
                                    <div className="card-meta">
                                        <span className="meta-tag">{summary.latestMaterial.category}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="summary-text">No new materials.</p>
                            )}
                        </div>
                    </Link>

                    {/* Open Study Group */}
                    <Link to="/groups" className="summary-card groups-card">
                        <div className="card-header">
                            <div className="card-icon">👥</div>
                            <h4>Open Study Group</h4>
                        </div>
                        <div className="card-content">
                            {isLoading ? (
                                <div className="loading-skeleton"></div>
                            ) : summary && summary.openGroup ? (
                                <>
                                    <p className="summary-text">{summary.openGroup.name}</p>
                                    <div className="card-meta">
                                        <span className="meta-tag">
                                            {summary.openGroup.memberIds?.length || 0} members
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="summary-text">No open groups.</p>
                            )}
                        </div>
                    </Link>
                </div>
            </div>

            {/* Main Features Grid */}
            <div className="features-section">
                <h3>Explore Features</h3>
                <div className="dashboard-grid">
                    <Link to="/reviews" className="feature-card">
                        <div className="feature-icon">🎓</div>
                        <h4>Course & Faculty Reviews</h4>
                        <p>Make informed choices for next semester with real student experiences.</p>
                        <div className="feature-badge">Updated Daily</div>
                    </Link>

                    <Link to="/hub" className="feature-card">
                        <div className="feature-icon">💡</div>
                        <h4>Senior Suggestion Hub</h4>
                        <p>Get roadmaps and advice from experienced senior students.</p>
                        <div className="feature-badge">Community</div>
                    </Link>

                    <Link to="/groups" className="feature-card">
                        <div className="feature-icon">🤝</div>
                        <h4>Smart Study Groups</h4>
                        <p>Find your perfect study partners, intelligently matched by AI.</p>
                        <div className="feature-badge">AI-Powered</div>
                    </Link>

                    <Link to="/solver" className="feature-card">
                        <div className="feature-icon">🤖</div>
                        <h4>AI Problem Solver</h4>
                        <p>Get step-by-step solutions for tough problems instantly.</p>
                        <div className="feature-badge">Instant Help</div>
                    </Link>

                    <Link to="/progress" className="feature-card">
                        <div className="feature-icon">📈</div>
                        <h4>Progress Analyst AI</h4>
                        <p>See your personalized improvement plan and track growth.</p>
                        <div className="feature-badge">Analytics</div>
                    </Link>

                    <Link to="/materials" className="feature-card">
                        <div className="feature-icon">📚</div>
                        <h4>Material Repository</h4>
                        <p>Access notes, slides, past questions, and study resources.</p>
                        <div className="feature-badge">Resource Hub</div>
                    </Link>
                </div>
            </div>

            {/* Team Section - Simplified as requested */}
            <div className="team-section">
                <div className="section-header">
                    <h3>Meet Our Team</h3>
                </div>
             <div className="team-members-row">
    {teamMembers.map((member, index) => (
        <div key={index} className="team-member-simple">
            <Link to={`/profile/${member.uid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="member-name">{member.name}</div>
                {/* Show their top 2 achievements as badges */}
                {member.achievements?.slice(0, 2).map(a => (
                    <span key={a.id} className={`badge ${a.type}`} style={{ marginLeft: 4 }}>
                        {a.title}
                    </span>
                ))}
            </Link>
        </div>
    ))}
</div>

                <div className="university-info">
                    Islamic University of Technology
                </div>
            </div>

            {/* Add CSS Styles */}
            <style jsx>{`
                .dashboard {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
.badge {
  display: inline-block;
  background: #f0f4ff;
  color: #007aff;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

                /* Simple Welcome Section */
                .welcome-section-simple {
                    text-align: center;
                    margin-bottom: 3rem;
                    padding: 2rem 0;
                }

                .welcome-section-simple h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--text-dark);
                    margin: 0;
                }

                /* Quick Actions */
                .quick-actions-section {
                    margin-bottom: 3rem;
                }

                .quick-actions-section h3 {
                    margin-bottom: 1.5rem;
                    font-size: 1.5rem;
                    color: var(--text-dark);
                }

                .quick-actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .quick-action-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 1.5rem;
                    background: var(--card-background);
                    border-radius: 15px;
                    text-decoration: none;
                    color: var(--text-dark);
                    transition: all 0.3s ease;
                    border: 1px solid var(--border-color);
                }

                .quick-action-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }

                .action-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    margin-bottom: 1rem;
                }

                .action-label {
                    font-weight: 600;
                    font-size: 0.95rem;
                }

                /* Activity Section */
                .activity-section {
                    margin-bottom: 3rem;
                }

                .activity-section h3 {
                    margin-bottom: 1.5rem;
                    font-size: 1.5rem;
                    color: var(--text-dark);
                }

                .dashboard-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .summary-card {
                    background: var(--card-background);
                    border-radius: 15px;
                    padding: 1.5rem;
                    text-decoration: none;
                    color: var(--text-dark);
                    border: 1px solid var(--border-color);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .summary-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                }

                .summary-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                }

                .hub-card::before { background: #007aff; }
                .materials-card::before { background: #5856d6; }
                .groups-card::before { background: #00a859; }

                .card-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .card-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    background: var(--light-blue);
                }

                .card-header h4 {
                    margin: 0;
                    font-size: 1.1rem;
                }

                .summary-text {
                    margin: 0 0 1rem 0;
                    line-height: 1.5;
                    color: var(--text-dark);
                }

                .card-meta {
                    display: flex;
                    gap: 0.5rem;
                }

                .meta-tag {
                    background: var(--light-blue);
                    color: var(--primary-color);
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .loading-skeleton {
                    height: 20px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 4px;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Features Section */
                .features-section {
                    margin-bottom: 4rem;
                }

                .features-section h3 {
                    margin-bottom: 1.5rem;
                    font-size: 1.5rem;
                    color: var(--text-dark);
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .feature-card {
                    background: var(--card-background);
                    border-radius: 15px;
                    padding: 2rem;
                    text-decoration: none;
                    color: var(--text-dark);
                    border: 1px solid var(--border-color);
                    transition: all 0.3s ease;
                    position: relative;
                }

                .feature-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                    border-color: var(--primary-color);
                }

                .feature-icon {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                }

                .feature-card h4 {
                    margin: 0 0 1rem 0;
                    font-size: 1.2rem;
                    color: var(--text-dark);
                }

                .feature-card p {
                    margin: 0 0 1.5rem 0;
                    color: var(--text-light);
                    line-height: 1.5;
                }

                .feature-badge {
                    display: inline-block;
                    background: var(--light-blue);
                    color: var(--primary-color);
                    padding: 0.4rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                /* Team Section - Updated as requested */
                .team-section {
                    background: linear-gradient(135deg, #f4f7f6 0%, #e8eceb 100%);
                    border-radius: 20px;
                    padding: 2rem;
                    text-align: center;
                }

                .section-header {
                    margin-bottom: 2rem;
                }

                .section-header h3 {
                    font-size: 1.8rem;
                    margin-bottom: 0.5rem;
                    color: var(--text-dark);
                }

                .team-members-row {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 3rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .team-member-simple {
                    text-align: center;
                }

                .member-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-dark);
                }

                .university-info {
                    font-size: 1rem;
                    color: var(--text-light);
                    font-style: italic;
                    margin-top: 1rem;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .dashboard {
                        padding: 1rem;
                    }

                    .welcome-section-simple {
                        padding: 1rem 0;
                    }

                    .welcome-section-simple h1 {
                        font-size: 2rem;
                    }

                    .quick-actions-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .dashboard-summary-grid,
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }

                    .team-members-row {
                        gap: 2rem;
                        flex-direction: column;
                    }

                    .team-section {
                        padding: 1.5rem;
                    }
                }

                @media (max-width: 480px) {
                    .team-members-row {
                        gap: 1.5rem;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        width: 100%;
                        padding: 0 1rem;
                        box-sizing: border-box;
                        margin: 0 auto;
                        max-width: 300px;
                        justify-content: flex-start;
                        align-items: stretch;
                    }

                    .team-member-simple {
                        width: 100%;
                        text-align: center;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid var(--border-color);
                    }

                    .team-member-simple:last-child {
                        border-bottom: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;