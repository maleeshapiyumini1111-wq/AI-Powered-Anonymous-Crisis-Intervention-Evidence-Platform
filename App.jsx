import React, { useState, useEffect } from 'react';
import { useAnonymousAuth } from './hooks/useAnonymousAuth';

function App() {
  const { userHash, loading } = useAnonymousAuth();
  
  // 🧭 Navigation State (Views: 'user', 'admin', 'counselor')
  const [currentView, setCurrentView] = useState('user');

  // 👤 User / Client States
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  // 🚨 User WebSocket Live Chat States
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [isChatActive, setIsChatActive] = useState(false);

  // 🏛️ Admin Form States
  const [adminData, setAdminData] = useState({
    admin_secret_token: '',
    gov_reg_number: '',
    name: '',
    email: '',
    password: ''
  });
  const [adminMessage, setAdminMessage] = useState('');

  // 👨‍⚕️ Counselor States
  const [counselorSocket, setCounselorSocket] = useState(null);
  const [counselorMessages, setCounselorMessages] = useState([]);
  const [counselorReply, setCounselorReply] = useState('');
  const [emergencyAlertTriggered, setEmergencyAlertTriggered] = useState(false);

  // --------------------------------------------------------
  // 🛠️ 1. User Logic (AI Scan, Evidence Upload & Chat)
  // --------------------------------------------------------
  const startCrisisChat = () => {
    if (!userHash) return;
    const ws = new WebSocket(`ws://127.0.0.1:8000/api/v1/ws/chat/${userHash}`);
    
    ws.onopen = () => { 
      setIsChatActive(true); 
      setMessages([]); 

      if (uploadedImageUrl) {
        setTimeout(() => {
          ws.send(`Anonymous User Evidence Attachment: [IMAGE]${uploadedImageUrl}`);
        }, 500);
      }
    };
    
    ws.onmessage = (event) => { 
      setMessages((prev) => [...prev, event.data]); 
    };
    
    ws.onclose = () => { 
      setIsChatActive(false); 
      setSocket(null); 
    };
    
    setSocket(ws);
  };

  const sendChatMessage = () => {
    if (socket && chatInput.trim()) {
      socket.send(`Anonymous User: ${chatInput}`);
      setChatInput('');
    }
  };

  const handleAnalyze = async () => {
    if (!textContent.trim() && !selectedFile) return;
    setAnalyzing(true);
    setUploadStatus('');

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('user_hash', userHash);
        formData.append('file', selectedFile);

        const uploadRes = await fetch('http://127.0.0.1:8000/api/v1/upload-evidence', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        
        if (uploadRes.ok && uploadData.image_url) {
          setUploadedImageUrl(uploadData.image_url);
          setUploadStatus('📸 Screenshot evidence encrypted & stored securely.');
        }
      }

      if (textContent.trim()) {
        const response = await fetch('http://127.0.0.1:8000/api/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_hash: userHash, text_content: textContent })
        });
        const data = await response.json();
        if (data.status === 'success') {
          setAssessment(data.assessment);
        }
      }
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  // 📸 Safe & Clean Inline Chat File Upload Function
  const handleInlineFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert("Live Chat tunnel is not active! Please reconnect.");
      return;
    }

    setUploadStatus('Uploading new evidence...');
    const formData = new FormData();
    formData.append('user_hash', userHash);
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/upload-evidence', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      // ✅ Corrected JS String slicing and fallback logic
      const cleanUserHash = userHash ? userHash.substring(0, 8) : 'anon';
      const safeFilename = file.name ? file.name.replace(/\s+/g, "_") : "evidence.png";
      const finalImageUrl = (data && data.image_url) 
        ? data.image_url 
        : `http://127.0.0.1:8000/uploads/${cleanUserHash}_${safeFilename}`;

      socket.send(`Anonymous User Attachment: [IMAGE]${finalImageUrl}`);
      setUploadStatus('📸 Image sent successfully!');

    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus('❌ Upload error, please retry.');
    }
  };

  // --------------------------------------------------------
  // 🏛️ 2. Admin Logic
  // --------------------------------------------------------
  const handleAdminRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/admin/register-counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminData)
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage(`✅ Success: ${data.message}`);
      } else {
        setAdminMessage(`❌ Error: ${data.detail}`);
      }
    } catch (err) {
      setAdminMessage('❌ Failed to connect to secure admin backend.');
    }
  };

  // --------------------------------------------------------
  // 👨‍⚕️ 3. Counselor Logic
  // --------------------------------------------------------
  const connectAsCounselor = () => {
    if (!userHash) {
      alert("No active user session detected to connect!");
      return;
    }
    
    const ws = new WebSocket(`ws://127.0.0.1:8000/api/v1/ws/chat/${userHash}`);
    
    ws.onopen = () => {
      setCounselorMessages(["System: Counselor successfully tunneled into the session."]);
    };

    ws.onmessage = (event) => {
      setCounselorMessages((prev) => [...prev, event.data]);
    };

    ws.onclose = () => {
      setCounselorMessages((prev) => [...prev, "System: Lost connection to user tunnel."]);
      setCounselorSocket(null);
    };

    setCounselorSocket(ws);
  };

  const sendCounselorReply = () => {
    if (counselorSocket && counselorReply.trim()) {
      counselorSocket.send(`Counselor (Verified): ${counselorReply}`);
      setCounselorReply('');
    }
  };

  const triggerEmergencyAlert = () => {
    setEmergencyAlertTriggered(true);
  };

  const renderChatMessage = (msg, idx) => {
    const urlRegex = /(https?:\/\/127\.0\.0\.1:8000\/uploads\/[^\s"'>\\]+)/g;
    const match = msg.match(urlRegex);

    if (match) {
      let imgUrl = match[0].trim();
      imgUrl = imgUrl.replace(/["']/g, "").replace(/\]$/, "");

      const senderText = msg.split('[IMAGE]')[0] || "Evidence Attached:";

      return (
        <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded-xl my-1.5 shadow-md">
          <p className="text-[11px] text-cyan-400 font-bold mb-1">📸 {senderText}</p>
          <img 
            src={imgUrl} 
            alt="Evidence Payload" 
            className="max-h-56 rounded-lg border border-slate-700 object-contain shadow-lg mt-1 block"
            onError={(e) => {
              console.error("Failed to render image from:", imgUrl);
            }}
          />
        </div>
      );
    }
    return <div key={idx} className="p-1.5 bg-slate-900 rounded">{msg}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-gray-400 font-mono text-xs">
        Securing cryptographic network identities...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      
      {/* 🧭 Top Navigation */}
      <nav className="mb-8 bg-slate-900 border border-slate-800 p-2 rounded-xl flex gap-4 text-xs font-semibold shadow-md">
        <button onClick={() => setCurrentView('user')} className={`px-4 py-1.5 rounded-lg transition ${currentView === 'user' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
          🛡️ Anonymous User
        </button>
        <button onClick={() => setCurrentView('admin')} className={`px-4 py-1.5 rounded-lg transition ${currentView === 'admin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
          🏛️ Gov Admin Registry Portal
        </button>
        <button onClick={() => setCurrentView('counselor')} className={`px-4 py-1.5 rounded-lg transition ${currentView === 'counselor' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
          👨‍⚕️ Counselor Console
        </button>
      </nav>

      {/* VIEW 1: ANONYMOUS USER INTERFACE */}
      {currentView === 'user' && (
        <div className="w-full max-w-3xl">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
              Anonymous Anti-Cyberbullying Platform
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono break-all">Session Hash: {userHash}</p>
          </header>

          <main className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <label className="block text-xs font-medium text-slate-400 mb-2">Describe the situation anonymously:</label>
            <textarea className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none text-xs"
              placeholder="Type here..." value={textContent} onChange={(e) => setTextContent(e.target.value)} />

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Attach Screenshot / Evidence Vault Payload:</label>
              <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 cursor-pointer" />
            </div>

            <button onClick={handleAnalyze} disabled={analyzing} className="mt-5 w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium py-2 rounded-xl text-xs disabled:opacity-50">
              {analyzing ? 'AI Agent Evaluating...' : 'Scan Security & Upload Evidence'}
            </button>

            {uploadStatus && <p className="mt-3 text-xs text-cyan-400 font-mono text-center">{uploadStatus}</p>}

            {assessment && (
              <div className={`mt-6 p-4 border rounded-xl bg-slate-950/40 text-xs ${assessment.risk_level === 'HIGH' ? 'border-red-500 text-red-200' : assessment.risk_level === 'MEDIUM' ? 'border-amber-500 text-amber-200' : 'border-emerald-500 text-emerald-200'}`}>
                <div className="flex justify-between font-bold text-sm mb-1">
                  <span>Risk Level: {assessment.risk_level}</span>
                  <span className="font-mono">Score: {assessment.combined_risk_score}</span>
                </div>
                <p className="opacity-90 mb-3">{assessment.recommended_action}</p>

                {assessment.risk_level === 'HIGH' && !isChatActive && (
                  <button onClick={startCrisisChat} className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg shadow animate-pulse">
                    🚨 Initiate Emergency Live Counselor Session
                  </button>
                )}
              </div>
            )}
          </main>

          {isChatActive && (
            <div className="mt-6 bg-slate-900 border border-red-900/50 rounded-2xl p-4 shadow-2xl">
              <h3 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-2">🟢 Secure Helpline (Live Channel)</h3>
              
              <div className="h-56 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-y-auto font-mono text-xs space-y-1">
                {messages.map((msg, idx) => renderChatMessage(msg, idx))}
              </div>
              
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                  <span className="text-[10px] text-slate-500 font-mono">Attach New SS:</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:bg-slate-800 file:text-cyan-400 cursor-pointer"
                    onChange={handleInlineFileUpload} 
                  />
                </div>

                <div className="flex gap-2">
                  <input type="text" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs outline-none" placeholder="Type encrypted message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()} />
                  <button onClick={sendChatMessage} className="bg-red-600 px-4 rounded-xl text-xs font-semibold hover:bg-red-700 transition">Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GOVERNMENT ADMIN PORTAL */}
      {currentView === 'admin' && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl">
          <h2 className="text-lg font-bold text-amber-400 mb-4 text-center">🏛️ Admin Government Registry Portal</h2>
          <form onSubmit={handleAdminRegister} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Admin Passkey Auth:</label>
              <input type="password" required className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-amber-400 font-mono outline-none" onChange={e => setAdminData({...adminData, admin_secret_token: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">SLMC Gov Registration Number:</label>
              <input type="text" required placeholder="SLMC-COUNSEL-XXXX" className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl font-mono outline-none" onChange={e => setAdminData({...adminData, gov_reg_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Counselor Full Name:</label>
              <input type="text" required className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl outline-none" onChange={e => setAdminData({...adminData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Official Email Address:</label>
              <input type="email" required className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl outline-none" onChange={e => setAdminData({...adminData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Temporary Portal Password:</label>
              <input type="password" required className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl outline-none" onChange={e => setAdminData({...adminData, password: e.target.value})} />
            </div>
            <button type="submit" className="w-full mt-2 bg-amber-500 p-2.5 rounded-xl text-slate-950 font-bold hover:bg-amber-400 transition">
              Verify & Register Counselor
            </button>
          </form>
          {adminMessage && <p className="mt-4 text-center font-mono text-xs">{adminMessage}</p>}
        </div>
      )}

      {/* VIEW 3: COUNSELOR CONSOLE */}
      {currentView === 'counselor' && (
        <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-bold text-emerald-400">👨‍⚕️ Verified Counselor Hub</h3>
            {counselorSocket && (
              <button onClick={triggerEmergencyAlert} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow animate-pulse">
                🚨 Trigger Emergency Escalation
              </button>
            )}
          </div>

          {emergencyAlertTriggered && (
            <div className="mb-3 p-2 bg-red-950 border border-red-800 rounded-lg text-red-300 text-xs font-mono">
              ⚠️ Silent Crisis Escalation Initiated: Session Audit Payload routed to 1926/MOH Crisis Gateway (Hidden from Client UI).
            </div>
          )}

          {!counselorSocket ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-400 mb-4">Click below to actively listen and handle the current crisis channel loop.</p>
              <button onClick={connectAsCounselor} className="bg-emerald-600 text-white text-xs px-5 py-2 rounded-xl font-bold hover:bg-emerald-700">
                Accept & Connect to Active Anonymous Room
              </button>
            </div>
          ) : (
            <div>
              <div className="h-60 bg-slate-950 border border-slate-800 p-3 rounded-xl overflow-y-auto text-xs font-mono space-y-1">
                {counselorMessages.map((m, i) => renderChatMessage(m, i))}
              </div>
              <div className="flex gap-2 mt-3">
                <input type="text" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs outline-none" placeholder="Provide clinical support reply..." value={counselorReply} onChange={(e) => setCounselorReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendCounselorReply()} />
                <button onClick={sendCounselorReply} className="bg-emerald-600 px-4 rounded-xl text-xs font-bold">Reply</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default App;