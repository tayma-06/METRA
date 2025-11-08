// routes/materials.js - Material repository endpoints
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

// Get materials with filtering
router.get('/materials', ensureDb, async (req, res) => {
    const { db, admin } = req.app.locals;
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

// Upload material
router.post('/materials/upload', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Delete material
router.delete('/materials/:id', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
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

// Like/unlike material
router.post('/materials/:id/like', ensureDb, async (req, res) => {
    const { db, admin, FieldValue } = req.app.locals;
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

// Bookmark/unbookmark material
router.post('/materials/:id/bookmark', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Track material click
router.post('/materials/:id/click', ensureDb, async (req, res) => {
    const { db, admin } = req.app.locals;
    try {
        const ref = db.collection('materials').doc(req.params.id);
        await ref.update({ clicks: admin.firestore.FieldValue.increment(1) });
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to track click.' });
    }
});

// Report material
router.post('/materials/:id/report', ensureDb, async (req, res) => {
    const { db, admin } = req.app.locals;
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

module.exports = router;