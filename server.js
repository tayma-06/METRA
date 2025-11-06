const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

// --- SECURE Firebase Admin Setup ---
const admin = require('firebase-admin');
let db;
let FieldValue;

try {
    // Get Firebase config from environment variable
    const firebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!firebaseConfig || firebaseConfig === 'placeholder') {
        throw new Error('Firebase configuration not found in environment variables. Please add FIREBASE_SERVICE_ACCOUNT to your .env file.');
    }

    const serviceAccount = JSON.parse(firebaseConfig);

    // Fix the private key formatting - convert \\n to actual newlines
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    FieldValue = admin.firestore.FieldValue;
    console.log('✅ Firebase Admin SDK initialized successfully from environment variables.');

} catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:');
    console.error('   Reason:', error.message);
    console.error('   💡 To fix: Check your FIREBASE_SERVICE_ACCOUNT formatting in .env');
    console.error('   🔒 Firestore endpoints will NOT work until Firebase is properly configured');

    // Set mocks for safety
    db = null;
    FieldValue = {
        serverTimestamp: () => new Date(),
        arrayUnion: (x) => [x],
        arrayRemove: (x) => [x]
    };
}
// --- End Firebase Admin Setup ---

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper function to check for DB readiness
const checkDbReady = (res) => {
    if (!db) {
        res.status(503).json({ error: 'Database service unavailable. Please configure Firebase in your .env file and restart the server.' });
        return false;
    }
    return true;
};

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

    // Check if API key is set in environment
    if (!GEMINI_API_KEY) {
        return res.json({
            answer: `This is a **mock answer** for: "${question}". \n\n The backend successfully received your question. To get a real answer, you need to: \n 1. Set your Gemini API key in the .env file as GEMINI_API_KEY=your_actual_key_here \n 2. Restart your server.\n\n ### Sample Formatted Answer:\n* **Point 1:** This is how lists look.\n* **Point 2:** And **bold text**.`
        });
    }

    // --- REAL GEMINI API CALL ---
    try {
        const modelName = 'gemini-2.5-flash-preview-09-2025';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

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
    if (!checkDbReady(res)) return;
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
    if (!checkDbReady(res)) return;
    try {
        const newReview = req.body;
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
    if (!checkDbReady(res)) return;
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
    if (!checkDbReady(res)) return;
    try {
        const newPost = req.body;
        newPost.createdAt = FieldValue.serverTimestamp();

        const postToSave = {
            course: newPost.course,
            question: newPost.question,
            authorId: newPost.authorId,
            authorName: newPost.authorName,
            createdAt: newPost.createdAt,
            reply: null
        };

        const docRef = await db.collection('hub_posts').add(postToSave);
        res.status(201).json({ id: docRef.id, ...postToSave });
    } catch (error) {
        console.error('Failed to add post:', error);
        res.status(500).json({ error: 'Failed to add post.' });
    }
});

// --- DELETE a Post ---
app.delete('/api/hub/posts/:id', async (req, res) => {
    if (!checkDbReady(res)) return;
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required for deletion." });
        }

        const docRef = db.collection('hub_posts').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Post not found." });
        }

        const data = doc.data();
        if (data.authorId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this post." });
        }

        await docRef.delete();
        res.status(200).json({ message: "Post deleted successfully." });

    } catch (error) {
        console.error('Failed to delete post:', error);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

// --- Reply to a Post ---
app.put('/api/hub/posts/:id/reply', async (req, res) => {
    if (!checkDbReady(res)) return;
    try {
        const { id } = req.params;
        const { replyText, authorId, authorName } = req.body;

        if (!replyText || !authorId || !authorName) {
            return res.status(400).json({ message: "Missing required reply fields." });
        }

        const replyObject = {
            text: replyText,
            authorId: authorId,
            authorName: authorName,
            repliedAt: FieldValue.serverTimestamp()
        };

        const postRef = db.collection('hub_posts').doc(id);
        const postDoc = await postRef.get();

        if (postDoc.exists && postDoc.data().reply) {
            return res.status(409).json({ message: "This post already has a senior reply. Only one reply is allowed." });
        }

        await postRef.update({ reply: replyObject });
        res.status(200).json({ message: "Reply added successfully.", reply: replyObject });

    } catch (error) {
        console.error('Failed to add reply:', error);
        res.status(500).json({ error: 'Failed to add reply.' });
    }
});

// --- DELETE a Reply ---
app.delete('/api/hub/posts/:id/reply', async (req, res) => {
    if (!checkDbReady(res)) return;
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required for deletion." });
        }

        const postRef = db.collection('hub_posts').doc(id);
        const doc = await postRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Post not found." });
        }

        const postData = doc.data();
        if (!postData.reply) {
            return res.status(404).json({ message: "No reply found to delete." });
        }

        if (postData.reply.authorId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this reply." });
        }

        await postRef.update({ reply: null });
        res.status(200).json({ message: "Reply deleted successfully." });

    } catch (error) {
        console.error('Failed to delete reply:', error);
        res.status(500).json({ error: 'Failed to delete reply.' });
    }
});

// --- Progress Analyst Endpoint (Mock Data) ---
app.post('/api/progress', (req, res) => {
    res.json(mockAnalysis);
});

// --- Material Repository Endpoints ---
app.get('/api/materials', async (req, res) => {
    if (!checkDbReady(res)) return;
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
    if (!checkDbReady(res)) return;
    try {
        const { course, title, category, link, authorId, authorName } = req.body;
        if (!course || !title || !category || !link || !authorId || !authorName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const newMaterial = {
            course,
            title,
            category,
            link,
            authorId,
            authorName,
            createdAt: FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('materials').add(newMaterial);
        res.status(201).json({ id: docRef.id, ...newMaterial });
    } catch (error) {
        console.error('Failed to upload material:', error);
        res.status(500).json({ error: 'Failed to upload material.' });
    }
});

app.delete('/api/materials/:id', async (req, res) => {
    if (!checkDbReady(res)) return;
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required for deletion." });
        }

        const docRef = db.collection('materials').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Material not found." });
        }

        const data = doc.data();
        if (data.authorId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this material." });
        }

        await docRef.delete();
        res.status(200).json({ message: "Material deleted successfully." });

    } catch (error) {
        console.error('Failed to delete material:', error);
        res.status(500).json({ error: 'Failed to delete material.' });
    }
});

// --- Smart Study Groups Endpoints ---
app.post('/api/study-groups', async (req, res) => {
    if (!checkDbReady(res)) return;
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
    if (!checkDbReady(res)) return;
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
    if (!checkDbReady(res)) return;
    const { groupId, userId } = req.body;
    if (!groupId || !userId) {
        return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }

    const groupRef = db.collection('study_groups').doc(groupId);

    try {
        const updatedGroup = await db.runTransaction(async (transaction) => {
            const groupDoc = await transaction.get(groupRef);
            if (!groupDoc.exists) {
                throw new Error("Group not found.");
            }

            const groupData = groupDoc.data();
            const memberIds = groupData.memberIds || [];

            if (memberIds.includes(userId)) {
                throw new Error("You are already in this group.");
            }

            if (memberIds.length >= groupData.capacity) {
                throw new Error("This group is already full.");
            }

            transaction.update(groupRef, {
                memberIds: FieldValue.arrayUnion(userId)
            });

            const newMemberIds = [...memberIds, userId];
            return { ...groupData, memberIds: newMemberIds };
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

app.get('/api/study-groups/:id', async (req, res) => {
    if (!checkDbReady(res)) return;
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

app.post('/api/study-groups/:id/messages', async (req, res) => {
    if (!checkDbReady(res)) return;
    try {
        const { id } = req.params;
        const { text, authorId, authorName } = req.body;

        if (!text || !authorId || !authorName) {
            return res.status(400).json({ message: 'Missing message data.' });
        }

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

// --- Dashboard Summary Endpoint ---
app.get('/api/dashboard-summary', async (req, res) => {
    if (!checkDbReady(res)) return;
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
    console.log(`🚀 METRA backend server listening on http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${db ? 'Firebase Firestore ✅' : 'Not configured ❌'}`);
    console.log(`🤖 AI Solver: ${GEMINI_API_KEY ? 'Gemini API ✅' : 'Not configured ❌'}`);
});