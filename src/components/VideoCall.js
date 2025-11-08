import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const JITSI_DOMAIN = "meet.jit.si";   // free public Jitsi server

export default function VideoCall() {
  const { groupId } = useParams();     // <-- this becomes the room name
  const { currentUser } = useAuth();
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  // load the Jitsi script once
  useEffect(() => {
    const addScript = () =>
      new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) return resolve();
        const s = document.createElement("script");
        s.src = `https://${JITSI_DOMAIN}/external_api.js`;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });

    addScript().then(() => {
      // create the meeting
      const userName =
        currentUser?.displayName || currentUser?.email || "Student";

      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        parentNode: containerRef.current,
        roomName: groupId,                   // <<< room = groupId
        width: "100%",
        height: 600,
        userInfo: { displayName: userName },
        interfaceConfigOverwrite: {
          TILE_VIEW_MAX_COLUMNS: 4,
        },
        configOverwrite: {
          prejoinPageEnabled: true,         // nice pre-join screen
        },
      });

      // example: mute on join (optional)
      // apiRef.current.executeCommand("toggleVideo");
      // apiRef.current.executeCommand("toggleAudio");
    });

    return () => {
      try { apiRef.current?.dispose(); } catch {}
    };
  }, [groupId, currentUser]);

  return (
    <div className="page-container">
      <h2>📹 Group Call</h2>
      <p style={{marginTop: -6}}>Room: <code>{groupId}</code></p>
      <div ref={containerRef} />
    </div>
  );
}
