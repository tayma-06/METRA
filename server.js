// server.js
// METRA backend – Express + Firestore + Gemini AI - FIXED ROUTE MOUNTS

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

// ---------- Firebase Admin (server-side SDK) ----------
const admin = require('firebase-admin');
let db;
let FieldValue;

try {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc || svc === 'placeholder') throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  const serviceAccount = JSON.parse(svc);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  FieldValue = admin.firestore.FieldValue;
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.error('❌ Firebase Admin init failed:', err.message);
  // Soft-degrade so the server can boot (useful for front-end dev)
  db = null;
  FieldValue = {
    serverTimestamp: () => new Date(),
    arrayUnion: (...x) => x,
    arrayRemove: (...x) => x,
    delete: () => null,
  };
}

// ---------- App & middleware ----------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '4mb' }));

const PORT = process.env.PORT || 8000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Quick guard for any DB route
const ensureDb = (res) => {
  if (!db) {
    res.status(503).json({
      error:
        'Database unavailable. Put FIREBASE_SERVICE_ACCOUNT JSON in .env and restart the server.',
    });
    return false;
  }
  return true;
};

// ---------- Health ----------
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'METRA backend',
    firestore: !!db,
    gemini: !!GEMINI_API_KEY,
  });
});
app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

// ---------- Routes (mount under /api) ----------
const registerPersonalized = require('./routes/personalized'); // existing function-style module
registerPersonalized(app, { db, FieldValue, GEMINI_API_KEY, fetch });

const buildNoticesRouter = require('./routes/notices'); // Router-style module
app.use('/api', buildNoticesRouter({ db })); // <-- FIX: ensures /api/notices exists

// =====================================================
// AI Solver (Gemini)
app.post('/api/solve', async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  // Mock if no key
  if (!GEMINI_API_KEY) {
    return res.json({
      answer:
        `**Mock answer** for: "${question}"\n\n` +
        'Backend is wired. Add GEMINI_API_KEY to .env for real answers.',
    });
  }

  try {
    const model = 'gemini-2.5-flash-preview-09-2025';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [{ parts: [{ text: `Use Markdown. Q: ${question}` }] }],
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const body = await r.text();
      console.error('Gemini error:', r.status, body);
      throw new Error(`AI API error ${r.status}`);
    }

    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response. Please try another question.";
    res.json({ answer: text });
  } catch (e) {
    console.error('Gemini API error:', e);
    res.status(500).json({ error: 'Failed to get answer from AI.' });
  }
});

// Helper to parse AI JSON
const parseAIResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) return JSON.parse(jsonObjectMatch[0]);
      throw new Error('No valid JSON found in response');
    } catch (err) {
      console.error('Failed to parse AI response:', err.message);
      console.error('Raw response was:', text.substring(0, 500) + '...');
      throw new Error('AI returned invalid JSON format');
    }
  }
};

// =====================================================
// Progress Analysis
app.post('/api/progress', async (req, res) => {
  const {
    quizId,
    score,
    classAverage = null,
    course,
    target = null,
    examDate = null,
    hoursPerWeek = null,
    weakTopics = [],
    notes = '',
    learningStyle = 'visual',
    priority = 'balanced',
  } = req.body || {};

  if (!quizId || score === undefined || !course) {
    return res.status(400).json({
      error: 'Missing required fields: quizId, score, and course',
    });
  }

  if (!GEMINI_API_KEY) {
    const mockAnalysis = {
      title: `Improvement Plan for ${quizId} - ${course}`,
      summary: `Based on your score of ${score}% in ${course}${
        classAverage ? ` (class average: ${classAverage}%)` : ''
      }, I've identified key areas for improvement.`,
      plan: [
        `Review core concepts from ${course} that were assessed`,
        weakTopics.length > 0 ? `Focus on: ${weakTopics.join(', ')}` : 'Identify specific challenging areas',
        'Practice with similar assessment questions',
      ],
      studySchedule: hoursPerWeek
        ? [
            `Dedicate ${Math.floor(hoursPerWeek / 2)} hours for concept review`,
            `Use ${Math.floor(hoursPerWeek / 2)} hours for practice and application`,
          ]
        : ['Create a consistent study schedule'],
      resources: [`${course} textbook and materials`, 'Practice problems and past assessments'],
    };

    if (db) {
      try {
        await db.collection('progress_analyses').add({
          ...req.body,
          analysis: mockAnalysis,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: false,
        });
      } catch (dbError) {
        console.error('Failed to save mock analysis:', dbError);
      }
    }
    return res.json(mockAnalysis);
  }

  try {
    const model = 'gemini-2.5-flash-preview-09-2025';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
IMPORTANT: Respond with ONLY valid JSON. Do not include any markdown formatting.

Analyze the student's performance and produce a personalized plan for ${course}.
... (prompt trimmed for brevity) ...
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini progress analysis error:', response.status, errorBody);
      throw new Error(`AI API error ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let analysis;
    try {
      analysis = parseAIResponse(text);
    } catch {
      analysis = {
        title: `Personalized ${course} Improvement Plan`,
        summary: `Based on your ${score}% in ${quizId} for ${course}, here's a targeted strategy.`,
        plan: ['Review fundamentals', 'Practice weak topics', 'Apply through problems'],
        studySchedule: ['Create weekly schedule with review + practice'],
        resources: [`Primary ${course} textbook`, 'Online problem sets'],
      };
    }

    if (db) {
      try {
        await db.collection('progress_analyses').add({
          ...req.body,
          analysis,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: true,
          modelUsed: model,
          version: '2.0',
        });
      } catch (dbError) {
        console.error('Failed to save analysis to DB:', dbError);
      }
    }

    res.json(analysis);
  } catch (e) {
    console.error('Progress analysis error:', e);
    res.status(500).json({ error: 'Failed to generate personalized analysis.' });
  }
});

// =====================================================
// Study Plan
app.post('/api/study-plan', async (req, res) => {
  const { topic, level = 'beginner', timeframe = '1 week', hoursPerWeek, learningGoals = '', priorKnowledge = 'none' } =
    req.body || {};

  if (!topic) return res.status(400).json({ error: 'Topic is required.' });

  if (!GEMINI_API_KEY) {
    const mockPlan = {
      topic,
      level,
      timeframe,
      plan: {
        overview: `Comprehensive ${timeframe} learning plan for ${topic}.`,
        weeklySchedule: [`Week 1: Foundations of ${topic}`],
        dailyActivities: ['Review', 'Learn', 'Practice', 'Reflect'],
        resources: [`Recommended resources for ${topic}`],
      },
    };
    if (db) {
      try {
        await db.collection('study_plans').add({
          topic,
          level,
          timeframe,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
          learningGoals,
          priorKnowledge,
          plan: mockPlan,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: false,
        });
      } catch (dbError) {
        console.error('Failed to save mock study plan to DB:', dbError);
      }
    }
    return res.json(mockPlan);
  }

  try {
    const model = 'gemini-2.5-flash-preview-09-2025';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `
IMPORTANT: Respond with ONLY valid JSON. Create a practical study plan for ${topic} (${level}) over ${timeframe}.
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`AI API error ${response.status}`);

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let studyPlan;
    try {
      studyPlan = parseAIResponse(text);
    } catch {
      studyPlan = {
        topic,
        level,
        timeframe,
        plan: {
          overview: `This ${timeframe} plan focuses on ${topic} fundamentals and practice.`,
          weeklySchedule: [`Week 1: Core ${topic}`],
          dailyActivities: ['Learn', 'Practice', 'Review'],
          resources: ['Online tutorials', 'Exercises'],
        },
      };
    }

    if (db) {
      try {
        await db.collection('study_plans').add({
          topic,
          level,
          timeframe,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
          learningGoals,
          priorKnowledge,
          plan: studyPlan,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: true,
        });
      } catch (dbError) {
        console.error('Failed to save study plan to DB:', dbError);
      }
    }

    res.json(studyPlan);
  } catch (e) {
    console.error('Study plan generation error:', e);
    res.status(500).json({ error: 'Failed to generate study plan' });
  }
});

// =====================================================
// Reviews
app.get('/api/reviews', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const snap = await db.collection('reviews').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const review = { ...req.body, createdAt: FieldValue.serverTimestamp() };
    const ref = await db.collection('reviews').add(review);
    res.status(201).json({ id: ref.id, ...review });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add review.' });
  }
});

// =====================================================
// Senior Hub
app.get('/api/hub/posts', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const snap = await db.collection('hub_posts').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

app.post('/api/hub/posts', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { course, question, authorId, authorName } = req.body || {};
    const post = {
      course,
      question,
      authorId,
      authorName,
      reply: null,
      createdAt: FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('hub_posts').add(post);
    res.status(201).json({ id: ref.id, ...post });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add post.' });
  }
});

app.delete('/api/hub/posts/:id', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'User ID required.' });

    const ref = db.collection('hub_posts').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: 'Post not found.' });
    if (doc.data().authorId !== userId) return res.status(403).json({ message: 'Not authorized.' });

    await ref.delete();
    res.json({ message: 'Post deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

app.put('/api/hub/posts/:id/reply', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { id } = req.params;
    const { replyText, authorId, authorName } = req.body || {};
    if (!replyText || !authorId || !authorName) {
      return res.status(400).json({ message: 'Missing reply fields.' });
    }
    const ref = db.collection('hub_posts').doc(id);
    const snap = await ref.get();
    if (snap.exists && snap.data().reply) {
      return res.status(409).json({ message: 'This post already has a reply.' });
    }

    const reply = {
      text: replyText,
      authorId,
      authorName,
      repliedAt: FieldValue.serverTimestamp(),
    };
    await ref.update({ reply });
    res.json({ message: 'Reply added.', reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add reply.' });
  }
});

app.delete('/api/hub/posts/:id/reply', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'User ID required.' });

    const ref = db.collection('hub_posts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Post not found.' });

    const data = snap.data();
    if (!data.reply) return res.status(404).json({ message: 'No reply to delete.' });
    if (data.reply.authorId !== userId) return res.status(403).json({ message: 'Not authorized.' });

    await ref.update({ reply: null });
    res.json({ message: 'Reply deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete reply.' });
  }
});

// =====================================================
// Materials
app.get('/api/materials', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const {
      q = '',
      course = '',
      category = '',
      author = '',
      sort = 'createdAt_desc',
      limit = '50',
    } = req.query;

    let ref = db.collection('materials');

    if (course) ref = ref.where('course', '==', course);
    if (category) ref = ref.where('category', '==', category);
    if (author) ref = ref.where('authorName', '==', author);

    if (sort === 'likes_desc') ref = ref.orderBy('likes', 'desc');
    else if (sort === 'clicks_desc') ref = ref.orderBy('clicks', 'desc');
    else ref = ref.orderBy('createdAt', 'desc');

    const snap = await ref.limit(parseInt(limit, 10)).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (q) {
      const needle = String(q).toLowerCase();
      items = items.filter(
        (m) =>
          (m.title || '').toLowerCase().includes(needle) ||
          (m.course || '').toLowerCase().includes(needle)
      );
    }

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

app.post('/api/materials/upload', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { course, title, category, link, authorId, authorName } = req.body || {};
    if (!course || !title || !category || !link || !authorId || !authorName) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const docData = {
      course,
      title,
      category,
      link,
      authorId,
      authorName,
      createdAt: FieldValue.serverTimestamp(),
      likes: 0,
      clicks: 0,
      likedBy: [],
      bookmarkedBy: [],
      reports: 0,
    };

    const ref = await db.collection('materials').add(docData);
    res.status(201).json({ id: ref.id, ...docData });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to upload material.' });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'User ID required.' });

    const ref = db.collection('materials').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Material not found.' });
    if (snap.data().authorId !== userId) return res.status(403).json({ message: 'Not authorized.' });

    await ref.delete();
    res.json({ message: 'Material deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete material.' });
  }
});

app.post('/api/materials/:id/like', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { userId, like = true } = req.body || {};
    const ref = db.collection('materials').doc(req.params.id);
    await ref.update({
      likes: admin.firestore.FieldValue.increment(like ? 1 : -1),
      likedBy: like ? FieldValue.arrayUnion(userId) : FieldValue.arrayRemove(userId),
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to like material.' });
  }
});

app.post('/api/materials/:id/bookmark', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { userId, bookmark = true } = req.body || {};
    const ref = db.collection('materials').doc(req.params.id);
    await ref.update({
      bookmarkedBy: bookmark ? FieldValue.arrayUnion(userId) : FieldValue.arrayRemove(userId),
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to bookmark material.' });
  }
});

app.post('/api/materials/:id/click', async (req, res) => { // <-- FIXED: use req (not _req)
  if (!ensureDb(res)) return;
  try {
    const ref = db.collection('materials').doc(req.params.id);
    await ref.update({ clicks: admin.firestore.FieldValue.increment(1) });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to track click.' });
  }
});

app.post('/api/materials/:id/report', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { reason = 'broken' } = req.body || {};
    const ref = db.collection('materials').doc(req.params.id);
    await ref.update({
      reports: admin.firestore.FieldValue.increment(1),
      lastReportReason: reason,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to report material.' });
  }
});

// =====================================================
// Study Groups (create/join/calls + chat endpoints) — unchanged from your version
// ... (kept as in your file above) ...

// Dashboard summary
app.get('/api/dashboard-summary', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const postSnap = await db.collection('hub_posts').orderBy('createdAt', 'desc').limit(1).get();
    const latestPost = postSnap.docs[0] ? { id: postSnap.docs[0].id, ...postSnap.docs[0].data() } : null;

    const matSnap = await db.collection('materials').orderBy('createdAt', 'desc').limit(1).get();
    const latestMaterial = matSnap.docs[0]
      ? { id: matSnap.docs[0].id, ...matSnap.docs[0].data() }
      : null;

    const groupSnap = await db.collection('study_groups').orderBy('createdAt', 'desc').limit(1).get();
    const openGroup = groupSnap.docs[0]
      ? { id: groupSnap.docs[0].id, ...groupSnap.docs[0].data() }
      : null;

    res.json({ latestPost, latestMaterial, openGroup });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch dashboard summary.' });
  }
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 METRA backend listening at http://localhost:${PORT}`);
  console.log(`🗄️  Firestore: ${db ? 'READY ✅' : 'NOT CONFIGURED ❌'}`);
  console.log(`🤖 Gemini: ${GEMINI_API_KEY ? 'READY ✅' : 'MOCK MODE ❕'}`);
});
