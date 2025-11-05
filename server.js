const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// --- Firebase Admin Setup ---
const admin = require('firebase-admin');
// This assumes 'serviceAccountKey.json' is in the same directory
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
// --- End Firebase Admin Setup ---

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to allow cross-origin requests

const PORT = process.env.PORT || 8000;
// Make sure to paste your real API key here
const GEMINI_API_KEY = "AIzaSyA4CI4sCXO65h9LDtvR65ygDbFyiLvsb3M";

// --- Mock Data for Progress Analyst ---
const mockAnalysis = {
    title: "Personalized Plan for Quiz 3",
    summary: "Your score was 72%, just below the class average of 78%. Analysis shows strong performance in basic data structures, but weaknesses in Dynamic Programming.",
    plan: [
        "Focus on Dynamic Programming. Review the 'Knapsack' and 'Longest Common Subsequence' problems.",
        "Practice 3 medium-level DP problems on LeetCode or HackerRank.",
        "Review the 'Big O' notation for recursive algorithms, as this was a common point of error."
    ]
};

// === API ENDPOINTS ===

// --- AI Solver Endpoint (Using Gemini) ---
app.post('/api/solve', async (req, res) => {
    const { question } = req.body;
    console.log('Received question:', question);

    if (!question) {
        return res.status(400).json({ error: 'Question is required.' });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        return res.json({
            answer: `This is a mock answer for: **"${question}"**. \n\n The backend successfully received your question. To get a real answer, you need to: \n 1. Get a Gemini API key. \n 2. Paste it into 'server.js'. \n 3. Restart your server.`
        });
    }

    // --- REAL GEMINI API CALL ---
    try {
        // We use the correct model name
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

        // We add the instruction for Markdown formatting
        const prompt = `Please answer the following question. Use Markdown for formatting (e.g., ## Headings, **bold**, *italics*, and - lists).\n\nQuestion: ${question}`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        const apiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiRes.ok) {
            console.error('Gemini API Error Body:', await apiRes.text());
            throw new Error(`AI API error! Status: ${apiRes.status}`);
        }

        const data = await apiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            res.json({ answer: text });
        } else {
            res.json({ answer: "I'm sorry, I can't provide a response to that. Please try a different question." });
        }

    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: 'Failed to get answer from AI. ' + error.message });
    }
});

// --- Course Reviews Endpoints (USING FIRESTORE) ---
app.get('/api/reviews', async (req, res) => {
    try {
        const snapshot = await db.collection('reviews').orderBy('createdAt', 'desc').get();
        const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(reviews);
    } catch (error) {
        console.error('Failed to fetch reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const newReview = req.body;
        newReview.createdAt = admin.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection('reviews').add(newReview);
        res.status(201).json({ id: docRef.id, ...newReview });
    } catch (error) {
        console.error('Failed to add review:', error);
        res.status(500).json({ error: 'Failed to add review.' });
    }
});


// --- Senior Hub Endpoints (USING FIRESTORE) ---
app.get('/api/hub/posts', async (req, res) => {
    try {
        const snapshot = await db.collection('hub_posts').orderBy('createdAt', 'desc').get();
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(posts);
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

app.post('/api/hub/posts', async (req, res) => {
    try {
        const newPost = req.body;
        newPost.createdAt = admin.firestore.FieldValue.serverTimestamp();
        newPost.reply = null;
        const docRef = await db.collection('hub_posts').add(newPost);
        res.status(201).json({ id: docRef.id, ...newPost });
    } catch (error) {
        console.error('Failed to add post:', error);
        res.status(500).json({ error: 'Failed to add post.' });
    }
});

// --- Progress Analyst Endpoint (Mock Data) ---
app.post('/api/progress', (req, res) => {
    const { quizId, score, classAverage } = req.body;
    console.log('Received progress data:', { quizId, score, classAverage });
    res.json(mockAnalysis);
});

// --- Material Repository Endpoints (USING FIRESTORE) ---
app.get('/api/materials', async (req, res) => {
    try {
        const snapshot = await db.collection('materials').orderBy('createdAt', 'desc').get();
        const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(materials);
    } catch (error) {
        console.error('Failed to fetch materials:', error);
        res.status(500).json({ error: 'Failed to fetch materials.' });
    }
});

app.post('/api/materials/upload', async (req, res) => {
    try {
        const { course, title, category } = req.body;
        const newMaterial = {
            course,
            title,
            category,
            link: '#', // Placeholder link
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('materials').add(newMaterial);
        res.status(201).json({ id: docRef.id, ...newMaterial });
    } catch (error) {
        console.error('Failed to upload material:', error);
        res.status(500).json({ error: 'Failed to upload material.' });
    }
});


// --- Smart Study Groups Endpoints (USING FIRESTORE) ---
app.get('/api/study-groups', async (req, res) => {
    try {
        const snapshot = await db.collection('study_groups').get();
        const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(groups);
    } catch (error) {
        console.error('Failed to fetch study groups:', error);
        res.status(500).json({ error: 'Failed to fetch study groups.' });
    }
});

app.post('/api/study-groups/join', async (req, res) => {
    const { groupId } = req.body;
    const groupRef = db.collection('study_groups').doc(groupId);

    try {
        const updatedGroup = await db.runTransaction(async (transaction) => {
            const groupDoc = await transaction.get(groupRef);
            if (!groupDoc.exists) {
                throw new Error("Group not found.");
            }
            const groupData = groupDoc.data();
            if (groupData.members >= groupData.capacity) {
                throw new Error("This group is already full.");
            }
            const newMemberCount = groupData.members + 1;
            transaction.update(groupRef, { members: newMemberCount });
            return { ...groupData, members: newMemberCount };
        });
        res.json({
            message: 'Successfully joined the group!',
            group: { id: groupRef.id, ...updatedGroup }
        });
    } catch (error) {
        console.error('Failed to join group:', error);
        res.status(400).json({ message: error.message || 'Failed to join group.' });
    }
});


// --- Dashboard Summary Endpoint (NOW USING FIRESTORE) ---
app.get('/api/dashboard-summary', async (req, res) => {
    try {
        const postSnapshot = await db.collection('hub_posts')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        const latestPost = postSnapshot.docs[0] ? { id: postSnapshot.docs[0].id, ...postSnapshot.docs[0].data() } : null;

        const materialSnapshot = await db.collection('materials')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        const latestMaterial = materialSnapshot.docs[0] ? { id: materialSnapshot.docs[0].id, ...materialSnapshot.docs[0].data() } : null;

        const groupSnapshot = await db.collection('study_groups')
            .limit(1)
            .get();
        const openGroup = groupSnapshot.docs[0] ? { id: groupSnapshot.docs[0].id, ...groupSnapshot.docs[0].data() } : null;

        res.json({
            latestPost,
            latestMaterial,
            openGroup
        });
    } catch (error) {
        console.error('Failed to fetch dashboard summary:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard summary.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`METRA backend server listening on http://localhost:${PORT}`);
});