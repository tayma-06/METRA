// src/components/CallRoom.js
import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = 'http://localhost:8000';

export default function CallRoom() {
  const { groupId } = useParams();
  const { currentUser } = useAuth();
  const jitsiRef = useRef(null);
  const navigate = useNavigate();

  // callId strategy: room-per-group (callId = groupId)
  const callId = groupId;

  useEffect(() => {
    // Log "join"
    (async () => {
      try {
        await fetch(`${BACKEND_URL}/api/study-groups/${groupId}/call/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Me'
          })
        });
      } catch (e) {}
    })();

    // Jitsi Embed
    const domain = 'meet.jit.si';
    const options = {
      roomName: callId,
      parentNode: jitsiRef.current,
      userInfo: { displayName: currentUser.displayName || 'Me' }
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    // optional: leave handler
    const cleanup = async () => {
      try {
        await fetch(`${BACKEND_URL}/api/study-groups/${groupId}/call/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId })
        });
      } catch (e) {}
    };

    api.addListener('readyToClose', async () => {
      await cleanup();
      navigate(`/groups/${groupId}`);
    });

    return () => {
      api.dispose?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return (
    <div className="page-container">
      <h2>Group Call</h2>
      {/* Jitsi container */}
      <div ref={jitsiRef} style={{ height: '80vh', width: '100%', background:'#000' }} />
    </div>
  );
}
