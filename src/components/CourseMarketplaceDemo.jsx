import React, { useEffect, useMemo, useState } from "react";
import { Link, Routes, Route, useNavigate, useParams } from "react-router-dom";

/******************************
 * FRONTEND-ONLY COURSE MARKETPLACE DEMO
 * - No backend required
 * - Uses localStorage to persist demo data
 * - Mimics Udemy-like browsing, buy, enroll, lessons, and reviews
 *
 * How to use:
 * 1) Drop this file anywhere in your src/ (e.g., src/CourseMarketplaceDemo.jsx)
 * 2) Add routes in your App.js:
 *    <Route path="/courses" element={<CourseCatalogPage/>} />
 *    <Route path="/courses/:courseId" element={<CourseDetailPage/>} />
 * 3) (Optional) Link it from your navbar.
 ******************************/

// ---------- Mock Seed Data ----------
const SEED_COURSES = [
  {
    id: "dsa-pro",
    title: "Mastering DSA: From Basics to Advanced",
    subtitle: "Arrays, Trees, DP, Graphs with 100+ problems",
    thumbnailUrl: "https://images.unsplash.com/photo-1551069613-1904dbdcda11?q=80&w=1200&auto=format&fit=crop",
    category: "Computer Science",
    language: "English",
    price: { amount: 2499, currency: "USD" },
    ownerId: "mentor_1",
    level: "intermediate",
    tags: ["DSA", "Algorithms", "Interview"],
    requirements: ["Basic JS/Python", "Loops & Functions"],
    objectives: ["Master DP", "Solve Graph problems", "Crack interviews"],
    rating: { avg: 4.6, count: 178, breakdown: { 1: 2, 2: 6, 3: 18, 4: 52, 5: 100 } },
    learners: 1500,
    isPublished: true,
    lessons: [
      { id: "l1", title: "Intro & Setup", durationSec: 420, isPreview: true },
      { id: "l2", title: "Arrays: Patterns", durationSec: 900, isPreview: true },
      { id: "l3", title: "Binary Search Deep Dive", durationSec: 840, isPreview: false },
      { id: "l4", title: "DP on Sequences", durationSec: 1200, isPreview: false },
      { id: "l5", title: "Graphs: BFS/DFS Patterns", durationSec: 1080, isPreview: false },
    ],
  },
  {
    id: "ml-101",
    title: "Machine Learning 101",
    subtitle: "A gentle intro: linear models to tree ensembles",
    thumbnailUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop",
    category: "Data Science",
    language: "English",
    price: { amount: 0, currency: "USD" },
    ownerId: "mentor_2",
    level: "beginner",
    tags: ["ML", "Beginner"],
    requirements: ["High-school math"],
    objectives: ["Understand train/test", "Build a baseline model"],
    rating: { avg: 4.3, count: 92, breakdown: { 1: 1, 2: 5, 3: 20, 4: 40, 5: 26 } },
    learners: 900,
    isPublished: true,
    lessons: [
      { id: "l1", title: "What is ML?", durationSec: 300, isPreview: true },
      { id: "l2", title: "Data Splits & Leakage", durationSec: 600, isPreview: true },
      { id: "l3", title: "Linear Regression", durationSec: 900, isPreview: false },
    ],
  },
];

const SEED_REVIEWS = {
  "dsa-pro": [
    { id: "r1", userName: "Aisha", rating: 5, comment: "Crystal clear DP explanations!", createdAt: Date.now() - 86400000, helpful: 4 },
    { id: "r2", userName: "Rafi", rating: 4, comment: "Great problems, could add more graphs.", createdAt: Date.now() - 3600_000, helpful: 2 },
  ],
  "ml-101": [
    { id: "r1", userName: "Tanvir", rating: 4, comment: "Solid intro, loved the visuals.", createdAt: Date.now() - 7200_000, helpful: 1 },
  ],
};

// ---------- Storage Helpers (localStorage) ----------
const LS_KEYS = {
  COURSES: "demo.courses",
  PURCHASES: "demo.purchases", // array of {courseId, userId, createdAt}
  REVIEWS: "demo.reviews",     // map courseId -> array
};

function loadCourses() {
  const raw = localStorage.getItem(LS_KEYS.COURSES);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(LS_KEYS.COURSES, JSON.stringify(SEED_COURSES));
  return SEED_COURSES;
}

function loadPurchases() {
  return JSON.parse(localStorage.getItem(LS_KEYS.PURCHASES) || "[]");
}

function savePurchase(p) {
  const current = loadPurchases();
  current.push(p);
  localStorage.setItem(LS_KEYS.PURCHASES, JSON.stringify(current));
}

function hasPurchased(courseId, userId) {
  return loadPurchases().some((p) => p.courseId === courseId && p.userId === userId);
}

function loadReviews() {
  const raw = localStorage.getItem(LS_KEYS.REVIEWS);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(LS_KEYS.REVIEWS, JSON.stringify(SEED_REVIEWS));
  return SEED_REVIEWS;
}

function saveReview(courseId, review) {
  const all = loadReviews();
  const list = all[courseId] || [];
  all[courseId] = [{ ...review, id: crypto.randomUUID() }, ...list];
  localStorage.setItem(LS_KEYS.REVIEWS, JSON.stringify(all));
}

function markHelpful(courseId, reviewId) {
  const all = loadReviews();
  const list = all[courseId] || [];
  const idx = list.findIndex((r) => r.id === reviewId);
  if (idx >= 0) list[idx].helpful = (list[idx].helpful || 0) + 1;
  all[courseId] = list;
  localStorage.setItem(LS_KEYS.REVIEWS, JSON.stringify(all));
}

// ---------- Tiny UI Utils ----------
const money = (p) => (p.amount === 0 ? "Free" : new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency || "USD" }).format(p.amount / 100));
const secs = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

function Stars({ value, size = 16 }) {
  const full = Math.round(value);
  return (
    <span title={`${value.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < full ? "#fbbf24" : "#d1d5db", fontSize: size }}>
          ★
        </span>
      ))}
    </span>
  );
}

function Chip({ children }) {
  return <span style={{ padding: "2px 8px", border: "1px solid #e5e7eb", borderRadius: 999, fontSize: 12, marginRight: 6 }}>{children}</span>;
}

// ---------- Catalog Page ----------
export function CourseCatalogPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("popular");
  const [courses, setCourses] = useState([]);

  useEffect(() => setCourses(loadCourses()), []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = [...courses].filter((c) => c.isPublished);
    if (ql) list = list.filter((c) => (c.title + " " + (c.subtitle || "")).toLowerCase().includes(ql));
    if (sort === "newest") list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    else if (sort === "rating") list.sort((a, b) => (b.rating?.avg || 0) - (a.rating?.avg || 0));
    else list.sort((a, b) => (b.learners || 0) - (a.learners || 0));
    return list;
  }, [courses, q, sort]);

  return (
    <div className="container" style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Courses</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses..." style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <option value="popular">Most Popular</option>
          <option value="rating">Top Rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {filtered.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <Link to={`/courses/${course.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "16/9", background: `center/cover no-repeat url(${course.thumbnailUrl})` }} />
        <div style={{ padding: 12 }}>
          <div style={{ fontWeight: 700 }}>{course.title}</div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>{course.subtitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Stars value={course.rating?.avg || 0} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>({course.rating?.count || 0})</span>
          </div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{money(course.price)}</div>
        </div>
      </Link>
    </div>
  );
}

// ---------- Course Detail Page ----------
export function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);

  const currentUser = useDemoUser(); // demo identity only

  useEffect(() => {
    setCourses(loadCourses());
    const all = loadReviews();
    setReviews(all[courseId] || []);
  }, [courseId]);

  const course = courses.find((c) => c.id === courseId);
  const enrolled = course ? (course.price.amount === 0 || hasPurchased(course.id, currentUser.uid)) : false;

  if (!course) return <div style={{ padding: 16 }}>Course not found.</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 8, border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8 }}>← Back</button>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{course.title}</h1>
          <div style={{ color: "#6b7280", marginBottom: 8 }}>{course.subtitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Stars value={course.rating?.avg || 0} />
            <span style={{ color: "#6b7280" }}>({course.rating?.count || 0} ratings) • {course.learners} learners</span>
          </div>

          <div style={{ marginTop: 16 }}>
            {course.tags?.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>

          <section style={{ marginTop: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Course content</h3>
            <LessonList course={course} enrolled={enrolled} />
          </section>

          <section style={{ marginTop: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Requirements</h3>
            <ul>
              {course.requirements?.map((r, i) => (
                <li key={i} style={{ color: "#374151" }}>• {r}</li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>What you'll learn</h3>
            <ul>
              {course.objectives?.map((o, i) => (
                <li key={i} style={{ color: "#374151" }}>• {o}</li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: 24 }}>
            <ReviewsSection
              courseId={course.id}
              reviews={reviews}
              canReview={enrolled}
              onAdd={(r) => {
                saveReview(course.id, r);
                const all = loadReviews();
                setReviews(all[course.id] || []);
              }}
              onHelpful={(reviewId) => {
                markHelpful(course.id, reviewId);
                const all = loadReviews();
                setReviews(all[course.id] || []);
              }}
            />
          </section>
        </div>

        {/* Right column: Purchase card */}
        <aside style={{ position: "sticky", top: 16, alignSelf: "start" }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ aspectRatio: "16/9", background: `center/cover no-repeat url(${course.thumbnailUrl})` }} />
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{money(course.price)}</div>
              <div style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 12px" }}>{course.level} • {course.language}</div>

              {enrolled ? (
                <button disabled style={{ width: "100%", padding: 12, borderRadius: 8, background: "#10b981", color: "#fff", border: 0, fontWeight: 700 }}>Enrolled</button>
              ) : (
                <button onClick={() => setShowCheckout(true)} style={{ width: "100%", padding: 12, borderRadius: 8, background: "#111827", color: "#fff", border: 0, fontWeight: 700 }}>Buy now</button>
              )}

              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>30-day refund • Lifetime access</div>

              <hr style={{ margin: "16px 0" }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>This course includes:</div>
                <ul style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
                  <li>• On-demand video</li>
                  <li>• Downloadable resources</li>
                  <li>• Certificate of completion (demo)</li>
                </ul>
              </div>
            </div>
          </div>

          {showCheckout && (
            <CheckoutModal
              price={course.price}
              onClose={() => setShowCheckout(false)}
              onSuccess={() => {
                savePurchase({ courseId: course.id, userId: currentUser.uid, createdAt: Date.now() });
                setShowCheckout(false);
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function LessonList({ course, enrolled }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12 }}>
      {course.lessons.map((l, idx) => (
        <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: 12, borderTop: idx ? "1px solid #f3f4f6" : "none" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{l.title}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{secs(l.durationSec)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {l.isPreview ? (
              <PreviewButton label="Preview" />
            ) : enrolled ? (
              <PreviewButton label="Play" />
            ) : (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Locked</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewButton({ label }) {
  return (
    <button style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>{label}</button>
  );
}

// ---------- Reviews ----------
function ReviewsSection({ courseId, reviews, canReview, onAdd, onHelpful }) {
  const [sort, setSort] = useState("newest");
  const sorted = useMemo(() => {
    const list = [...reviews];
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "helpful") list.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
    else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [reviews, sort]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontWeight: 700 }}>Student reviews</h3>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <option value="newest">Newest</option>
          <option value="rating">Highest rated</option>
          <option value="helpful">Most helpful</option>
        </select>
      </div>

      {canReview ? <AddReviewForm onAdd={onAdd} /> : <div style={{ color: "#6b7280", fontSize: 14 }}>Enroll to leave a review.</div>}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {sorted.length === 0 && <div style={{ color: "#6b7280" }}>No reviews yet.</div>}
        {sorted.map((r) => (
          <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: "#f3f4f6", display: "grid", placeItems: "center", fontWeight: 700 }}>
                {(r.userName || "?").slice(0, 1)}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{r.userName || "Anonymous"}</div>
                <Stars value={r.rating} />
              </div>
            </div>
            <p style={{ marginTop: 8 }}>{r.comment}</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#6b7280", fontSize: 13 }}>
              <span>{new Date(r.createdAt).toLocaleString()}</span>
              <button onClick={() => onHelpful(r.id)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>Helpful ({r.helpful || 0})</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddReviewForm({ onAdd }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const user = useDemoUser();

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, margin: "8px 0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 700 }}>Leave a review</span>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ padding: 6, borderRadius: 8, border: "1px solid #e5e7eb" }}>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{r} stars</option>
          ))}
        </select>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="What did you like? What could be improved?"
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={() => {
            if (!comment.trim()) return;
            onAdd({ userName: user.name, rating, comment: comment.trim(), createdAt: Date.now(), helpful: 0 });
            setComment("");
            setRating(5);
          }}
          style={{ padding: "8px 12px", borderRadius: 8, background: "#111827", color: "#fff", border: 0 }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

// ---------- Checkout Modal (frontend-only simulation) ----------
function CheckoutModal({ price, onClose, onSuccess }) {
  const [agree, setAgree] = useState(true);
  const isFree = price.amount === 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
      <div style={{ width: 420, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #f3f4f6", fontWeight: 800 }}>Checkout</div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Course</span>
            <span>{isFree ? "Free" : money(price)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <label htmlFor="agree" style={{ fontSize: 14 }}>I agree to the demo terms (no real payment).</label>
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", gap: 8, justifyContent: "flex-end", background: "#fafafa", borderTop: "1px solid #f3f4f6" }}>
          <button onClick={onClose} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}>Cancel</button>
          <button
            disabled={!agree}
            onClick={onSuccess}
            style={{ padding: "8px 12px", borderRadius: 8, background: "#10b981", color: "#fff", border: 0, fontWeight: 700 }}
          >
            {isFree ? "Enroll for free" : "Pay & enroll (demo)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Demo Identity ----------
function useDemoUser() {
  // In your app, replace with useAuth(). For demo we keep a stable local user
  const [user] = useState(() => {
    const existed = localStorage.getItem("demo.user");
    if (existed) return JSON.parse(existed);
    const u = { uid: "demo-user-001", name: "Guest" };
    localStorage.setItem("demo.user", JSON.stringify(u));
    return u;
  });
  return user;
}

// ---------- Optional isolated demo router (if you want to mount alone) ----------
export default function CourseDemoRouter() {
  return (
    <Routes>
      <Route path="/courses" element={<CourseCatalogPage />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
    </Routes>
  );
}
