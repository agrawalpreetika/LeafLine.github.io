import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Phone, MapPin, Activity, AlertCircle, Loader2, CheckCircle2, Bell } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { addToWatchlist } from '../lib/firestore'; // Assuming we can import this, or navigate to dashboard to handle it
import { useAuth } from '../context/AuthContext'; // Import auth context

const Chatbot = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Get current user for Notify Me functionality
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Initial State
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! How can I help you today?",
      sender: 'bot',
      actions: [
        { label: 'Emergency Help 🚨', value: 'Emergency Help' },
        { label: 'Check Eligibility ✅', value: 'Check Eligibility' },
        { label: 'Find Camps 📍', value: 'Find Camps' }
      ]
    }
  ]);

  const [inputValue, setInputValue] = useState("");
  const [chatMode, setChatMode] = useState('normal'); // 'normal' | 'emergency'
  const [emergencyData, setEmergencyData] = useState({ bloodGroup: '', city: '' });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const QUICK_ACTIONS = [
    { label: 'Emergency Help 🚨', value: 'Emergency Help' },
    { label: 'Check Eligibility ✅', value: 'Check Eligibility' },
    { label: 'Find Camps 📍', value: 'Find Camps' }
  ];

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const processBotResponse = async (userText) => {
    setIsTyping(true);
    const lowerText = userText.toLowerCase();

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000));

    let botResponseText = "";
    let nextActions = null;
    let donorsFound = null;
    let shouldRedirect = null;

    // --- Emergency Flow Logic ---

    // Step A: Detect Panic / Start Emergency
    if (chatMode === 'normal' && (lowerText.includes("urgent") || lowerText.includes("emergency") || lowerText.includes("need blood") || lowerText.includes("help"))) {
      setChatMode("emergency");
      botResponseText = "🚨 I’m here to help. Please select the required blood group below.";
      nextActions = BLOOD_GROUPS.map(bg => ({ label: bg, value: bg }));
    }
    // Step B: Capture Blood Group -> Ask City
    else if (chatMode === "emergency" && !emergencyData.bloodGroup) {
      const bg = userText.toUpperCase();
      // Basic validation
      if (BLOOD_GROUPS.includes(bg)) {
        setEmergencyData(prev => ({ ...prev, bloodGroup: bg }));
        botResponseText = `Got it (${bg}). Please tell me your city or location to find nearby donors.`;
      } else {
        botResponseText = "Please select a valid blood group from the options.";
        nextActions = BLOOD_GROUPS.map(b => ({ label: b, value: b }));
      }
    }
    // Step C: Capture City -> Search
    else if (chatMode === "emergency" && emergencyData.bloodGroup && !emergencyData.city) {
      const cityInput = userText.trim();
      const city = cityInput.charAt(0).toUpperCase() + cityInput.slice(1).toLowerCase();

      setEmergencyData(prev => ({ ...prev, city: city }));

      // Show "Searching..." temporary status
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Searching for heroes in ${city}...`,
        sender: 'bot',
        isSystem: true
      }]);

      try {
        // Real Firestore Query - Filter only by Blood Group first
        const q = query(
          collection(db, "users"),
          where("isDonor", "==", true),
          where("isEligible", "==", true),
          where("donorProfile.bloodType", "==", emergencyData.bloodGroup)
        );

        const querySnapshot = await getDocs(q);
        const allDonors = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.donorProfile) {
            allDonors.push({
              id: doc.id,
              name: data.name || "Anonymous Hero",
              phone: data.donorProfile.phone || "N/A",
              bloodType: data.donorProfile.bloodType,
              city: data.donorProfile.city || ""
            });
          }
        });

        // Client-side filtering for fuzzy city match
        const matchedDonors = allDonors.filter(donor =>
          donor.city.toLowerCase().includes(city.toLowerCase())
        );

        if (matchedDonors.length > 0) {
          botResponseText = `Found ${matchedDonors.length} potential donor(s) matching "${city}"!`;
          donorsFound = matchedDonors.slice(0, 3); // Top 3
          shouldRedirect = '/search';
        } else {
          botResponseText = `I couldn't find any registered donors for ${emergencyData.bloodGroup} in "${city}" right now.`;
          // Add Notify Me action
          nextActions = [{ label: 'Notify Me When Available 🔔', value: 'Notify Me' }];
        }

      } catch (error) {
        console.error("Error searching donors:", error);
        botResponseText = "Sorry, I encountered an error while searching. Please try again later.";
      }

      // Reset Mode (but keep data if needed for Notify Me logic in next step, strictly speaking we reset here for simplicity)
      // If user clicks Notify Me, we need the data. Let's store it in a temp state or handle 'Notify Me' specially.
      // For now, we reset, and 'Notify Me' value will trigger a specific handler.
      setChatMode("normal");
      // setEmergencyData({ bloodGroup: '', city: '' }); // Keep data for Notify Me context if clicked immediately
    }
    // Step D: Handle Notify Me
    else if (userText === 'Notify Me' || userText.includes('Notify Me')) {
      if (!currentUser) {
        botResponseText = "You need to be logged in to set alerts. Redirecting you to login...";
        shouldRedirect = '/login';
      } else if (emergencyData.bloodGroup && emergencyData.city) {
        botResponseText = `Setting up an alert for ${emergencyData.bloodGroup} in ${emergencyData.city}... Redirecting to your dashboard.`;
        shouldRedirect = '/dashboard';
        // In a real app, we might call addToWatchlist here directly, 
        // but navigating to dashboard/search allows user to verify and see the list.
        // Let's actually navigate to Search page with query params if possible, 
        // or just Dashboard where they can manage it.
        // For better UX, let's just say we are redirecting them to the Search page 
        // where they can click the big "Notify Me" button we built earlier.
        botResponseText = "Redirecting to the Search page. Please click the 'Notify Me' button there to confirm your alert.";
        shouldRedirect = '/search';
      } else {
        botResponseText = "I don't have the details to set an alert. Please try the Emergency Help flow again.";
        nextActions = QUICK_ACTIONS;
      }
      // Clean up
      setEmergencyData({ bloodGroup: '', city: '' });
    }
    // --- Normal Flow Logic ---
    else {
      if (lowerText.includes('hello') || lowerText.includes('hi')) {
        botResponseText = "Hello! I'm here to assist. You can use the buttons below for quick actions.";
        nextActions = QUICK_ACTIONS;
      } else if (lowerText.includes('eligible') || lowerText.includes('eligibility')) {
        botResponseText = "To be eligible: 18-65 years old, >50kg weight, healthy. I'm redirecting you to the eligibility quiz.";
        shouldRedirect = '/dashboard';
      } else if (lowerText.includes('donate') || lowerText.includes('donation')) {
        botResponseText = "You can donate by finding a nearby camp. Redirecting you to the camps locator.";
        shouldRedirect = '/camps';
      } else if (lowerText.includes('camp') || lowerText.includes('location')) {
        botResponseText = "Searching for donation camps... Redirecting you to the map.";
        shouldRedirect = '/camps';
      } else {
        botResponseText = "I'm not sure I understand. Would you like Emergency Help?";
        nextActions = QUICK_ACTIONS;
      }
    }

    setIsTyping(false);

    // Add Bot Message
    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      text: botResponseText,
      sender: 'bot',
      actions: nextActions,
      donors: donorsFound
    }]);

    // Handle Redirects
    if (shouldRedirect) {
      setTimeout(() => {
        navigate(shouldRedirect);
      }, 3500); // Give user time to read/act on donors
    }
  };

  const handleSend = (textOverride = null) => {
    const text = textOverride || inputValue;
    if (!text.trim()) return;

    // Add User Message
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: text,
      sender: 'user'
    }]);
    setInputValue("");

    // Trigger Bot Processing
    processBotResponse(text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 h-[550px] flex flex-col mb-4 border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex justify-between items-center text-white shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-full">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">LifeLine Assistant</h3>
                <p className="text-xs text-red-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4 scroll-smooth">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Message Bubble */}
                {!msg.isSystem && (
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm relative animate-in zoom-in-95 duration-200 ${msg.sender === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                      }`}
                  >
                    {msg.text}
                  </div>
                )}

                {/* System Message (Searching...) */}
                {msg.isSystem && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 my-2 px-2 animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    {msg.text}
                  </div>
                )}

                {/* Visual Donor Cards */}
                {msg.donors && msg.donors.length > 0 && (
                  <div className="mt-3 grid gap-2 w-[90%]">
                    {msg.donors.map((donor, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-center justify-between animate-in slide-in-from-left-2 fade-in duration-300" style={{ animationDelay: `${idx * 150}ms` }}>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                            {donor.bloodType}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{donor.name}</p>
                            <p className="text-[10px] text-slate-500">{donor.city}</p>
                          </div>
                        </div>
                        {donor.phone && donor.phone !== "N/A" && (
                          <a href={`tel:${donor.phone}`} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors">
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => navigate('/search')}
                      className="mt-1 text-xs text-red-600 font-bold hover:underline text-center w-full"
                    >
                      View all on map →
                    </button>
                  </div>
                )}

                {/* Action Buttons (Quick Replies or Chips) */}
                {msg.actions && (
                  <div className="flex flex-wrap gap-2 mt-2 max-w-[90%]">
                    {msg.actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(action.value)}
                        className="bg-white border border-red-100 hover:border-red-300 hover:bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm transition-all duration-200 transform hover:scale-105"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100">
            <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 transition-all">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={chatMode === 'emergency' ? "Type your details..." : "Ask me anything..."}
                className="flex-1 px-3 py-1.5 bg-transparent border-none focus:outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim()}
                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center relative"
        >
          <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
          </span>
        </button>
      )}
    </div>
  );
};

export default Chatbot;
