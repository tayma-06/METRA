// routes/study-groups.js - Study groups endpoints
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

// Create study group
router.post('/study-groups', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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
            activeCallId: null,
        };
        const ref = await db.collection('study_groups').add(group);
        res.status(201).json({ id: ref.id, ...group });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to create group.' });
    }
});

// Get all study groups
router.get('/study-groups', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
    try {
        const snap = await db.collection('study_groups').orderBy('createdAt', 'desc').get();
        res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch study groups.' });
    }
});

// Get specific study group
router.get('/study-groups/:groupId', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
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

// Join study group
router.post('/study-groups/join', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Call management
router.post('/study-groups/:groupId/call', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

router.post('/study-groups/:groupId/call/end', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Chat messages
router.post('/study-groups/:groupId/messages', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    try {
        const { groupId } = req.params;
        const {
            text,
            authorId,
            authorName,
            kind,
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

// Message delivery status
router.put('/study-groups/:groupId/messages/:messageId/delivered', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Message read status
router.put('/study-groups/:groupId/messages/:messageId/seen', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

// Typing indicator
router.post('/study-groups/:groupId/typing', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
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

module.exports = router;