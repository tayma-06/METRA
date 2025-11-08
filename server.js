// server.js
// METRA backend – Express + Firestore + Gemini AI - COMPLETE VERSION
// -----------------------------------------------------

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

// ---------- Firebase Admin (server-side SDK) ----------
const admin = require('firebase-admin');
let db;
let FieldValue;

try {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc || svc === 'placeholder') throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  const serviceAccount = JSON.parse(svc);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  FieldValue = admin.firestore.FieldValue;
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.error('❌ Firebase Admin init failed:', err.message);
  // Soft-degrade so the server can boot (useful for front-end dev)
  db = null;
  FieldValue = {
    serverTimestamp: () => new Date(),
    arrayUnion: (...x) => x,
    arrayRemove: (...x) => x,
    delete: () => null,
  };
}

// ---------- App & middleware ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const PORT = process.env.PORT || 8000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Quick guard for any DB route
const ensureDb = (res) => {
  if (!db) {
    res.status(503).json({
      error:
          'Database unavailable. Put FIREBASE_SERVICE_ACCOUNT JSON in .env and restart the server.',
    });
    return false;
  }
  return true;
};

// ---------- Health ----------
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'METRA backend',
    firestore: !!db,
    gemini: !!GEMINI_API_KEY,
  });
});
// server.js  (add near the other route registrations)
const registerPersonalized = require('./routes/personalized');
registerPersonalized(app, { db, FieldValue, GEMINI_API_KEY, fetch });
// server.js
// ...
const registerNotices = require('./routes/notices');
registerNotices(app, { db }); // pass your Firestore db instance

// =====================================================
// AI Solver (Gemini) - ORIGINAL
// =====================================================
app.post('/api/solve', async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  // Mock if no key
  if (!GEMINI_API_KEY) {
    return res.json({
      answer:
          `**Mock answer** for: "${question}"\n\n` +
          'Backend is wired. Add GEMINI_API_KEY to .env for real answers.',
    });
  }

  try {
    const model = 'gemini-2.5-flash-preview-09-2025';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [{ parts: [{ text: `Use Markdown. Q: ${question}` }] }],
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const body = await r.text();
      console.error('Gemini error:', r.status, body);
      throw new Error(`AI API error ${r.status}`);
    }

    const data = await r.json();
    const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I couldn't generate a response. Please try another question.";
    res.json({ answer: text });
  } catch (e) {
    console.error('Gemini API error:', e);
    res.status(500).json({ error: 'Failed to get answer from AI.' });
  }
});

// Helper function to parse AI response and extract JSON
const parseAIResponse = (text) => {
  try {
    // First, try to parse directly as JSON
    return JSON.parse(text);
  } catch (firstError) {
    try {
      // If direct parse fails, try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // If no code blocks, try to find JSON object in the text
      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }

      throw new Error('No valid JSON found in response');
    } catch (secondError) {
      console.error('Failed to parse AI response:', secondError.message);
      console.error('Raw response was:', text.substring(0, 500) + '...');
      throw new Error('AI returned invalid JSON format');
    }
  }
};

// =====================================================
// ENHANCED AI Progress Analysis - UPDATED FOR NEW FRONTEND
// =====================================================
app.post('/api/progress', async (req, res) => {
  const {
    quizId,
    score,
    classAverage = null,
    course,
    target = null,
    examDate = null,
    hoursPerWeek = null,
    weakTopics = [],
    notes = '',
    learningStyle = 'visual',
    priority = 'balanced'
  } = req.body || {};

  // Enhanced validation
  if (!quizId || score === undefined || !course) {
    return res.status(400).json({
      error: 'Missing required fields: quizId, score, and course'
    });
  }

  // Mock response if no AI key
  if (!GEMINI_API_KEY) {
    const mockAnalysis = {
      title: `Improvement Plan for ${quizId} - ${course}`,
      summary: `Based on your score of ${score}% in ${course}${classAverage ? ` (class average: ${classAverage}%)` : ''}, I've identified key areas for improvement. ${target ? `Your goal of ${target}% is ${target > score ? 'achievable with focused effort' : 'within reach - great work!'}` : 'Let me help you create a targeted improvement strategy.'}`,
      plan: [
        `Review core concepts from ${course} that were assessed`,
        weakTopics.length > 0 ? `Focus on: ${weakTopics.join(', ')}` : 'Identify specific challenging areas',
        'Practice with similar assessment questions',
        'Create summary notes for key topics',
        'Seek clarification on misunderstood concepts'
      ],
      studySchedule: hoursPerWeek ? [
        `Dedicate ${Math.floor(hoursPerWeek/2)} hours for concept review`,
        `Use ${Math.floor(hoursPerWeek/2)} hours for practice and application`,
        'Schedule regular review sessions'
      ] : ['Create a consistent study schedule', 'Balance review and practice time'],
      resources: [
        `${course} textbook and materials`,
        'Practice problems and past assessments',
        'Online resources specific to your subject',
        'Study group or peer discussions'
      ],
      confidenceBoosters: [
        'Start with topics you feel comfortable with',
        'Celebrate small improvements',
        'Focus on understanding rather than memorization'
      ],
      riskFactors: [
        'Inconsistent study habits',
        'Not addressing specific weak areas',
        'Poor time management'
      ]
    };

    // Save to Firestore if available
    if (db) {
      try {
        await db.collection('progress_analyses').add({
          ...req.body,
          analysis: mockAnalysis,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: false
        });
      } catch (dbError) {
        console.error('Failed to save mock analysis:', dbError);
      }
    }

    return res.json(mockAnalysis);
  }

  try {
    const model = 'gemini-2.5-flash-preview-09-2025';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
IMPORTANT: Respond with ONLY valid JSON. Do not include any markdown formatting, code blocks, or additional text.

As an expert academic advisor specializing in ${course}, analyze this student's performance and create a highly personalized improvement plan.

STUDENT PERFORMANCE DATA:
- Subject: ${course}
- Assessment: ${quizId}
- Student Score: ${score}% ${classAverage ? `(Class Average: ${classAverage}%)` : ''}
- Target Goal: ${target || 'Not specified'}%
- Time Until Exam: ${examDate ? `${Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))} days` : 'Not specified'}
- Available Study Time: ${hoursPerWeek || 'Not specified'} hours/week
- Identified Weak Areas: ${weakTopics.join(', ') || 'None specified'}
- Preferred Learning Style: ${learningStyle}
- Learning Priority: ${priority}
- Additional Context: ${notes || 'None provided'}

Create a comprehensive JSON response with this exact structure:
{
  "title": "Motivating plan title specific to ${course}",
  "summary": "Detailed 2-3 paragraph analysis addressing performance in ${course}, identifying strengths/weaknesses, and realistic improvement strategy",
  "plan": ["5-7 specific, actionable steps tailored to ${course} and the student's situation"],
  "studySchedule": ["Personalized weekly schedule using available study hours"],
  "resources": ["Specific resource recommendations for learning ${course}"],
  "confidenceBoosters": ["Practical strategies to build confidence in ${course}"],
  "riskFactors": ["Potential challenges specific to learning ${course}"]
}

Requirements:
- Make it HIGHLY specific to ${course} subject matter
- Incorporate ${learningStyle} learning strategies
- Focus on ${priority} approach
- Provide concrete, actionable advice
- Be encouraging but realistic
- Include subject-specific resources and strategies

Respond with ONLY the JSON object, no other text.
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini progress analysis error:', response.status, errorBody);
      throw new Error(`AI API error ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let analysis;
    try {
      analysis = parseAIResponse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback:', parseError.message);
      // Enhanced fallback
      analysis = {
        title: `Personalized ${course} Improvement Plan`,
        summary: `Based on your ${score}% in ${quizId} for ${course}, I've created a targeted improvement strategy. Your ${learningStyle} learning preference and ${priority} focus will guide our approach to help you ${target ? `reach your ${target}% goal` : 'improve your understanding'}.`,
        plan: [
          `Conduct thorough review of ${course} fundamentals`,
          weakTopics.length > 0 ? `Practice ${weakTopics.join(', ')} with focused exercises` : 'Identify and address knowledge gaps',
          'Apply concepts through practical problems',
          'Create study aids matching your learning style',
          'Seek feedback and clarification regularly'
        ],
        studySchedule: hoursPerWeek ? [
          `Allocate ${Math.floor(hoursPerWeek * 0.6)} hours for core concept mastery`,
          `Use ${Math.floor(hoursPerWeek * 0.4)} hours for application and practice`,
          'Include regular progress assessments'
        ] : ['Establish consistent study routine', 'Balance theory and practice sessions'],
        resources: [
          `Primary ${course} textbook and materials`,
          'Subject-specific online resources and videos',
          'Practice questions and mock tests',
          'Study groups or tutoring sessions'
        ],
        confidenceBoosters: [
          'Master foundational concepts first',
          'Track and celebrate incremental progress',
          'Connect learning to real-world applications'
        ],
        riskFactors: [
          'Skipping fundamental concepts',
          'Inadequate practice application',
          'Poor time allocation across topics'
        ]
      };
    }

    // Enhanced saving to Firestore
    if (db) {
      try {
        const analysisDoc = {
          ...req.body,
          analysis,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: true,
          modelUsed: model,
          version: '2.0'
        };

        await db.collection('progress_analyses').add(analysisDoc);
      } catch (dbError) {
        console.error('Failed to save analysis to DB:', dbError);
      }
    }

    res.json(analysis);
  } catch (e) {
    console.error('Progress analysis error:', e);
    res.status(500).json({
      error: 'Failed to generate personalized analysis.',
      fallback: {
        title: `Quick Assessment for ${quizId}`,
        summary: `You scored ${score}% in ${course}${classAverage ? ` with class average ${classAverage}%` : ''}. Focus on targeted improvement strategies.`,
        plan: [
          `Review ${course} core concepts`,
          'Practice with focused exercises',
          'Seek additional help when needed',
          'Track your progress regularly'
        ]
      }
    });
  }
});

// =====================================================
// AI Study Plan Generator (Generic for any topic) - ENHANCED
// =====================================================
app.post('/api/study-plan', async (req, res) => {
  const {
    topic,
    level = 'beginner',
    timeframe = '1 week',
    hoursPerWeek,
    learningGoals = '',
    priorKnowledge = 'none'
  } = req.body || {};

  if (!topic) return res.status(400).json({ error: 'Topic is required.' });

  if (!GEMINI_API_KEY) {
    const mockPlan = {
      topic,
      level,
      timeframe,
      plan: {
        overview: `Comprehensive ${timeframe} learning plan for ${topic} at ${level} level. This plan is designed to take you from ${priorKnowledge} knowledge to solid understanding through structured learning and practice.`,
        weeklySchedule: [
          `Week 1: Foundation building and core concepts of ${topic}`,
          `Week 2: Practical application and skill development`,
          `Week 3: Advanced topics and real-world applications`,
          `Week 4: Mastery, projects, and comprehensive review`
        ].slice(0, timeframe === '1 week' ? 1 : timeframe === '2 weeks' ? 2 : 4),
        dailyActivities: [
          'Review previous concepts (15-20 mins)',
          'Learn new material (45-60 mins)',
          'Practice exercises (30-45 mins)',
          'Reflection and note-taking (15 mins)'
        ],
        resources: [
          `Recommended textbooks or online courses for ${topic}`,
          'Video tutorials and interactive platforms',
          'Practice exercises and projects',
          'Community forums and discussion groups'
        ],
        milestones: [
          'Complete foundation concepts',
          'Build first practical application',
          'Solve intermediate-level problems',
          'Create portfolio project or demonstration'
        ],
        assessmentMethods: [
          'Self-testing with practice problems',
          'Project completion and review',
          'Concept explanation to others',
          'Progress tracking against goals'
        ]
      }
    };

    // Save mock plan to Firestore
    if (db) {
      try {
        await db.collection('study_plans').add({
          topic,
          level,
          timeframe,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
          learningGoals,
          priorKnowledge,
          plan: mockPlan,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: false
        });
      } catch (dbError) {
        console.error('Failed to save mock study plan to DB:', dbError);
      }
    }

    return res.json(mockPlan);
  }

  try {
    const model = 'gemini-2.5-flash-preview-09-2025';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
IMPORTANT: Respond with ONLY valid JSON. Do not include any markdown formatting, code blocks, or additional text.

Create a comprehensive, personalized study plan for learning ${topic} at ${level} level.

LEARNING CONTEXT:
- Topic: ${topic}
- Current Level: ${level}
- Timeframe: ${timeframe}
- Weekly Study Time: ${hoursPerWeek || 'Not specified'} hours
- Learning Goals: ${learningGoals || 'General mastery'}
- Prior Knowledge: ${priorKnowledge}

Generate a JSON response with this exact structure:
{
  "topic": "${topic}",
  "level": "${level}",
  "timeframe": "${timeframe}",
  "plan": {
    "overview": "2-3 paragraph comprehensive overview of the learning journey and approach for ${topic}",
    "weeklySchedule": ["array of specific weekly learning objectives, activities, and focus areas tailored to ${topic}"],
    "dailyActivities": ["array of practical daily tasks, exercises, and learning activities for ${topic}"],
    "resources": ["array of specific, recommended books, websites, videos, tools, and platforms for learning ${topic}"],
    "milestones": ["array of clear, measurable achievement checkpoints and goals for ${topic}"],
    "assessmentMethods": ["array of practical ways to measure progress and understanding in ${topic}"],
    "commonPitfalls": ["array of potential challenges and how to avoid them when learning ${topic}"],
    "successIndicators": ["array of clear signs that learning is progressing well in ${topic}"]
  }
}

Make it extremely practical, actionable, and tailored to learning ${topic}. Include specific resource recommendations and address common learning challenges for this subject.

Respond with ONLY the JSON object, no other text.
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`AI API error ${response.status}`);

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let studyPlan;
    try {
      studyPlan = parseAIResponse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback:', parseError.message);
      // Enhanced fallback study plan
      studyPlan = {
        topic,
        level,
        timeframe,
        plan: {
          overview: `This ${timeframe} learning plan will take you from ${priorKnowledge} knowledge to ${level} proficiency in ${topic}. We'll focus on building strong foundations while progressively introducing more complex concepts and practical applications relevant to ${topic}.`,
          weeklySchedule: [
            `Week 1: Core fundamentals and basic concepts of ${topic}`,
            `Week 2: Practical application and problem-solving techniques in ${topic}`,
            `Week 3: Advanced features and real-world implementation of ${topic}`,
            `Week 4: Mastery, projects, and comprehensive review of ${topic}`
          ].slice(0, timeframe === '1 week' ? 1 : timeframe === '2 weeks' ? 2 : 4),
          dailyActivities: [
            'Active learning of new concepts (30-45 mins)',
            'Hands-on practice and exercises (45-60 mins)',
            'Review and reflection (15-30 mins)',
            'Quick recall practice of previous topics (10-15 mins)'
          ],
          resources: [
            `Comprehensive ${topic} learning resources`,
            'Video courses and tutorials',
            'Interactive practice platforms',
            'Community support and forums',
            'Project ideas and real-world applications'
          ],
          milestones: [
            'Understand and explain core concepts confidently',
            'Complete basic exercises without assistance',
            'Build small project applying key concepts',
            'Solve intermediate-level challenges independently',
            'Explain concepts to others and provide help'
          ],
          assessmentMethods: [
            'Regular self-testing with practice problems',
            'Project completion and quality assessment',
            'Concept explanation to study partner or recorder',
            'Progress quizzes and knowledge checks',
            'Real-world application and problem-solving'
          ],
          commonPitfalls: [
            'Skipping fundamentals - ensure solid foundation',
            'Tutorial hell - balance learning with building',
            'Isolated learning - engage with community',
            'Inconsistent practice - maintain regular schedule'
          ],
          successIndicators: [
            'Increasing comfort with complex problems',
            'Decreasing reliance on references and tutorials',
            'Ability to debug and solve issues independently',
            'Growing confidence in explaining concepts',
            'Completion of progressively challenging projects'
          ]
        }
      };
    }

    // Save to Firestore
    if (db) {
      try {
        await db.collection('study_plans').add({
          topic,
          level,
          timeframe,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
          learningGoals,
          priorKnowledge,
          plan: studyPlan,
          createdAt: FieldValue.serverTimestamp(),
          aiGenerated: true
        });
      } catch (dbError) {
        console.error('Failed to save study plan to DB:', dbError);
      }
    }

    res.json(studyPlan);
  } catch (e) {
    console.error('Study plan generation error:', e);
    res.status(500).json({
      error: 'Failed to generate study plan',
      fallback: {
        topic,
        level,
        timeframe,
        plan: {
          overview: `Basic learning plan for ${topic}. Focus on consistent practice and progressive learning.`,
          weeklySchedule: [`Learn ${topic} fundamentals`, `Practice regularly`, `Build projects`, `Review and improve`],
          resources: ['Online tutorials', 'Practice exercises', 'Community support'],
          milestones: ['Basic understanding', 'Practical application', 'Project completion']
        }
      }
    });
  }
});

// =====================================================
// Course Reviews - ORIGINAL CODE PRESERVED
// =====================================================
app.get('/api/reviews', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const snap = await db.collection('reviews').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const review = { ...req.body, createdAt: FieldValue.serverTimestamp() };
    const ref = await db.collection('reviews').add(review);
    res.status(201).json({ id: ref.id, ...review });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add review.' });
  }
});

// =====================================================
// Senior Hub (posts & replies) - ORIGINAL CODE PRESERVED
// =====================================================
app.get('/api/hub/posts', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const snap = await db.collection('hub_posts').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

app.post('/api/hub/posts', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.delete('/api/hub/posts/:id', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.put('/api/hub/posts/:id/reply', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.delete('/api/hub/posts/:id/reply', async (req, res) => {
  if (!ensureDb(res)) return;
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

// =====================================================
// Materials (filters + social actions) - ORIGINAL CODE
// =====================================================
app.get('/api/materials', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.post('/api/materials/upload', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.delete('/api/materials/:id', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.post('/api/materials/:id/like', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.post('/api/materials/:id/bookmark', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.post('/api/materials/:id/click', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const ref = db.collection('materials').doc(req.params.id);
    await ref.update({ clicks: admin.firestore.FieldValue.increment(1) });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to track click.' });
  }
});

app.post('/api/materials/:id/report', async (req, res) => {
  if (!ensureDb(res)) return;
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

// =====================================================
// Study Groups - ORIGINAL CODE PRESERVED
// =====================================================
app.post('/api/study-groups', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.get('/api/study-groups', async (_req, res) => {
  if (!ensureDb(res)) return;
  try {
    const snap = await db.collection('study_groups').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch study groups.' });
  }
});

app.get('/api/study-groups/:groupId', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.post('/api/study-groups/join', async (req, res) => {
  if (!ensureDb(res)) return;
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

// ---------- Optional: Call logging / active room id ----------
app.post('/api/study-groups/:groupId/call', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.post('/api/study-groups/:groupId/call/end', async (req, res) => {
  if (!ensureDb(res)) return;
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

// =====================================================
// Chat messages (text / file / audio) + delivery/read/typing - ORIGINAL
// =====================================================
app.post('/api/study-groups/:groupId/messages', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const { groupId } = req.params;
    const {
      text,
      authorId,
      authorName,
      kind, // 'text' | 'file' | 'audio'
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

app.put('/api/study-groups/:groupId/messages/:messageId/delivered', async (req, res) => {
  if (!ensureDb(res)) return;
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

app.put('/api/study-groups/:groupId/messages/:messageId/seen', async (req, res) => {
  if (!ensureDb(res)) return;
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

// Typing indicator (stored in /meta/typing)
app.post('/api/study-groups/:groupId/typing', async (req, res) => {
  if (!ensureDb(res)) return;
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

// =====================================================
// Dashboard summary (latest items) - ORIGINAL
// =====================================================
app.get('/api/dashboard-summary', async (_req, res) => {
  if (!ensureDb(res)) return;
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

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 METRA backend listening at http://localhost:${PORT}`);
  console.log(`🗄️  Firestore: ${db ? 'READY ✅' : 'NOT CONFIGURED ❌'}`);
  console.log(`🤖 Gemini: ${GEMINI_API_KEY ? 'READY ✅' : 'MOCK MODE ❕'}`);
});