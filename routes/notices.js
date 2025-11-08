// routes/notices.js
// Announcements / Events / Competitions / Notices API
// Firestore collection: "notices"
// Doc shape:
// {
//   title, body, category, link, pinned, startAt, endAt,
//   tags, createdById, createdByName, createdAt
// }

module.exports = function registerNotices(app, { db }) {
  const toInt = (v, d) => (isNaN(parseInt(v, 10)) ? d : parseInt(v, 10));
  const safeStr = (v) => (typeof v === 'string' ? v.trim() : '');
  const nowIso = () => new Date().toISOString();

  // GET /api/notices?category=event|competition|notice&active=true&limit=50
  app.get('/api/notices', async (req, res) => {
    try {
      const { category, active } = req.query;
      const limit = Math.min(toInt(req.query.limit, 50), 200);

      let ref = db.collection('notices');

      if (category) ref = ref.where('category', '==', String(category));
      // sort by pinned first, then startAt desc, then createdAt desc
      // Firestore can't sort mixed; we’ll fetch recent and sort in-memory for simplicity
      const snap = await ref.orderBy('createdAt', 'desc').limit(400).get();
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (active === 'true') {
        const now = Date.now();
        items = items.filter((x) => {
          const s = x.startAt ? Date.parse(x.startAt) : null;
          const e = x.endAt ? Date.parse(x.endAt) : null;
          return (s === null || s <= now) && (e === null || e >= now);
        });
      }

      items.sort((a, b) => {
        // pinned first
        if (!!b.pinned - !!a.pinned !== 0) return (!!b.pinned - !!a.pinned);
        const aStart = a.startAt ? Date.parse(a.startAt) : 0;
        const bStart = b.startAt ? Date.parse(b.startAt) : 0;
        if (bStart !== aStart) return bStart - aStart;
        return (Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
      });

      return res.json({ items: items.slice(0, limit) });
    } catch (e) {
      console.error('GET /api/notices error', e);
      return res.status(500).json({ error: 'Failed to fetch notices' });
    }
  });

  // POST /api/notices  (create)
  // Body: { title, body, category, link?, startAt?, endAt?, tags?[], pinned?, userId, userName }
  app.post('/api/notices', async (req, res) => {
    try {
      const {
        title, body, category, link, startAt, endAt, tags,
        pinned = false, userId, userName
      } = req.body || {};

      // Basic validation
      if (!safeStr(title) || !safeStr(body) || !safeStr(category)) {
        return res.status(400).json({ error: 'title, body, category are required' });
      }
      if (!safeStr(userId)) return res.status(401).json({ error: 'auth required' });

      // (Server-side authorization)
      // TODO: check user role from your auth system / admin claims if you want only admins to post.

      const doc = {
        title: safeStr(title),
        body: safeStr(body),
        category: safeStr(category).toLowerCase(), // event | competition | notice | other
        link: safeStr(link) || null,
        startAt: startAt || null, // ISO 8601 or null
        endAt: endAt || null,
        tags: Array.isArray(tags) ? tags.slice(0, 10).map(safeStr) : [],
        pinned: !!pinned,
        createdById: userId,
        createdByName: safeStr(userName) || 'Staff',
        createdAt: nowIso(),
      };

      const ref = await db.collection('notices').add(doc);
      return res.json({ id: ref.id, ...doc });
    } catch (e) {
      console.error('POST /api/notices error', e);
      return res.status(500).json({ error: 'Failed to create notice' });
    }
  });

  // PATCH /api/notices/:id/pin { pinned: boolean }
  app.patch('/api/notices/:id/pin', async (req, res) => {
    try {
      const { id } = req.params;
      const { pinned } = req.body || {};
      await db.collection('notices').doc(id).update({ pinned: !!pinned });
      return res.json({ ok: true });
    } catch (e) {
      console.error('PATCH /api/notices/:id/pin error', e);
      return res.status(500).json({ error: 'Failed to update pinned state' });
    }
  });

  // (Optional) DELETE /api/notices/:id
  app.delete('/api/notices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection('notices').doc(id).delete();
      return res.json({ ok: true });
    } catch (e) {
      console.error('DELETE /api/notices/:id error', e);
      return res.status(500).json({ error: 'Failed to delete notice' });
    }
  });
};
