// routes/reviews.js - Course reviews endpoints
const express = require('express');
const router = express.Router();

// Ensure database is available middleware
const ensureDb = (req, res, next) => {
    if (!req.app.locals.db) {
        return res.status(503).json({
            error: 'Database unavailable. Put FIREBASE_SERVICE_ACCOUNT JSON in .env and restart the server.',
        });
    }
    next();
};

// Get all reviews
router.get('/reviews', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
    try {
        const snap = await db.collection('reviews').orderBy('createdAt', 'desc').get();
        res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// Create a new review
router.post('/reviews', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    try {
        const review = { ...req.body, createdAt: FieldValue.serverTimestamp() };
        const ref = await db.collection('reviews').add(review);
        res.status(201).json({ id: ref.id, ...review });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to add review.' });
    }
});

module.exports = router;