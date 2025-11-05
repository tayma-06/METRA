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
const FieldValue = admin.firestore.FieldValue;
// --- End Firebase Admin Setup ---

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to allow cross-origin requests

const PORT = process.env.PORT || 8000;
// Make sure to paste your Gemini API key here
const GEMINI_API_KEY = "AIzaSyA4CI4sCXO65h9LDtvR65ygDbFyiLvsb3M";

// --- Mock Data for features NOT yet in Firestore ---
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

    // If the API key is still the placeholder, just send the mock response
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        return res.json({
            answer: `This is a **mock answer** for: "${question}". \n\n The backend successfully received your question. To get a real answer, you need to: \n 1. Get a Gemini API key. \n 2. Paste it into 'server.js'. \n 3. Restart your server.\n\n ### Sample Formatted Answer:\n* **Point 1:** This is how lists look.\n* **Point 2:** And **bold text**.`
        });
    }

    // --- REAL GEMINI API CALL ---
    try {
        // Use the correct model
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

        // Add instruction to use Markdown
        const fullPrompt = `Please answer this student's question. Use Markdown for formatting (like lists, bold, and headings) to make the answer easy to read.\n\nQuestion: ${question}`;

        const payload = {
            contents: [{
                parts: [{ text: fullPrompt }]
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
        // Updated to handle potential safety blocks or empty responses
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            res.json({ answer: text });
        } else {
            // This happens if the AI's response was blocked for safety
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
        // Add a server-side timestamp
        newReview.createdAt = FieldValue.serverTimestamp();

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
        newPost.createdAt = FieldValue.serverTimestamp();
        newPost.reply = null; // Ensure reply is null on creation

        const docRef = await db.collection('hub_posts').add(newPost);

        res.status(201).json({ id: docRef.id, ...newPost });
    } catch (error) {
        console.error('Failed to add post:', error);
        res.status(500).json({ error: 'Failed to add post.' });
    }
});

// --- Progress Analyst Endpoint (Mock Data) ---
// We'll leave this as mock, as a real AI call is complex.
app.post('/api/progress', (req, res) => {
    const { quizId, score, classAverage } = req.body;
    console.log('Received progress data:', { quizId, score, classAverage });

    // In a real app, you would send this data to an AI to *generate* the plan.
    // For the demo, we just return our mock analysis.
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
            link: '#', // Placeholder link. In a real app, this would come from Firebase Storage.
            createdAt: FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('materials').add(newMaterial);
        res.status(201).json({ id: docRef.id, ...newMaterial });
    } catch (error) {
        console.error('Failed to upload material:', error);
        res.status(500).json({ error: 'Failed to upload material.' });
    }
});


// --- Smart Study Groups Endpoints (USING FIRESTORE) ---

// --- NEW: Endpoint to CREATE a new study group ---
app.post('/api/study-groups', async (req, res) => {
    const { name, description, capacity, creatorId } = req.body;
    if (!name || !description || !capacity || !creatorId) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const newGroup = {
            name,
            description,
            capacity: parseInt(capacity, 10),
            createdAt: FieldValue.serverTimestamp(),
            // The creator is automatically the first member
            memberIds: [creatorId]
        };

        const docRef = await db.collection('study_groups').add(newGroup);
        res.status(201).json({ id: docRef.id, ...newGroup });

    } catch (error) {
        console.error('Failed to create group:', error);
        res.status(500).json({ message: 'Failed to create group.' });
    }
});


app.get('/api/study-groups', async (req, res) => {
    try {
        const snapshot = await db.collection('study_groups').orderBy('createdAt', 'desc').get();
        const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(groups);
    } catch (error) {
        console.error('Failed to fetch study groups:', error);
        res.status(500).json({ error: 'Failed to fetch study groups.' });
    }
});

app.post('/api/study-groups/join', async (req, res) => {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) {
        return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }

    const groupRef = db.collection('study_groups').doc(groupId);

    try {
        // Use a transaction to safely update the group
        const updatedGroup = await db.runTransaction(async (transaction) => {
            const groupDoc = await transaction.get(groupRef);
            if (!groupDoc.exists) {
                throw new Error("Group not found.");
            }

            const groupData = groupDoc.data();

            const memberIds = groupData.memberIds || [];

            // Check if user is already a member
            if (memberIds.includes(userId)) {
                throw new Error("You are already in this group.");
            }

            // Check if group is full
            if (memberIds.length >= groupData.capacity) {
                throw new Error("This group is already full.");
            }

            // Update the array using FieldValue.arrayUnion
            transaction.update(groupRef, {
                memberIds: FieldValue.arrayUnion(userId)
            });

            // Return the updated data
            const newMemberIds = [...memberIds, userId];
            return { ...groupData, memberIds: newMemberIds };
        });

        res.json({
            message: 'Successfully joined the group!',
            group: { id: groupRef.id, ...updatedGroup } // Send back the updated group
        });

    } catch (error) {
        console.error('Failed to join group:', error);
        // Send back specific error messages (like "Group is full")
        res.status(400).json({ message: error.message || 'Failed to join group.' });
    }
});

// --- Get a single group's details (for chat header) ---
app.get('/api/study-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const groupRef = db.collection('study_groups').doc(id);
        const doc = await groupRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Failed to get group details:', error);
        res.status(500).json({ message: 'Failed to get group details.' });
    }
});

// --- Post a message to a group chat ---
app.post('/api/study-groups/:id/messages', async (req, res) => {
    try {
        const { id } = req.params; // This is the groupId
        const { text, authorId, authorName } = req.body;

        if (!text || !authorId || !authorName) {
            return res.status(400).json({ message: 'Missing message data.' });
        }

        // Add the message to the 'messages' subcollection in Firestore
        const messageData = {
            text,
            authorId,
            authorName,
            createdAt: FieldValue.serverTimestamp()
        };

        const messagesRef = db.collection('study_groups').doc(id).collection('messages');
        const docRef = await messagesRef.add(messageData);

        res.status(201).json({ id: docRef.id, ...messageData });
    } catch (error) {
        console.error('Failed to post message:', error);
        res.status(500).json({ message: 'Failed to post message.' });
    }
});

// --- Dashboard Summary Endpoint (NOW USING FIRESTORE) ---
app.get('/api/dashboard-summary', async (req, res) => {
    try {
        // 1. Get the latest post from the Senior Hub
        const postSnapshot = await db.collection('hub_posts')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        const latestPost = postSnapshot.docs[0] ? { id: postSnapshot.docs[0].id, ...postSnapshot.docs[0].data() } : null;

        // 2. Get the latest material
        const materialSnapshot = await db.collection('materials')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        const latestMaterial = materialSnapshot.docs[0] ? { id: materialSnapshot.docs[0].id, ...materialSnapshot.docs[0].data() } : null;

        // 3. Get an open study group
        const groupSnapshot = await db.collection('study_groups')
            .orderBy('createdAt', 'desc')
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