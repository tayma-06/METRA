import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import {
  collection, doc, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import ProfileAchievements from './ProfileAchievements'; // ✅ NEW: import

const BACKEND_URL = 'http://localhost:8000';

// ---------- helpers ----------
const formatTime = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (b = 0) => {
  if (!b) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const isImageMime = (m) => /^image\//.test(m || '');

const Ticks = ({ msg, me }) => {
  if (!msg || msg.authorId !== me) return null;
  const seen = Array.isArray(msg.readBy) && msg.readBy.length > 0;
  const delivered = Array.isArray(msg.deliveredTo) && msg.deliveredTo.length > 0;

  const base = { fontSize: 12, marginLeft: 6, userSelect: 'none' };
  const seenNames = (msg.readByNames || []).join(', ');
  const delNames  = (msg.deliveredToNames || []).join(', ');

  if (seen) {
    return (
      <span
        style={{ ...base, color: '#1b74e4' }}
        title={seenNames ? `Seen by: ${seenNames}` : 'Seen'}
      >
        ✓✓
      </span>
    );
  }
  if (delivered) {
    return (
      <span
        style={{ ...base, color: '#9aa0a6' }}
        title={delNames ? `Delivered to: ${delNames}` : 'Delivered'}
      >
        ✓✓
      </span>
    );
  }
  return <span style={{ ...base, color: '#9aa0a6' }} title="Sent">✓</span>;
};

// =======================================================
function StudyGroupChat() {
  const { groupId } = useParams();
  const { currentUser } = useAuth();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingNames, setTypingNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);

  const [uploadPct, setUploadPct] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ---------- fetch group once ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/study-groups/${groupId}`);
        if (!res.ok) throw new Error('Group not found.');
        const data = await res.json();
        if (mounted) setGroup(data);
      } catch (e) {
        setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [groupId]);

  // ---------- realtime messages ----------
  useEffect(() => {
    const messagesRef = collection(db, 'study_groups', groupId, 'messages');
    const qy = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(qy, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => {
      setError('Failed to load messages.');
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  // ---------- typing realtime ----------
  useEffect(() => {
    const typingDoc = doc(db, 'study_groups', groupId, 'meta', 'typing');
    const unsub = onSnapshot(typingDoc, (d) => {
      const data = d.data() || {};
      const others = Object.entries(data)
        .filter(([uid]) => uid !== currentUser?.uid)
        .map(([, name]) => name);
      setTypingNames(others);
    }, () => setTypingNames([]));
    return () => unsub();
  }, [groupId, currentUser?.uid]);

  // ---------- autoscroll ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------- mark messages seen ----------
  useEffect(() => {
    if (!currentUser) return;
    const me = currentUser.uid;
    messages.forEach((m) => {
      if (m.authorId === me) return;
      const alreadyRead = Array.isArray(m.readBy) && m.readBy.includes(me);
      if (!alreadyRead) {
        fetch(`${BACKEND_URL}/api/study-groups/${groupId}/messages/${m.id}/seen`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: me }),
        }).catch(() => {});
      }
    });
  }, [messages, groupId, currentUser]);

  // ---------- send text ----------
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (recording || isUploading) return;
    const text = newMessage.trim();
    if (!text) return;
    try {
      await fetch(`${BACKEND_URL}/api/study-groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || 'Me',
          kind: 'text'
        }),
      });
      setNewMessage('');
      // stop typing
      fetch(`${BACKEND_URL}/api/study-groups/${groupId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, isTyping: false }),
      }).catch(() => {});
    } catch {
      setError('Failed to send message.');
    }
  };

  // ---------- typing indicator ----------
  const sendTyping = useCallback((isTyping) => {
    if (!currentUser) return;
    fetch(`${BACKEND_URL}/api/study-groups/${groupId}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Someone',
        isTyping,
      }),
    }).catch(() => {});
  }, [groupId, currentUser]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    sendTyping(val.length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (currentUser) sendTyping(false);
    };
  }, [currentUser, sendTyping]);

  // ======================================================
  //                       FILE UPLOAD
  // ======================================================
  const onPickFile = () => fileInputRef.current?.click();

  const uploadFile = async (file, meta = {}) => {
    // 1) upload with progress
    setIsUploading(true);
    setUploadPct(0);
    const path = `study_groups/${groupId}/messages/${currentUser.uid}/${Date.now()}_${file.name}`;
    const r = ref(storage, path);
    const task = uploadBytesResumable(r, file);

    await new Promise((resolve, reject) => {
      task.on('state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadPct(pct);
        },
        (err) => reject(err),
        () => resolve()
      );
    });

    const url = await getDownloadURL(task.snapshot.ref);

    // 2) send message with fileUrl
    await fetch(`${BACKEND_URL}/api/study-groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: meta.caption || '',
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Me',
        kind: meta.kind || 'file',
        fileUrl: url,
        fileName: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        isImage: isImageMime(file.type)
      }),
    });

    setIsUploading(false);
    setUploadPct(0);
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file, { kind: isImageMime(file.type) ? 'image' : 'file' });
    } catch {
      setError('Upload failed.');
    } finally {
      e.target.value = '';
    }
  };

  // Drag & drop upload
  const onDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file, { kind: isImageMime(file.type) ? 'image' : 'file' });
    } catch {
      setError('Upload failed.');
    }
  };

  const onDragOver = (e) => e.preventDefault();

  // Paste image from clipboard
  const onPaste = async (e) => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.kind === 'file');
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    try {
      await uploadFile(file, { kind: isImageMime(file.type) ? 'image' : 'file' });
    } catch {
      setError('Upload failed.');
    }
  };

  // ======================================================
  //                       VOICE NOTE
  // ======================================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data.size) audioChunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // reuse upload flow
        try {
          await uploadFile(new File([blob], 'voice-note.webm', { type: 'audio/webm' }), {
            kind: 'audio'
          });
        } catch {
          setError('Voice upload failed.');
        }
        setRecordSec(0);
      };
      mediaRecorderRef.current = mr;
      mr.start(100);
      setRecording(true);
      recordIntervalRef.current = setInterval(() => setRecordSec(s => s + 1), 1000);
    } catch {
      setError('Microphone permission denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
  };

  // ---------- render ----------
  if (loading && !group) return <div className="page-container"><p>Loading chat...</p></div>;
  if (error) return <div className="page-container"><p style={{color: 'red'}}>{error}</p></div>;

  const me = currentUser?.uid;

  return (
    <div
      className="page-container chat-page-container"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
    >
      <div className="chat-header" style={{ marginBottom: 8, display:'flex', alignItems:'center', gap:12 }}>
        <Link to="/groups" style={{ textDecoration: 'none', color: '#007aff' }}>
          &larr; Back to Groups
        </Link>
        <div style={{ flex:1 }}>
          <h2 style={{ margin: '8px 0 0' }}>{group?.name}</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>{group?.description}</p>
        </div>
        <Link
          to={`/groups/${groupId}/call`}
          style={{ background:'#10b981', color:'#fff', padding:'8px 12px', borderRadius:8, textDecoration:'none' }}
          title="Start a video call"
        >
          📹 Call
        </Link>
      </div>

      {/* ✅ NEW: Members' Skills & Achievements section */}
      {group?.memberIds && group.memberIds.length > 0 && (
        <div
          className="group-members-achievements"
          style={{
            margin: '1rem 0',
            background: '#f4f7f6',
            borderRadius: 12,
            padding: '1rem'
          }}
        >
          <h3 style={{ marginTop: 0 }}>🏆 Members&apos; Skills &amp; Achievements</h3>

          {/* current user overview (you can keep or remove this line) */}
          {currentUser && (
            <div style={{ marginBottom: 8 }}>
              <ProfileAchievements userId={currentUser.uid} />
            </div>
          )}

          {/* optional: small badges per member, clickable */}
          <div
            className="group-member-badges"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 4
            }}
          >
            {group.memberIds.map((uid) => (
              <Link
                key={uid}
                to={`/profile/${uid}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    background: '#e6f2ff',
                    borderRadius: 8,
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#007aff',
                    display: 'inline-block'
                  }}
                >
                  {/* assume ProfileAchievements renders small badges; if not, you can customize later */}
                  <ProfileAchievements userId={uid} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m) => {
          const mine = m.authorId === me;

          const textColor = '#111827'; // black-ish text

          const bubble = (
            <div
              className="bubble"
              style={{
                maxWidth: '68%',
                padding: '10px 12px',
                borderRadius: 16,
                background: mine ? '#e7f3ff' : '#f4f4f5',
                boxShadow: '0 1px 2px rgba(0,0,0,.06)',
                borderTopRightRadius: mine ? 6 : 16,
                borderTopLeftRadius: mine ? 16 : 6,
                color: textColor
              }}
            >
              {!mine && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  {m.authorName || 'Someone'}
                </div>
              )}

              {/* ---- content renderer ---- */}
              {m.kind === 'audio' ? (
                <audio controls src={m.fileUrl} style={{ width: '100%' }} />
              ) : m.kind === 'image' ? (
                <a href={m.fileUrl} target="_blank" rel="noreferrer">
                  <img
                    src={m.fileUrl}
                    alt={m.fileName || 'image'}
                    style={{ maxWidth: '100%', borderRadius: 8 }}
                  />
                </a>
              ) : m.kind === 'file' ? (
                <div>
                  <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{ color:'#0b5fff', wordBreak:'break-all' }}>
                    📎 {m.fileName || 'Attachment'} {m.sizeBytes ? `• ${formatBytes(m.sizeBytes)}` : ''}
                  </a>
                  {m.text ? <div style={{ marginTop:6 }}>{m.text}</div> : null}
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.text}
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4, fontSize:12, color:'#6b7280' }}>
                <span>{formatTime(m.createdAt)}</span>
                <Ticks msg={m} me={me} />
              </div>
            </div>
          );

          return (
            <div
              key={m.id}
              className={`chat-message ${mine ? 'own-message' : ''}`}
              style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}
            >
              {bubble}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {typingNames.length > 0 && (
        <div className="typing-indicator" style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
          {typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing…
        </div>
      )}

      {/* upload progress */}
      {isUploading && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, background:'#e5e7eb', borderRadius: 6, overflow:'hidden' }}>
            <div
              style={{
                width: `${uploadPct}%`,
                height: '100%',
                background: '#0b5fff',
                transition: 'width .2s ease'
              }}
            />
          </div>
          <div style={{ fontSize: 12, color:'#6b7280', marginTop: 4 }}>{uploadPct}%</div>
        </div>
      )}

      {/* ----- Composer with attach & mic ----- */}
      <form
        className="chat-form"
        onSubmit={handleSendMessage}
        style={{ display:'flex', gap:8, marginTop:12, alignItems:'center' }}
      >
        <button type="button" onClick={onPickFile} title="Attach a file" style={{ padding:'8px 10px' }}>
          📎
        </button>
        <input ref={fileInputRef} type="file" onChange={onFileChosen} hidden />

        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            title="Record voice note"
            style={{ padding:'8px 10px' }}
            disabled={isUploading}
          >
            🎙️
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            title="Stop"
            style={{ padding:'8px 10px', background:'#ef4444', color:'#fff' }}
          >
            ⏹ {String(Math.floor(recordSec/60)).padStart(2,'0')}:{String(recordSec%60).padStart(2,'0')}
          </button>
        )}

        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message… (paste/drag files to upload)"
          onBlur={() => sendTyping(false)}
          style={{ flex: 1 }}
          disabled={isUploading}
        />
        <button type="submit" disabled={recording || isUploading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default StudyGroupChat;
