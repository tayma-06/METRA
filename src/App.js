import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Notices from './components/Notices';
import { CourseCatalogPage, CourseDetailPage } from "./components/CourseMarketplaceDemo";

// Pages
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
import VideoCall from './components/VideoCall';
import './styles.css';

// Guard
const ProtectedRoute = () => {
  const { currentUser } = useAuth();
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

// Layout - Keeping your original structure, just cleaner styling
const AppLayout = () => {
  const { currentUser } = useAuth();

  return (
    <div className="App">
      <nav className="navbar">
        <Link to="/" className="nav-brand">METRA</Link>

        <div className="nav-links">
          {/* Public link */}
          <Link to="/courses">Courses</Link>

          {currentUser && (
            <>
              <Link to="/notices">Notices</Link>
              <Link to="/reviews">Reviews</Link>
              <Link to="/hub">Senior Hub</Link>
              <Link to="/groups">Groups</Link>
              <Link to="/solver">AI Solver</Link>
              <Link to="/progress">Progress</Link>
              <Link to="/materials">Materials</Link>
            </>
          )}
        </div>

        <div className="nav-user">
          {currentUser ? (
            <Link to="/profile" className="profile-btn">
              {currentUser.displayName || 'Profile'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="login-btn">Log In</Link>
              <Link to="/signup" className="signup-btn">Sign Up</Link>
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

// Routes - Your original structure
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Public */}
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="courses" element={<CourseCatalogPage />} />
          <Route path="courses/:courseId" element={<CourseDetailPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="notices" element={<Notices />} />
            <Route path="reviews" element={<CourseReviews />} />
            <Route path="hub" element={<SeniorHub />} />
            <Route path="groups" element={<StudyGroups />} />
            <Route path="groups/:groupId" element={<StudyGroupChat />} />
            <Route path="groups/:groupId/call" element={<VideoCall />} />
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