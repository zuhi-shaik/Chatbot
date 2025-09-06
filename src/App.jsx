import React, { useState, useEffect, useRef } from "react";
import Navbar from "./Components/Navbar";
import { GoogleGenAI } from "@google/genai";
import { BeatLoader } from "react-spinners";
import Markdown from "react-markdown";
import { IoWarningOutline, IoSend } from "react-icons/io5";
import { MdOutlineAttachMoney } from "react-icons/md";
import { BsGraphUp } from "react-icons/bs";
import { AiOutlineBank } from "react-icons/ai";
import { HiMenu } from "react-icons/hi";

const VoiceInput = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.lang = "en-US";
      recog.interimResults = false;
      recog.maxAlternatives = 1;

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onResult) onResult(transcript);
        setIsListening(false);
      };

      recog.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recog.onend = () => setIsListening(false);
      setRecognition(recog);
    } else {
      alert("Speech recognition not supported in this browser.");
    }
  }, [onResult]);

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <button
      onClick={startListening}
      className={`ml-2 px-4 py-2 rounded-lg ${
        isListening ? "bg-red-500" : "bg-blue-500"
      } text-white`}
    >
      {isListening ? "Listening..." : "🎤 Speak"}
    </button>
  );
};

const speakText = (text) => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Text-to-speech not supported in this browser.");
  }
};

const isFinancialQuestion = (text) => {
  const keywords = [
    "investment",
    "stocks",
    "finance",
    "banking",
    "money",
    "risk",
    "fraud",
    "interest rate",
    "loan",
  ];
  const lowerText = text.toLowerCase();
  return keywords.some((word) => lowerText.includes(word));
};

const App = () => {
  const [screen, setScreen] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState([]);
  const messagesEndRef = useRef(null);

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [currentSession]);

  const getResponse = async () => {
    if (!prompt) return alert("Please enter a prompt");

    if (currentSession.length === 0) {
      const firstLine = prompt.split("\n")[0].slice(0, 50);
      setHistory((prev) => [...prev, { firstLine, session: [] }]);
    }

    const userMessage = isFinancialQuestion(prompt)
      ? `You are a financial expert. Answer concisely and always provide sources in the format:\nAnswer: <your answer>\nSource: <source link or reference>\nQuestion: ${prompt}`
      : `Answer concisely.\nQuestion: ${prompt}`;

    const newMessage = { role: "user", content: prompt };
    setCurrentSession((prev) => [...prev, newMessage]);
    setPrompt("");
    setScreen(2);
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
      });

      let botReply =
        response?.contents?.[0]?.text || response?.text || "Sorry, no response from API";

      let answer = botReply;
      let source = "";

      if (isFinancialQuestion(prompt) && botReply.includes("Source:")) {
        const parts = botReply.split("Source:");
        answer = parts[0].replace("Answer:", "").trim();
        source = parts[1].trim();
      }

      const botMessage = { role: "ai", content: answer, source };

      setCurrentSession((prev) => {
        const updatedSession = [...prev, botMessage];
        setHistory((history) => {
          const newHistory = [...history];
          if (newHistory.length > 0) newHistory[newHistory.length - 1].session = updatedSession;
          return newHistory;
        });
        return updatedSession;
      });

      if (ttsEnabled) speakText(answer);
    } catch (error) {
      console.error("AI API Error:", error);
      setCurrentSession((prev) => [...prev, { role: "ai", content: "Error fetching response" }]);
    }

    setLoading(false);
  };

  const startNewChat = () => {
    setCurrentSession([]);
    setPrompt("");
    setScreen(1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900 text-white">
      <Navbar />

      {/* Mobile Hamburger */}
      <div className="sm:hidden flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold">FinGPT</h3>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          <HiMenu size={30} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`fixed sm:relative top-0 left-0 z-50 w-64 bg-zinc-900 h-full sm:h-auto p-4 border-r border-gray-700 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out`}
        >
          <h3 className="text-xl font-bold mb-4">History</h3>
          {history.length ? (
            history.map((item, idx) => (
              <div
                key={idx}
                className="mb-2 p-3 rounded-lg bg-gray-700 cursor-pointer hover:bg-gray-600 transition-all"
                onClick={() => {
                  setCurrentSession(item.session);
                  setScreen(2);
                  setSidebarOpen(false);
                }}
              >
                {item.firstLine}...
              </div>
            ))
          ) : (
            <p className="text-gray-400">No conversation yet</p>
          )}
          <button
            onClick={startNewChat}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 p-2 rounded text-white transition-all"
          >
            + New Chat
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col justify-between w-full ml-0 sm:ml-64">
          {screen === 1 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
              <h3 className="text-5xl font-bold text-center">
                Fin<span className="text-blue-500">GPT</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full">
                <div
                  className="card flex flex-col items-center justify-center cursor-pointer bg-zinc-800 hover:bg-gray-800 rounded-lg p-5 transition-all"
                  onClick={() => setScreen(2)}
                >
                  <MdOutlineAttachMoney className="text-6xl mb-2" />
                  <p className="text-center">Money Management</p>
                </div>
                <div
                  className="card flex flex-col items-center justify-center cursor-pointer bg-zinc-800 hover:bg-gray-800 rounded-lg p-5 transition-all"
                  onClick={() => setScreen(2)}
                >
                  <BsGraphUp className="text-5xl mb-2" />
                  <p className="text-center">Insights and Investments</p>
                </div>
                <div
                  className="card flex flex-col items-center justify-center cursor-pointer bg-zinc-800 hover:bg-gray-800 rounded-lg p-5 transition-all"
                  onClick={() => setScreen(2)}
                >
                  <AiOutlineBank className="text-6xl mb-2" />
                  <p className="text-center">Banking Services</p>
                </div>
                <div
                  className="card flex flex-col items-center justify-center cursor-pointer bg-zinc-800 hover:bg-gray-800 rounded-lg p-5 transition-all"
                  onClick={() => setScreen(2)}
                >
                  <IoWarningOutline className="text-5xl mb-2" />
                  <p className="text-center">Learn about Risks and Fraud</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
              {currentSession.length ? (
                currentSession.map((item, index) => (
                  <div key={index} className="mb-4 flex flex-col">
                    {item.role === "user" ? (
                      <div className="self-end bg-blue-500 text-white rounded-2xl p-3 max-w-xs sm:max-w-[50%] shadow-md break-words">
                        <p className="text-sm text-gray-100 mb-1">You</p>
                        <p>{item.content}</p>
                      </div>
                    ) : (
                      <div className="self-start bg-gray-700 rounded-2xl p-3 max-w-xs sm:max-w-[50%] shadow-md break-words">
                        <p className="text-sm text-gray-300 mb-1">FinGPT</p>
                        <Markdown>{item.content}</Markdown>
                        {item.source && (
                          <p className="text-blue-400 mt-2 text-sm break-words">
                            Source: {item.source}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center mt-10">No messages yet</p>
              )}
              <div ref={messagesEndRef} />
              {loading && (
                <div className="flex justify-center mt-4">
                  <BeatLoader color="white" />
                </div>
              )}
            </div>
          )}

          {/* Input Box */}
          <div className="sticky bottom-0 bg-zinc-900 p-4 border-t border-gray-700">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-zinc-800 rounded-lg p-2">
              <input
                onKeyDown={(e) => e.key === "Enter" && getResponse()}
                onChange={(e) => setPrompt(e.target.value)}
                value={prompt}
                type="text"
                placeholder="Enter your message"
                className="flex-1 bg-transparent p-3 outline-none rounded text-white text-sm sm:text-base break-words"
              />
              <VoiceInput onResult={(text) => setPrompt(text)} />
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`px-4 py-2 rounded-lg ${
                  ttsEnabled ? "bg-green-500" : "bg-gray-600"
                } text-white`}
              >
                {ttsEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
              </button>
              <button
                onClick={getResponse}
                className="p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <IoSend size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-center mt-2 text-xs sm:text-sm">
              This chatbot may make mistakes. Please cross-check important information before making financial decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
