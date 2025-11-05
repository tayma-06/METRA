import React from 'react';
// 1. We now also import 'Outlet'
import { BrowserRouter as Router, Routes, Route, Link, Outlet } from 'react-router-dom';

// --- Page Components ---
import Dashboard from './components/Dashboard';
import CourseReviews from './components/CourseReviews';
import SeniorHub from './components/SeniorHub';
import StudyGroups from './components/StudyGroups';
import AISolver from './components/AISolver';
import ProgressAnalytics from './components/ProgressAnalytics';
import MaterialRepository from './components/MaterialRepository';
import './styles.css';

// 2. --- Create a separate Layout component ---
// This component defines the *persistent* part of your app:
// the navbar and the main container where pages will be rendered.
const AppLayout = () => (
    <div className="App">
        <nav className="navbar">
            <Link to="/" className="nav-brand">METRA</Link>
            <div className="nav-links">
                <Link to="/reviews">Course Reviews</Link>
                <Link to="/hub">Senior Hub</Link>
                <Link to="/groups">Study Groups</Link>
                <Link to="/solver">AI Solver</Link>
                <Link to="/progress">My Progress</Link>
                <Link to="/materials">Materials</Link>
            </div>
            <div className="nav-user">Ayesha</div>
        </nav>
        <main className="main-content">
            {/* 3. The <Outlet> component is a placeholder.
          React Router will render the correct page component here
          (e.g., <Dashboard />, <CourseReviews />, etc.) */}
            <Outlet />
        </main>
    </div>
);

// 4. --- The App component is now cleaner ---
// Its only job is to define the application's routes.
function App() {
    return (
        <Router>
            <Routes>
                {/* 5. We create a parent route that uses our AppLayout.
            All child routes will now render *inside* the <Outlet>
            in AppLayout. */}
                <Route path="/" element={<AppLayout />}>

                    {/* 6. The 'index' route renders at the parent's path ("/") */}
                    <Route index element={<Dashboard />} />

                    {/* 7. All other pages are now nested routes */}
                    <Route path="reviews" element={<CourseReviews />} />
                    <Route path="hub" element={<SeniorHub />} />
                    <Route path="groups" element={<StudyGroups />} />
                    <Route path="solver" element={<AISolver />} />
                    <Route path="progress" element={<ProgressAnalytics />} />
                    <Route path="materials" element={<MaterialRepository />} />

                    {/* You could add a 404 Not Found route here later */}
                    {/* <Route path="*" element={<NotFound />} /> */}
                </Route>
            </Routes>
        </Router>
    );
}

export default App;