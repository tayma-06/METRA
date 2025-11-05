const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// --- Firebase Admin Setup ---
const admin = require('firebase-admin');
let db;
let FieldValue; // Declare FieldValue here

// IMPORTANT: This file MUST be present for Firestore access to work.
// We use try/catch to ensure the server starts even if the key is missing.
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    FieldValue = admin.firestore.FieldValue; // Initialize FieldValue
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('*** WARNING: Firebase Admin SDK NOT initialized. ***');
    console.error('*** Reason: Could not find or read "serviceAccountKey.json". ***');
    console.error('*** Firestore endpoints will NOT work until this file is added. ***');
    // Set mocks for safety if db is not initialized
    db = null;
    FieldValue = { serverTimestamp: () => new Date(), arrayUnion: (x) => [x] }; // Mock FieldValue
}
// --- End Firebase Admin Setup ---

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to allow cross-origin requests

const PORT = process.env.PORT || 8000;
// CRITICAL: Paste your real API key here, then restart the server.
// If you see the mock answer, replace this string with your actual Gemini API Key.
const GEMINI_API_KEY = "AIzaSyBx6lD5y6HMwjqBl6Cj0h1pgoIGW_SWuUo";


// Helper function to check for DB readiness
const checkDbReady = (res) => {
    if (!db) {
        res.status(503).json({ error: 'Database service unavailable. Please add serviceAccountKey.json to your backend folder and restart the server.' });
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

    // --- FIX START: Checking for the placeholder key ---
    const PLACEHOLDER_KEY = "YOUR_REAL_GEMINI_API_KEY_HERE";

    if (!GEMINI_API_KEY || GEMINI_API_KEY === PLACEHOLDER_KEY) {
        return res.json({
            answer: `This is a **mock answer** for: "${question}". \n\n The backend successfully received your question. To get a real answer, you need to: \n 1. Get a real, unique Gemini API key. \n 2. Paste it into 'server.js' where it says \`"YOUR_REAL_GEMINI_API_KEY_HERE"\`. \n 3. Restart your server.\n\n ### Sample Formatted Answer:\n* **Point 1:** This is how lists look.\n* **Point 2:** And **bold text**.`
        });
    }
    // --- FIX END ---

    // --- REAL GEMINI API CALL ---
    try {
        const modelName = 'gemini-2.5-flash-preview-09-2025';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

        // Use the combined prompt with Markdown instruction
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
            // This handles safety-blocked responses gracefully
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
            reply: null // Explicitly initialize the reply field
        };

        const docRef = await db.collection('hub_posts').add(postToSave);

        res.status(201).json({ id: docRef.id, ...postToSave });
    } catch (error) {
        console.error('Failed to add post:', error);
        res.status(500).json({ error: 'Failed to add post.' });
    }
});

// --- DELETE a Post (Only the author can delete the original question) ---
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

        // --- Security Check: Only the author can delete the post ---
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


// --- Reply to a Post (PUT Request) ---
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

// --- DELETE a Reply from a Post (Only the reply author can delete the reply) ---
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

        // Security Check: Only the author of the REPLY can delete it
        if (postData.reply.authorId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this reply." });
        }

        // Delete the reply by setting the field to null
        await postRef.update({ reply: null });
        res.status(200).json({ message: "Reply deleted successfully." });

    } catch (error) {
        console.error('Failed to delete reply:', error);
        res.status(500).json({ error: 'Failed to delete reply.' });
    }
});


// --- Progress Analyst Endpoint (Mock Data) ---
app.post('/api/progress', (req, res) => {
    // In a real app, you would send this data to an AI to *generate* the plan.
    res.json(mockAnalysis);
});

// --- Material Repository Endpoints (USING FIRESTORE) ---
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

// --- Upload endpoint to accept the link and user IDs ---
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

// --- Delete material endpoint ---
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

        // Security check: Only the author can delete their post
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


// --- Smart Study Groups Endpoints (USING FIRESTORE) ---

// --- Create a new study group ---
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
            group: { id: groupRef.id, ...updatedGroup }
        });

    } catch (error) {
        console.error('Failed to join group:', error);
        res.status(400).json({ message: error.message || 'Failed to join group.' });
    }
});

// --- Get a single group's details (for chat header) ---
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

// --- Post a message to a group chat ---
app.post('/api/study-groups/:id/messages', async (req, res) => {
    if (!checkDbReady(res)) return;
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
    if (!checkDbReady(res)) return;
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

        // 3. Get an open study group (this is more complex, so we'll just get the first one)
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