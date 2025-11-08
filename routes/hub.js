// routes/hub.js - Senior hub endpoints
const express = require('express');
const router = express.Router();

const ensureDb = (req, res, next) => {
    if (!req.app.locals.db) {
        return res.status(503).json({
            error: 'Database unavailable. Put FIREBASE_SERVICE_ACCOUNT JSON in .env and restart the server.',
        });
    }
    next();
};

// Get all hub posts
router.get('/hub/posts', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
    try {
        const snap = await db.collection('hub_posts').orderBy('createdAt', 'desc').get();
        res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

// Create a new hub post
router.post('/hub/posts', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Delete a hub post
router.delete('/hub/posts/:id', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
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

// Add reply to a hub post
router.put('/hub/posts/:id/reply', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Delete reply from a hub post
router.delete('/hub/posts/:id/reply', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
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

module.exports = router;