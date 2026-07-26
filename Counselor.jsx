import React, { useState, useEffect } from 'react';

export default function Counselor({ activeUserHash }) {
  const [messages, setMessages] = useState([]);
  const [replyInput, setReplyInput] = useState('');
  const [socket, setSocket] = useState(null);

  const connectToUser = () => {
    if (!activeUserHash) return;
    
    // Counselor connects to the same User Hash WebSocket room
    const ws = new WebSocket(`ws://127.0.0.1:8000/api/v1/ws/chat/${activeUserHash}`);
    
    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    setSocket(ws);
  };

  const sendReply = () => {
    if (socket && replyInput.trim()) {
      socket.send(`Counselor (Verified): ${replyInput}`);
      setReplyInput('');
    }
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/50 p-4 rounded-xl text-slate-100 max-w-3xl mt-6">
      <h3 className="text-md font-bold text-emerald-400 mb-2">
        👨‍⚕️ Counselor Portal - Active Helpline Room
      </h3>

      {!socket ? (
        <button
          onClick={connectToUser}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg"
        >
          Accept & Connect to User Session ({activeUserHash?.substring(0, 8)}...)
        </button>
      ) : (
        <div>
          <div className="h-40 bg-slate-950 p-3 rounded-lg overflow-y-auto text-xs font-mono space-y-2 mb-3">
            {messages.map((m, i) => (
              <div key={i} className="p-1.5 bg-slate-900 rounded border border-slate-800">
                {m}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              placeholder="Type support response..."
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
            />
            <button
              onClick={sendReply}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded-lg"
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}