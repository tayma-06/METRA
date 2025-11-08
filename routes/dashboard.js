// routes/dashboard.js - Dashboard summary endpoints
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

// Dashboard summary
router.get('/dashboard-summary', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
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

module.exports = router;