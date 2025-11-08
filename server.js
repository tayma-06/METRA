// server.js
// METRA backend – Express + Firestore + optional Gemini
// -----------------------------------------------------

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
app.use(cors());
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

// ---------- Mock for progress ----------
const mockAnalysis = {
  title: 'Personalized Plan for Quiz 3',
  summary:
    'Your score was 72%, a bit below the class average (78%). Strong basics—focus next on Dynamic Programming.',
  plan: [
    'Deepen DP: Knapsack & LCS patterns.',
    'Solve 3 medium DP problems on LeetCode.',
    'Revise Big-O for recursive relations.',
  ],
};

// =====================================================
// AI Solver (Gemini)
// =====================================================
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

// =====================================================
// Course Reviews
// =====================================================
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
// Senior Hub (posts & replies)
// =====================================================
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
// Materials (filters + social actions)
// =====================================================
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

app.post('/api/materials/:id/click', async (_req, res) => {
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
// Study Groups
// =====================================================
app.post('/api/study-groups', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { name, description, capacity, creatorId } = req.body || {};
    if (!name || !description || !capacity || !creatorId) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const group = {
      name,
      description,
      capacity: parseInt(capacity, 10),
      createdAt: FieldValue.serverTimestamp(),
      memberIds: [creatorId],
      // Optional helper to show an active call room id
      activeCallId: null,
    };
    const ref = await db.collection('study_groups').add(group);
    res.status(201).json({ id: ref.id, ...group });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create group.' });
  }
});

app.get('/api/study-groups', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const snap = await db.collection('study_groups').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch study groups.' });
  }
});

app.get('/api/study-groups/:groupId', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId } = req.params;
    const ref = db.collection('study_groups').doc(groupId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Group not found.' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get group details.' });
  }
});

app.post('/api/study-groups/join', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId, userId } = req.body || {};
    if (!groupId || !userId) return res.status(400).json({ message: 'Group ID and User ID are required.' });

    const groupRef = db.collection('study_groups').doc(groupId);
    const updated = await db.runTransaction(async (tx) => {
      const doc = await tx.get(groupRef);
      if (!doc.exists) throw new Error('Group not found.');
      const data = doc.data();
      const members = data.memberIds || [];
      if (members.includes(userId)) throw new Error('You are already in this group.');
      if (members.length >= data.capacity) throw new Error('This group is already full.');
      tx.update(groupRef, { memberIds: FieldValue.arrayUnion(userId) });
      return { ...data, memberIds: [...members, userId] };
    });

    res.json({ message: 'Successfully joined the group!', group: { id: groupRef.id, ...updated } });
  } catch (e) {
    console.error(e.message);
    res.status(400).json({ message: e.message || 'Failed to join group.' });
  }
});

// ---------- Optional: Call logging / active room id ----------
app.post('/api/study-groups/:groupId/call', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId } = req.params;
    const { ephemeral = false, startedBy } = req.body || {};
    const callId = ephemeral ? `${groupId}-${Date.now()}` : groupId;

    const groupRef = db.collection('study_groups').doc(groupId);
    const callRef = groupRef.collection('calls').doc(callId);

    await callRef.set(
      {
        callId,
        startedAt: FieldValue.serverTimestamp(),
        startedBy: startedBy || null,
        ephemeral: !!ephemeral,
      },
      { merge: true }
    );
    await groupRef.update({ activeCallId: callId });

    res.json({ callId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to init call.' });
  }
});

app.post('/api/study-groups/:groupId/call/end', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId } = req.params;
    const { callId } = req.body || {};
    const id = callId || groupId;

    const groupRef = db.collection('study_groups').doc(groupId);
    const callRef = groupRef.collection('calls').doc(id);

    await callRef.set({ endedAt: FieldValue.serverTimestamp() }, { merge: true });
    await groupRef.update({ activeCallId: null });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to end call.' });
  }
});

// =====================================================
// Chat messages (text / file / audio) + delivery/read/typing
// =====================================================
app.post('/api/study-groups/:groupId/messages', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId } = req.params;
    const {
      text,
      authorId,
      authorName,
      kind, // 'text' | 'file' | 'audio'
      fileUrl,
      fileName,
      mimeType,
      sizeBytes,
      durationSec,
    } = req.body || {};

    if (!authorId) return res.status(400).json({ message: 'Missing authorId.' });
    if (!text && !fileUrl) return res.status(400).json({ message: 'Message must have text or fileUrl.' });

    const groupRef = db.collection('study_groups').doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) return res.status(404).json({ message: 'Group not found.' });
    const group = groupSnap.data();

    const base = {
      text: text ? String(text).slice(0, 4000) : '',
      authorId,
      authorName: authorName || 'Anonymous',
      createdAt: FieldValue.serverTimestamp(),
      status: 'sent',
      deliveredTo: [],
      readBy: [],
    };

    const attachment = fileUrl
      ? {
          kind: kind || 'file',
          fileUrl,
          fileName: fileName || null,
          mimeType: mimeType || null,
          sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
          durationSec: typeof durationSec === 'number' ? durationSec : null,
        }
      : { kind: 'text' };

    const payload = { ...base, ...attachment };

    const msgRef = await groupRef.collection('messages').add(payload);

    const recipients = (group.memberIds || []).filter((id) => id !== authorId);
    if (recipients.length) {
      await msgRef.update({ status: 'delivered', deliveredTo: recipients });
    }

    res.status(201).json({
      id: msgRef.id,
      ...payload,
      status: recipients.length ? 'delivered' : 'sent',
      deliveredTo: recipients,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to post message.' });
  }
});

app.put('/api/study-groups/:groupId/messages/:messageId/delivered', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId, messageId } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const ref = db.collection('study_groups').doc(groupId).collection('messages').doc(messageId);
    await ref.update({ status: 'delivered', deliveredTo: FieldValue.arrayUnion(userId) });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update delivery.' });
  }
});

app.put('/api/study-groups/:groupId/messages/:messageId/seen', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId, messageId } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const ref = db.collection('study_groups').doc(groupId).collection('messages').doc(messageId);
    await ref.update({ status: 'seen', readBy: FieldValue.arrayUnion(userId) });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update read.' });
  }
});

// Typing indicator (stored in /meta/typing)
app.post('/api/study-groups/:groupId/typing', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId } = req.params;
    const { userId, isTyping, userName } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const ref = db.collection('study_groups').doc(groupId).collection('meta').doc('typing');
    await ref.set(
      { [userId]: isTyping ? userName || 'Someone' : FieldValue.delete() },
      { merge: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to set typing.' });
  }
});

// =====================================================
// Dashboard summary (latest items)
// =====================================================
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

// =====================================================
// Progress (mock)
// =====================================================
app.post('/api/progress', (_req, res) => {
  res.json(mockAnalysis);
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 METRA backend listening at http://localhost:${PORT}`);
  console.log(`🗄️  Firestore: ${db ? 'READY ✅' : 'NOT CONFIGURED ❌'}`);
  console.log(`🤖 Gemini: ${GEMINI_API_KEY ? 'READY ✅' : 'MOCK MODE ❕'}`);
});
