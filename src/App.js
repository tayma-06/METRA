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
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import StudyGroupChat from './components/StudyGroupChat'; // 1. Import the new Chat component
import './styles.css';

// --- Create a Protected Route component ---
const ProtectedRoute = () => {
    const { currentUser } = useAuth();
    return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

// --- Update the Layout ---
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
                            <Link to="/reviews">Course Reviews</Link>
                            <Link to="/hub">Senior Hub</Link>
                            <Link to="/groups">Study Groups</Link>
                            <Link to="/solver">AI Solver</Link>
                            <Link to="/progress">My Progress</Link>
                            <Link to="/materials">Materials</Link>
                        </>
                    )}
                </div>

                {/* Show Profile or Login/Signup based on auth state */}
                <div className="nav-user">
                    {currentUser ? (
                        // Show the user's name instead of just "Profile"
                        <Link to="/profile" style={{backgroundColor: '#e6f2ff', color: '#007aff', padding: '0.5rem 1rem', borderRadius: '20px', textDecoration: 'none', fontWeight: '500'}}>
                            {currentUser.displayName || 'My Profile'}
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

// --- Update the App's Routes ---
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
                    <Route element={<ProtectedRoute />}>
                        <Route index element={<Dashboard />} />
                        <Route path="reviews" element={<CourseReviews />} />
                        <Route path="hub" element={<SeniorHub />} />
                        <Route path="groups" element={<StudyGroups />} />
                        {/* 2. Add the new route. :groupId is a dynamic parameter */}
                        <Route path="groups/:groupId" element={<StudyGroupChat />} />
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