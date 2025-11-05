import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase'; // Import frontend Firestore
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

// This is the URL of your backend server
const BACKEND_URL = 'http://localhost:8000';

function StudyGroupChat() {
    const { groupId } = useParams(); // Get group ID from URL
    const { currentUser } = useAuth();

    const [group, setGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null); // For auto-scrolling

    // 1. Fetch group details
    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/study-groups/${groupId}`);
                if (!response.ok) {
                    throw new Error('Group not found.');
                }
                const data = await response.json();
                setGroup(data);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchGroupDetails();
    }, [groupId]);

    // 2. Listen for messages in real-time
    useEffect(() => {
        // Path to the subcollection: /study_groups/{groupId}/messages
        const messagesRef = collection(db, "study_groups", groupId, "messages");
        const q = query(messagesRef, orderBy("createdAt"));

        // onSnapshot is the real-time listener
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(msgs);
            setLoading(false);
        }, (err) => {
            console.error("Error listening to messages:", err);
            setError("Failed to load messages.");
            setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
    }, [groupId]);

    // 3. Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 4. Handle sending a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        // We post to the backend, which adds the message to the subcollection
        // (This is more secure and uses our backend logic)
        try {
            const response = await fetch(`${BACKEND_URL}/api/study-groups/${groupId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: newMessage,
                    authorId: currentUser.uid,
                    authorName: currentUser.displayName
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message.');
            }

            setNewMessage(''); // Clear the input box

        } catch (err) {
            console.error(err);
            setError("Failed to send message."); // Show a temp error
        }
    };

    if (loading && !group) return <div className="page-container"><p>Loading chat...</p></div>;
    if (error) return <div className="page-container"><p style={{color: 'red'}}>{error}</p></div>;

    return (
        <div className="page-container chat-page-container">
            <div className="chat-header">
                <Link to="/groups" style={{ textDecoration: 'none', color: '#007aff' }}>&larr; Back to Groups</Link>
                <h2>{group?.name}</h2>
                <p>{group?.description}</p>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.authorId === currentUser.uid ? 'own-message' : ''}`}>
                        <strong>{msg.authorName}</strong>
                        <p>{msg.text}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}

export default StudyGroupChat;