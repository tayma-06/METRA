import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

const CATEGORIES = ['Notes', 'Slides', 'Past Paper', 'Book', 'Other'];
const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest' },
  { value: 'likes_desc', label: 'Most Liked' },
  { value: 'clicks_desc', label: 'Most Viewed' },
];

function MaterialRepository() {
  const { currentUser } = useAuth();

  // State management
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    category: 'Notes',
    link: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    category: '',
    sort: 'createdAt_desc',
    onlyMine: false,
    onlyBookmarked: false
  });

  const myUid = currentUser?.uid || '';

  // Fetch materials with error handling
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('q', filters.search);
      if (filters.course) params.set('course', filters.course);
      if (filters.category) params.set('category', filters.category);
      params.set('sort', filters.sort);
      params.set('limit', '100');

      const response = await fetch(`${BACKEND_URL}/api/materials?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch materials: ${response.status}`);
      }
      
      let data = await response.json();

      // Apply client-side filters
      if (filters.onlyMine && myUid) {
        data = data.filter(material => material.authorId === myUid);
      }
      
      if (filters.onlyBookmarked && myUid) {
        data = data.filter(material => 
          (material.bookmarkedBy || []).includes(myUid)
        );
      }

      setMaterials(data);
    } catch (err) {
      setError(err.message || 'Failed to load materials. Please try again.');
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, myUid]);

  // Initial load and filter changes
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search !== '') {
        fetchMaterials();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search, fetchMaterials]);

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Submit new material
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    const { course, title, category, link } = formData;
    if (!course.trim() || !title.trim() || !category || !link.trim()) {
      setError('Please fill out all fields.');
      return;
    }

    if (!/^https?:\/\//i.test(link)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsSubmitting(true);

    try {
      const materialData = {
        course: course.trim(),
        title: title.trim(),
        category,
        link: link.trim(),
        authorId: myUid || `anonymous-${Math.random().toString(36).slice(2, 9)}`,
        authorName: currentUser?.displayName || (myUid ? 'User' : 'Anonymous')
      };

      const response = await fetch(`${BACKEND_URL}/api/materials/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(materialData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to share material');
      }

      const newMaterial = await response.json();
      
      // Add to local state
      setMaterials(prev => [newMaterial, ...prev]);
      
      // Reset form and show success
      setFormData({ course: '', title: '', category: 'Notes', link: '' });
      setMessage('Material shared successfully!');
      
    } catch (err) {
      setError(err.message || 'Failed to share material. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete material
  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    setError('');
    setMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: myUid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete material');
      }

      // Remove from local state
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      setMessage('Material deleted successfully.');
      
    } catch (err) {
      setError(err.message || 'Failed to delete material. Please try again.');
    }
  };

  // Toggle like with optimistic updates
  const toggleLike = async (material) => {
    if (!myUid) {
      setMessage('Please sign in to like materials.');
      return;
    }

    const isLiked = (material.likedBy || []).includes(myUid);
    const originalMaterials = [...materials];

    // Optimistic update
    setMaterials(prev => prev.map(m => 
      m.id === material.id 
        ? {
            ...m,
            likes: (m.likes || 0) + (isLiked ? -1 : 1),
            likedBy: isLiked 
              ? (m.likedBy || []).filter(id => id !== myUid)
              : [...(m.likedBy || []), myUid]
          }
        : m
    ));

    try {
      const response = await fetch(`${BACKEND_URL}/api/materials/${material.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: myUid, 
          like: !isLiked 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update like');
      }
    } catch (err) {
      // Revert on error
      setMaterials(originalMaterials);
      setError('Failed to update like. Please try again.');
    }
  };

  // Toggle bookmark with optimistic updates
  const toggleBookmark = async (material) => {
    if (!myUid) {
      setMessage('Please sign in to bookmark materials.');
      return;
    }

    const isBookmarked = (material.bookmarkedBy || []).includes(myUid);
    const originalMaterials = [...materials];

    // Optimistic update
    setMaterials(prev => prev.map(m => 
      m.id === material.id 
        ? {
            ...m,
            bookmarkedBy: isBookmarked 
              ? (m.bookmarkedBy || []).filter(id => id !== myUid)
              : [...(m.bookmarkedBy || []), myUid]
          }
        : m
    ));

    try {
      const response = await fetch(`${BACKEND_URL}/api/materials/${material.id}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: myUid, 
          bookmark: !isBookmarked 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bookmark');
      }
    } catch (err) {
      // Revert on error
      setMaterials(originalMaterials);
      setError('Failed to update bookmark. Please try again.');
    }
  };

  // Open material and track click
  const openMaterial = async (material) => {
    try {
      // Track click (fire and forget)
      fetch(`${BACKEND_URL}/api/materials/${material.id}/click`, {
        method: 'POST',
      }).catch(() => {}); // Silently fail if tracking doesn't work
    } finally {
      window.open(material.link, '_blank', 'noopener,noreferrer');
    }
  };

  // Report material
  const reportMaterial = async (material) => {
    const reason = window.prompt(
      'Please provide a reason for reporting this material:\n(e.g., broken link, inappropriate content, wrong course)',
      'Broken link'
    );

    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/materials/${material.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      setMessage('Thank you for your report. We will review this material.');
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    }
  };

  // Get unique courses for filter dropdown
  const availableCourses = useMemo(() => {
    const courses = materials
      .map(m => m.course)
      .filter(Boolean)
      .filter((course, index, self) => self.indexOf(course) === index)
      .sort();
    
    return courses;
  }, [materials]);

  // Clear messages after delay
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message, error]);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>📚 Material Repository</h1>
        <p className="subtitle">
          Share and discover study materials, notes, slides, and past papers with your peers.
        </p>
      </header>

      {/* Share Material Form */}
      <section className="form-section">
        <div className="card">
          <h3>Share New Material</h3>
          <form onSubmit={handleSubmit} className="material-form">
            {(error || message) && (
              <div className={`message ${error ? 'error' : 'success'}`}>
                {error || message}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="course">Course Code *</label>
                <input
                  id="course"
                  type="text"
                  placeholder="e.g., CSE321, MATH101"
                  value={formData.course}
                  onChange={(e) => handleFormChange('course', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Material Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., Midterm 2023 Solutions, Lecture Slides Week 5"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="link">Material Link *</label>
                <input
                  id="link"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.link}
                  onChange={(e) => handleFormChange('link', e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sharing...' : 'Share Material'}
            </button>
          </form>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="card">
          <div className="filters-grid">
            <div className="form-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search by title or course..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Course</label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
              >
                <option value="">All Courses</option>
                {availableCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.onlyMine}
                onChange={(e) => handleFilterChange('onlyMine', e.target.checked)}
              />
              Show only my uploads
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.onlyBookmarked}
                onChange={(e) => handleFilterChange('onlyBookmarked', e.target.checked)}
              />
              Show bookmarked only
            </label>

            <button 
              type="button" 
              className="btn-secondary"
              onClick={fetchMaterials}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* Materials List */}
      <section className="materials-section">
        <div className="section-header">
          <h3>Shared Materials ({materials.length})</h3>
          {isLoading && <div className="loading-spinner">Loading...</div>}
        </div>

        {!isLoading && materials.length === 0 && (
          <div className="empty-state">
            <p>No materials found matching your criteria.</p>
            {filters.search || filters.course || filters.category || filters.onlyMine || filters.onlyBookmarked ? (
              <button 
                className="btn-secondary"
                onClick={() => setFilters({
                  search: '',
                  course: '',
                  category: '',
                  sort: 'createdAt_desc',
                  onlyMine: false,
                  onlyBookmarked: false
                })}
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        )}

        <div className="materials-grid">
          {materials.map(material => {
            const isLiked = (material.likedBy || []).includes(myUid);
            const isBookmarked = (material.bookmarkedBy || []).includes(myUid);
            const canDelete = currentUser && 
              (material.authorId === myUid || currentUser.role === 'admin');

            return (
              <div key={material.id} className="material-card">
                <div className="card-header">
                  <span className={`category-badge ${material.category.toLowerCase()}`}>
                    {material.category}
                  </span>
                  
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(material.id)}
                      className="btn-danger btn-sm"
                      title="Delete material"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="card-content">
                  <h4 className="material-title">{material.title}</h4>
                  <p className="material-course">Course: {material.course}</p>
                  <p className="material-author">
                    Shared by: {material.authorName || 'Anonymous'}
                  </p>
                </div>

                <div className="card-stats">
                  <div className="stat">
                    <span>❤️ {material.likes || 0}</span>
                  </div>
                  <div className="stat">
                    <span>👁️ {material.clicks || 0}</span>
                  </div>
                  <div className="stat">
                    <span>📅 {new Date(material.createdAt?.seconds * 1000 || material.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    onClick={() => toggleLike(material)}
                    className={`btn-icon ${isLiked ? 'liked' : ''}`}
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    {isLiked ? '❤️' : '🤍'} Like
                  </button>

                  <button
                    onClick={() => toggleBookmark(material)}
                    className={`btn-icon ${isBookmarked ? 'bookmarked' : ''}`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    {isBookmarked ? '🔖' : '📑'} Save
                  </button>

                  <button
                    onClick={() => reportMaterial(material)}
                    className="btn-report"
                    title="Report material"
                  >
                    ⚠️ Report
                  </button>
                </div>

                <button
                  onClick={() => openMaterial(material)}
                  className="btn-open-material"
                >
                  Open Material
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .page-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .page-header h1 {
          color: #1a202c;
          margin-bottom: 0.5rem;
          font-size: 2.5rem;
        }

        .subtitle {
          color: #718096;
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .material-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        .btn-primary {
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3182ce;
        }

        .btn-primary:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        .filters-section {
          margin-bottom: 2rem;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 1024px) {
          .filters-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }

        .filter-options {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-left: auto;
        }

        .btn-secondary:hover {
          background: #cbd5e0;
        }

        .materials-section {
          margin-top: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .loading-spinner {
          color: #718096;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #718096;
        }

        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .materials-grid {
            grid-template-columns: 1fr;
          }
        }

        .material-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .category-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .category-badge.notes { background: #e6fffa; color: #234e52; }
        .category-badge.slides { background: #faf5ff; color: #553c9a; }
        .category-badge.past paper { background: #fff5f5; color: #c53030; }
        .category-badge.book { background: #fffaf0; color: #744210; }
        .category-badge.other { background: #f7fafc; color: #4a5568; }

        .btn-danger {
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background: #feb2b2;
        }

        .btn-sm {
          padding: 0.2rem 0.6rem;
          font-size: 0.75rem;
        }

        .card-content {
          flex: 1;
        }

        .material-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }

        .material-course {
          color: #4a5568;
          margin: 0 0 0.25rem 0;
          font-weight: 500;
        }

        .material-author {
          color: #718096;
          margin: 0;
          font-size: 0.9rem;
        }

        .card-stats {
          display: flex;
          gap: 1rem;
          padding: 0.75rem 0;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.85rem;
          color: #718096;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-icon {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .btn-icon:hover {
          background: #edf2f7;
        }

        .btn-icon.liked {
          background: #fed7d7;
          border-color: #feb2b2;
        }

        .btn-icon.bookmarked {
          background: #faf5ff;
          border-color: #e9d8fd;
        }

        .btn-report {
          background: transparent;
          border: 1px solid #fed7d7;
          color: #c53030;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          margin-left: auto;
        }

        .btn-report:hover {
          background: #fed7d7;
        }

        .btn-open-material {
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          text-align: center;
        }

        .btn-open-material:hover {
          background: #3182ce;
        }

        .message {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-weight: 500;
        }

        .message.error {
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
        }

        .message.success {
          background: #c6f6d5;
          color: #276749;
          border: 1px solid #9ae6b4;
        }
      `}</style>
    </div>
  );
}

export default MaterialRepository;