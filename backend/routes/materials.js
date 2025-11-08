const express = require('express');
const router = express.Router();

// Database availability middleware
const ensureDb = (req, res, next) => {
    if (!req.app.locals.db) {
        return res.status(503).json({
            error: 'Database unavailable. Please check server configuration.',
        });
    }
    next();
};

// Validation helper
const validateMaterial = (data) => {
    const { course, title, category, link } = data;
    const errors = [];

    if (!course || !course.trim()) errors.push('Course is required');
    if (!title || !title.trim()) errors.push('Title is required');
    if (!category || !category.trim()) errors.push('Category is required');
    if (!link || !link.trim()) errors.push('Link is required');

    if (link && !/^https?:\/\//i.test(link)) {
        errors.push('Link must be a valid URL starting with http:// or https://');
    }

    return errors;
};

// GET /api/materials - Get materials with filtering and sorting
router.get('/materials', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
    
    try {
        const {
            q = '',
            course = '',
            category = '',
            sort = 'createdAt_desc',
            limit = '50',
        } = req.query;

        let materialsRef = db.collection('materials');

        // Apply Firestore filters
        if (course) materialsRef = materialsRef.where('course', '==', course);
        if (category) materialsRef = materialsRef.where('category', '==', category);

        // Apply sorting
        switch (sort) {
            case 'likes_desc':
                materialsRef = materialsRef.orderBy('likes', 'desc');
                break;
            case 'clicks_desc':
                materialsRef = materialsRef.orderBy('clicks', 'desc');
                break;
            default:
                materialsRef = materialsRef.orderBy('createdAt', 'desc');
        }

        const snapshot = await materialsRef.limit(parseInt(limit, 10)).get();
        
        let materials = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure consistent data structure
                likes: data.likes || 0,
                clicks: data.clicks || 0,
                likedBy: data.likedBy || [],
                bookmarkedBy: data.bookmarkedBy || [],
                reports: data.reports || 0,
                // Handle Firebase timestamp
                createdAt: data.createdAt ? 
                    (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : 
                    new Date().toISOString()
            };
        });

        // Client-side search if query provided
        if (q) {
            const searchTerm = q.toLowerCase().trim();
            materials = materials.filter(material =>
                (material.title && material.title.toLowerCase().includes(searchTerm)) ||
                (material.course && material.course.toLowerCase().includes(searchTerm))
            );
        }

        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ 
            error: 'Failed to fetch materials',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/materials/upload - Upload new material
router.post('/materials/upload', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    
    try {
        const { course, title, category, link, authorId, authorName } = req.body;

        // Validate required fields
        const validationErrors = validateMaterial({ course, title, category, link });
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: validationErrors 
            });
        }

        // Create material document
        const materialData = {
            course: course.trim(),
            title: title.trim(),
            category: category.trim(),
            link: link.trim(),
            authorId: authorId || `anonymous-${Math.random().toString(36).slice(2, 9)}`,
            authorName: authorName || 'Anonymous',
            createdAt: FieldValue.serverTimestamp(),
            likes: 0,
            clicks: 0,
            likedBy: [],
            bookmarkedBy: [],
            reports: 0,
            lastReportedAt: null,
            lastReportReason: null
        };

        const docRef = await db.collection('materials').add(materialData);

        // Return the created material with ID
        const responseData = {
            id: docRef.id,
            ...materialData,
            createdAt: new Date().toISOString() // Fallback for client
        };

        res.status(201).json(responseData);
    } catch (error) {
        console.error('Error uploading material:', error);
        res.status(500).json({ 
            error: 'Failed to upload material',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/materials/:id - Delete material
router.delete('/materials/:id', ensureDb, async (req, res) => {
    const { db } = req.app.locals;
    
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                message: 'User ID is required for deletion' 
            });
        }

        const docRef = db.collection('materials').doc(id);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ 
                message: 'Material not found' 
            });
        }

        const material = docSnapshot.data();

        // Authorization check - only author or admin can delete
        if (material.authorId !== userId) {
            // Check if user is admin (you might want to implement proper admin check)
            return res.status(403).json({ 
                message: 'Not authorized to delete this material' 
            });
        }

        await docRef.delete();

        res.json({ 
            message: 'Material deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ 
            error: 'Failed to delete material',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/materials/:id/like - Like/unlike material
router.post('/materials/:id/like', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    
    try {
        const { id } = req.params;
        const { userId, like = true } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                message: 'User ID is required' 
            });
        }

        const docRef = db.collection('materials').doc(id);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ 
                message: 'Material not found' 
            });
        }

        // Update likes count and likedBy array
        await docRef.update({
            likes: FieldValue.increment(like ? 1 : -1),
            likedBy: like ? 
                FieldValue.arrayUnion(userId) : 
                FieldValue.arrayRemove(userId)
        });

        res.json({ 
            success: true,
            message: like ? 'Material liked' : 'Material unliked'
        });
    } catch (error) {
        console.error('Error updating like:', error);
        res.status(500).json({ 
            error: 'Failed to update like',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/materials/:id/bookmark - Bookmark/unbookmark material
router.post('/materials/:id/bookmark', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    
    try {
        const { id } = req.params;
        const { userId, bookmark = true } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                message: 'User ID is required' 
            });
        }

        const docRef = db.collection('materials').doc(id);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ 
                message: 'Material not found' 
            });
        }

        // Update bookmarkedBy array
        await docRef.update({
            bookmarkedBy: bookmark ? 
                FieldValue.arrayUnion(userId) : 
                FieldValue.arrayRemove(userId)
        });

        res.json({ 
            success: true,
            message: bookmark ? 'Material bookmarked' : 'Bookmark removed'
        });
    } catch (error) {
        console.error('Error updating bookmark:', error);
        res.status(500).json({ 
            error: 'Failed to update bookmark',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/materials/:id/click - Track material click
router.post('/materials/:id/click', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    
    try {
        const { id } = req.params;
        const docRef = db.collection('materials').doc(id);

        // Increment click count
        await docRef.update({
            clicks: FieldValue.increment(1)
        });

        res.json({ 
            success: true,
            message: 'Click tracked'
        });
    } catch (error) {
        console.error('Error tracking click:', error);
        // Don't fail the request - just return success anyway
        res.json({ 
            success: false,
            error: 'Failed to track click'
        });
    }
});

// POST /api/materials/:id/report - Report material
router.post('/materials/:id/report', ensureDb, async (req, res) => {
    const { db, FieldValue } = req.app.locals;
    
    try {
        const { id } = req.params;
        const { reason = 'No reason provided' } = req.body;

        const docRef = db.collection('materials').doc(id);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ 
                message: 'Material not found' 
            });
        }

        // Update report count and store last report info
        await docRef.update({
            reports: FieldValue.increment(1),
            lastReportReason: reason.trim(),
            lastReportedAt: FieldValue.serverTimestamp()
        });

        res.json({ 
            success: true,
            message: 'Report submitted successfully'
        });
    } catch (error) {
        console.error('Error reporting material:', error);
        res.status(500).json({ 
            error: 'Failed to submit report',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;