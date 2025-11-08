import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Notices from './components/Notices';

// Pages hehe
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
import StudyGroupChat from './components/StudyGroupChat';
import VideoCall from './components/VideoCall'; // <-- video call page
import './styles.css';

// Guard
const ProtectedRoute = () => {
  const { currentUser } = useAuth();
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

// Layout
const AppLayout = () => {
  const { currentUser } = useAuth();

  return (
    <div className="App">
      <nav className="navbar">
        <Link to="/" className="nav-brand">METRA</Link>

        <div className="nav-links">
          {currentUser && (
            <><Link to="/notices">Notices</Link>
              <Link to="/reviews">Course Reviews</Link>
              <Link to="/hub">Senior Hub</Link>
              <Link to="/groups">Study Groups</Link>
              <Link to="/solver">AI Solver</Link>
              <Link to="/progress">My Progress</Link>
              <Link to="/materials">Materials</Link>
            </>
          )}
        </div>

        <div className="nav-user">
          {currentUser ? (
            <Link
              to="/profile"
              style={{
                backgroundColor: '#e6f2ff',
                color: '#007aff',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              {currentUser.displayName || 'My Profile'}
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ marginRight: '1rem', color: '#333', fontWeight: 500 }}>
                Log In
              </Link>
              <Link
                to="/signup"
                style={{
                  backgroundColor: '#007aff',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
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

// Routes
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Public */}
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
          <Route path="notices" element={<Notices />} />
            <Route index element={<Dashboard />} />
            <Route path="reviews" element={<CourseReviews />} />
            <Route path="hub" element={<SeniorHub />} />
            <Route path="groups" element={<StudyGroups />} />
            <Route path="groups/:groupId" element={<StudyGroupChat />} />
            <Route path="groups/:groupId/call" element={<VideoCall />} /> {/* video call room */}
            <Route path="solver" element={<AISolver />} />
            <Route path="progress" element={<ProgressAnalytics />} />
            <Route path="materials" element={<MaterialRepository />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 404 -> home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
