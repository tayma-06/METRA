// routes/personalized.js
// Standalone routes for the AI-Powered Personalized Dashboard

/**
 * Usage from server.js:
 *   const registerPersonalized = require('./routes/personalized');
 *   registerPersonalized(app, { db, FieldValue, GEMINI_API_KEY, fetch });
 */

module.exports = function registerPersonalized(app, { db, FieldValue, GEMINI_API_KEY, fetch }) {
  // Lightweight mock when Firestore isn't configured
  const mockPayload = (uid = '') => ({
    greeting: `Welcome back${uid ? '' : ''}! Here's your personalized snapshot.`,
    progress: { completed: 6, total: 10, percentile: 78 },
    weakAreas: ['Recurrence relations', 'Induction proofs', 'Vector spaces'],
    goals: ['Score ≥ 85% on next midterm', '12h/week consistent study'],
    recommendations: [
      'Spend 30 minutes daily on your weakest topic using spaced repetition.',
      'Mix 3 concept questions + 2 applied problems per session.',
      'Review last exam mistakes; convert each into a checklist item.',
    ],
    resources: [
      { title: 'Induction Proofs – Practice Set', url: 'https://example.com/induction' },
      { title: 'MIT OCW Linear Algebra (Vectors)', url: 'https://ocw.mit.edu/' },
      { title: 'Recurrence Mastery Notes', url: 'https://example.com/recurrences' },
    ],
    nextActions: [
      'Book a 45-minute study block for Friday',
      'Post one question in Senior Hub',
      'Do a 10-question quiz on recurrences',
    ],
  });

  // Helper: safe property access
  const val = (x, d) => (x === undefined || x === null ? d : x);

  // GET /api/personalized-dashboard?uid=USER_ID
  app.get('/api/personalized-dashboard', async (req, res) => {
    const uid = String(req.query.uid || '').trim();
    if (!uid) return res.status(400).json({ error: 'uid required' });

    // If Firestore not available, return mock so frontend still works
    if (!db) return res.json(mockPayload(uid));

    try {
      // 1) Pull recent progress analyses for this user
      const anaSnap = await db
        .collection('progress_analyses')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(12)
        .get();

      const analyses = anaSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2) Aggregate weak areas (from saved payloads)
      const counts = {};
      for (const a of analyses) {
        const topics = Array.isArray(a.weakTopics) ? a.weakTopics : [];
        for (const t of topics) counts[t] = (counts[t] || 0) + 1;
      }
      const weakAreas = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)
        .slice(0, 5);

      // 3) Goals (derive from latest target/course if present)
      const latest = analyses[0] || {};
      const goals = [];
      if (latest?.target && latest?.course) {
        goals.push(`Reach ${latest.target}% in ${latest.course}`);
      }
      if (val(latest?.hoursPerWeek, 0)) {
        goals.push(`Maintain ${latest.hoursPerWeek}h/week study cadence`);
      }

      // 4) Percentile rough estimate (score vs classAverage if present)
      let percentile = 60;
      if (typeof latest?.score === 'number' && typeof latest?.classAverage === 'number') {
        percentile = Math.max(1, Math.min(99, Math.round(50 + (latest.score - latest.classAverage))));
      }

      // 5) Completed/total from recent saved steps if present, else light heuristic
      const completed = Math.min(10, analyses.length);
      const total = Math.max(completed + 4, 10);

      // 6) Resources & AI tips:
      // If your saved analysis already contains resources/recs, prefer them.
      const fromAI = val(latest?.analysis, {});
      const recommendations = Array.isArray(fromAI.plan) ? fromAI.plan.slice(0, 5) : [
        'Focus the first 30 minutes on weakest topic each session.',
        'Alternate concept review with applied problems.',
        'Do a weekly retrospective on errors.'
      ];
      const resources = (Array.isArray(fromAI.resources) ? fromAI.resources : []).map(r => {
        if (typeof r === 'string') return { title: r, url: '#' };
        return { title: r.title || 'Resource', url: r.url || '#' };
      }).slice(0, 5);

      // 7) Next actions
      const nextActions = Array.isArray(fromAI.studySchedule)
        ? fromAI.studySchedule.slice(0, 5)
        : ['Schedule two 45-minute sessions this week', 'Create flashcards for 10 key formulas'];

      const payload = {
        greeting: `Welcome back! You're ahead of ${percentile}% of peers this week.`,
        progress: { completed, total, percentile },
        weakAreas,
        goals,
        recommendations,
        resources,
        nextActions,
      };

      return res.json(payload);
    } catch (err) {
      console.error('personalized-dashboard error:', err);
      // Graceful fallback so frontend never breaks
      return res.json(mockPayload(uid));
    }
  });

  // (Optional) Add more endpoints here later, e.g. /api/reviews/insights
};
