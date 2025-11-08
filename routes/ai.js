// routes/ai.js - AI endpoints
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Helper function to parse AI response and extract JSON
const parseAIResponse = (text) => {
    try {
        return JSON.parse(text);
    } catch (firstError) {
        try {
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1].trim());
            }
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

// AI Solver (Gemini)
router.post('/solve', async (req, res) => {
    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    if (!GEMINI_API_KEY) {
        return res.json({
            answer: `**Mock answer** for: "${question}"\n\nBackend is wired. Add GEMINI_API_KEY to .env for real answers.`,
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
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try another question.";
        res.json({ answer: text });
    } catch (e) {
        console.error('Gemini API error:', e);
        res.status(500).json({ error: 'Failed to get answer from AI.' });
    }
});

// AI Progress Analysis
router.post('/progress', async (req, res) => {
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

    if (!quizId || score === undefined || !course) {
        return res.status(400).json({
            error: 'Missing required fields: quizId, score, and course'
        });
    }

    const { db, FieldValue } = req.app.locals;

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

// AI Study Plan Generator
router.post('/study-plan', async (req, res) => {
    const {
        topic,
        level = 'beginner',
        timeframe = '1 week',
        hoursPerWeek,
        learningGoals = '',
        priorKnowledge = 'none'
    } = req.body || {};

    if (!topic) return res.status(400).json({ error: 'Topic is required.' });

    const { db, FieldValue } = req.app.locals;

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

module.exports = router;