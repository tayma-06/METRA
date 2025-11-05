const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // We just installed this!

const app = express();
const PORT = 8000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- (F) A K E   D A T A B A S E) ---
// In your hackathon, this data would come from a real database!
let mockReviews = [
    { id: 1, course: "CSE321", professor: "Dr. Ahmed", rating: 5, comment: "Amazing professor, explains everything clearly." },
    { id: 2, course: "CSE472", professor: "Dr. Khan", rating: 3, comment: "Tough course, but fair." }
];
let mockPosts = [
    { id: 1, author: "Ayesha (2nd Year)", question: "Need a roadmap for Machine Learning courses and internship guidance?", reply: "From: Senior Member (AI Club)\n\nHere’s the roadmap we recommend: 1. Start with Python & Stats. 2. Take Intro to AI..." }
];

// --- API Endpoints ---

// 1. Test Route
app.get('/api/test', (req, res) => {
    res.json({ message: "Hello from the METRA backend!" });
});

// 2. AI Problem Solver
app.post('/api/solve', async (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'No question provided.' });
    }

    console.log(`Received question: ${question}`);

    // --- THIS IS HOW YOU CALL THE GEMINI AI ---
    // 1. Define the API key (DO NOT post this publicly in a real app)
    //    For the hackathon, you can get a key from Google AI Studio.
    const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // <-- IMPORTANT: Replace this
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    // 2. Create the prompt for the AI
    const systemPrompt = "You are METRA, an expert academic AI assistant. You explain complex computer science concepts simply and clearly, step-by-step. Format your answer in HTML with <p>, <strong>, and <ul> lists.";

    const payload = {
        contents: [{ parts: [{ text: question }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        // 3. Make the API call
        const aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!aiResponse.ok) {
            throw new Error(`AI API error! Status: ${aiResponse.status}`);
        }

        const aiResult = await aiResponse.json();
        const aiText = aiResult.candidates[0].content.parts[0].text;

        // 4. Send the AI's answer back to the frontend
        res.json({ answer: aiText });

    } catch (error) {
        console.error("AI Error:", error);
        // Send a fallback mock response if the AI fails
        res.status(500).json({
            answer: `<p>This is a <strong>mock answer</strong> because the AI call failed.</p><p>Error: ${error.message}</p><p>Did you set your API key in server.js?</p>`
        });
    }
});

// 3. Course Reviews
app.get('/api/reviews', (req, res) => {
    res.json(mockReviews);
});

app.post('/api/reviews', (req, res) => {
    const { course, professor, rating, comment } = req.body;
    const newReview = {
        id: mockReviews.length + 1,
        course,
        professor,
        rating,
        comment
    };
    mockReviews.push(newReview);
    console.log("Posted new review:", newReview);
    res.status(201).json(newReview);
});

// 4. Senior Suggestion Hub
app.get('/api/hub/posts', (req, res) => {
    res.json(mockPosts);
});

app.post('/api/hub/posts', (req, res) => {
    const { author, question } = req.body;
    const newPost = {
        id: mockPosts.length + 1,
        author,
        question,
        reply: null // No reply yet
    };
    mockPosts.push(newPost);
    console.log("Posted new hub question:", newPost);
    res.status(201).json(newPost);
});

// 5. Progress Analyst AI
app.post('/api/progress', (req, res) => {
    const { quizId, score, classAverage } = req.body;
    console.log("Received progress data:", req.body);

    // --- AI ANALYSIS ---
    // You would send this data to another AI prompt, e.g.:
    // "A student scored ${score} on Quiz ${quizId}, where the class average was ${classAverage}.
    //  What is a one-paragraph personalized improvement plan?"

    // For now, send a mock plan
    const mockAnalysis = {
        title: `Analysis for Quiz ${quizId}`,
        summary: `Your score of ${score}% is a great start. You're showing good understanding, but let's focus on closing the gap with the class average of ${classAverage}%.`,
        plan: [
            "Focus on Dynamic Programming (based on mock analysis).",
            "Review lecture notes for weeks 3 and 4.",
            "Try 3 practice problems on this topic."
        ]
    };

    res.json(mockAnalysis);
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`METRA backend server listening on http://localhost:${PORT}`);
});