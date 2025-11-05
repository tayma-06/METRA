import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // 1. Import useAuth

// --- Page Components ---
import Dashboard from './components/Dashboard';
import CourseReviews from './components/CourseReviews';
import SeniorHub from './components/SeniorHub';
import StudyGroups from './components/StudyGroups';
import AISolver from './components/AISolver';
import ProgressAnalytics from './components/ProgressAnalytics';
import MaterialRepository from './components/MaterialRepository';
import Login from './components/Login'; // 2. Import new pages
import Signup from './components/Signup';
import Profile from './components/Profile';
import './styles.css';

// 3. --- Create a Protected Route component ---
// This component checks if a user is logged in.
// If not, it redirects them to the /login page.
const ProtectedRoute = () => {
    const { currentUser } = useAuth();
    return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

// 4. --- Update the Layout ---
const AppLayout = () => {
    const { currentUser } = useAuth(); // Get the current user

    return (
        <div className="App">
            <nav className="navbar">
                <Link to="/" className="nav-brand">METRA</Link>
                <div className="nav-links">
                    {/* Only show main links if logged in */}
                    {currentUser && (
                        <>
                            <Link to="/">Dashboard</Link> {/* Added Dashboard link */}
                            <Link to="/reviews">Course Reviews</Link>
                            <Link to="/hub">Senior Hub</Link>
                            <Link to="/groups">Study Groups</Link>
                            <Link to="/solver">AI Solver</Link>
                            <Link to="/progress">My Progress</Link>
                            <Link to="/materials">Materials</Link>
                        </>
                    )}
                </div>

                {/* 5. Show Profile or Login/Signup based on auth state */}
                <div className="nav-user">
                    {currentUser ? (
                        <Link to="/profile" style={{backgroundColor: '#e6f2ff', color: '#007aff', padding: '0.5rem 1rem', borderRadius: '20px', textDecoration: 'none'}}>
                            Profile
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" style={{marginRight: '1rem', color: '#333', fontWeight: 500}}>Log In</Link>
                            <Link to="/signup" style={{backgroundColor: '#007aff', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', textDecoration: 'none', fontWeight: 500}}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

// 6. --- Update the App's Routes ---
function App() {
    return (
        <Router>
            <Routes>
                {/* Routes that use the main layout */}
                <Route path="/" element={<AppLayout />}>

                    {/* Public routes (Login, Signup) */}
                    <Route path="login" element={<Login />} />
                    <Route path="signup" element={<Signup />} />

                    {/* --- Protected Routes --- */}
                    {/* We wrap all protected pages inside our new <ProtectedRoute> */}
                    <Route element={<ProtectedRoute />}>
                        <Route index element={<Dashboard />} />
                        <Route path="reviews" element={<CourseReviews />} />
                        <Route path="hub" element={<SeniorHub />} />
                        <Route path="groups" element={<StudyGroups />} />
                        <Route path="solver" element={<AISolver />} />
                        <Route path="progress" element={<ProgressAnalytics />} />
                        <Route path="materials" element={<MaterialRepository />} />
                        <Route path="profile" element={<Profile />} />
                    </Route>

                </Route>
            </Routes>
        </Router>
    );
}

export default App;