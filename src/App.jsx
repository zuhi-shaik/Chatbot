import React, { useState, useEffect, useRef, useMemo } from "react";
import "./App.css";
import Navbar from "./Components/Navbar";
import { GoogleGenAI } from "@google/genai";
import { BeatLoader } from "react-spinners";
import Markdown from "react-markdown";
import { IoWarningOutline, IoSend } from "react-icons/io5";
import { MdOutlineAttachMoney } from "react-icons/md";
import { BsGraphUp } from "react-icons/bs";
import { AiOutlineBank } from "react-icons/ai";

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

// Detect financial/banking/marketing-related questions (broad matching by roots)
const isFinancialQuestion = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const roots = [
    "invest",
    "stock",
    "financ",
    "bank",
    "marketing",
    "market ", // trailing space to avoid matching 'bookmark' etc.
    "money",
    "risk",
    "fraud",
    "interest",
    "loan",
    "credit",
    "debit",
    "account",
    "balance",
    "transact",
    "statement",
    "transfer",
    "benefici",
    "payee",
    "remittance",
    "neft",
    "rtgs",
    "imps",
    "ledger",
    "history",
    "saving",
    "deposit",
    "withdraw",
    "mortgage",
    "emi",
    "insurance",
    "budget",
    "tax",
    "revenue",
    "expense",
    "roi",
    "mutual fund",
    "sip",
    "etf",
    "bond",
    "ipo",
    "dividend",
    "portfolio",
    "asset",
    "liabilit",
    "forex",
    "currency",
    "inflation",
    "gdp",
    "payment",
    "upi",
    "card",
    "trading",
    "broker",
    "pricing",
    "campaign",
    "conversion",
    "lead ",
    "cpc",
    "cpm",
    "ctr",
    "sale",
    "price",
  ];
  return roots.some((r) => lowerText.includes(r));
};

const App = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const [screen, setScreen] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState([]);
  const messagesEndRef = useRef(null);
  const ai = useMemo(() => {
    if (!apiKey) {
      console.error("Missing VITE_GOOGLE_API_KEY environment variable");
      return null;
    }

    try {
      return new GoogleGenAI({ apiKey });
    } catch (error) {
      console.error("Failed to initialise GoogleGenAI client:", error);
      return null;
    }
  }, [apiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [currentSession]);

  const getResponse = async (forcedPrompt) => {
    const promptToUse = forcedPrompt ?? prompt;
    if (!promptToUse) return alert("Please enter a prompt");

    if (currentSession.length === 0) {
      const firstLine = promptToUse.split("\n")[0].slice(0, 50);
      setHistory((prev) => [...prev, { firstLine, session: [] }]);
    }

    // Block non-financial prompts with a helpful message
    if (!isFinancialQuestion(promptToUse)) {
      const userMsg = { role: "user", content: prompt };
      const refusal = {
        role: "ai",
        content:
          "I can help with financial, banking, and marketing topics only. Please ask about investments, banking services, loans, interest rates, fraud/risk awareness, budgeting, or related financial marketing topics.",
      };
      setCurrentSession((prev) => {
        const updated = [...prev, userMsg, refusal];
        setHistory((history) => {
          const newHistory = [...history];
          if (newHistory.length > 0) newHistory[newHistory.length - 1].session = updated;
          return newHistory;
        });
        return updated;
      });
      setPrompt("");
      setScreen(2);
      return;
    }

    const userMessage = `You are a financial expert. Answer concisely and always provide sources in the format:\nAnswer: <your answer>\nSource: <source link or reference>\nQuestion: ${promptToUse}`;

    const newMessage = { role: "user", content: promptToUse };
    setCurrentSession((prev) => [...prev, newMessage]);
    setPrompt("");
    setScreen(2);
    setLoading(true);

    if (!ai) {
      setCurrentSession((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "The chatbot is not configured. Please set VITE_GOOGLE_API_KEY in your Vite environment variables and restart the dev server.",
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
      });

      let botReply =
        response?.contents?.[0]?.text || response?.text || "Sorry, no response from API";

      let answer = botReply;
      let source = "";

      if (isFinancialQuestion(promptToUse) && botReply.includes("Source:")) {
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
    <div className="min-h-screen flex flex-col font-sans">
      {!apiKey && (
        <div className="bg-red-600 text-white text-center p-2 text-sm">
          Missing VITE_GOOGLE_API_KEY. Responses will be unavailable until it is set.
        </div>
      )}
      <Navbar />
      <div className="flex-1 flex flex-row w-full gap-4 animate-fadeIn">
        {/* History Sidebar */}
        <div className="w-[260px] bg-surface/60 backdrop-blur border border-white/10 text-white p-4 rounded-none overflow-y-auto overscroll-contain scroll-smooth">
          <h3 className="text-xl font-bold mb-4">History</h3>
          {history.length ? (
            history.map((item, idx) => (
              <div
                key={idx}
                className="mb-2 p-2 rounded bg-gray-800/70 border border-white/10 cursor-pointer hover:bg-gray-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setCurrentSession(item.session);
                  setScreen(2);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setCurrentSession(item.session);
                    setScreen(2);
                  }
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
            className="mt-4 w-full bg-primary-600 hover:bg-primary-500 p-2 rounded text-white transition-colors"
          >
            + New Chat
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 w-full flex flex-col px-4 sm:px-6 lg:px-12">
          {screen === 1 ? (
            <div className="screen-1 w-full min-h-[50vh] sm:min-h-[70vh] flex flex-col items-center justify-center">
              <h3 className="text-4xl sm:text-5xl md:text-6xl font-[700]">
                Fin<span className="text-blue-500">GPT</span>
              </h3>
              <div className="flex flex-wrap justify-center gap-4 mt-5">
                <div
                  className="card w-full sm:w-[200px] cursor-pointer bg-surface/60 backdrop-blur border border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:bg-surface/80 rounded-lg p-[20px] duration-200"
                  onClick={() => getResponse("How can I budget and manage my money effectively?")}
                >
                  <i className="text-[63px] text-primary-400">
                    <MdOutlineAttachMoney />
                  </i>
                  <p className="mt-2 text-gray-200">Money Management</p>
                </div>
                <div
                  className="card w-full sm:w-[200px] cursor-pointer bg-surface/60 backdrop-blur border border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:bg-surface/80 rounded-lg p-[20px] duration-200"
                  onClick={() => getResponse("What are smart ways to start investing and what risks should I consider?")}
                >
                  <i className="text-[39px] text-primary-400">
                    <BsGraphUp />
                  </i>
                  <p className="mt-2 text-gray-200">Insights and Investments</p>
                </div>
                <div
                  className="card w-full sm:w-[200px] cursor-pointer bg-surface/60 backdrop-blur border border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:bg-surface/80 rounded-lg p-[20px] duration-200"
                  onClick={() => getResponse("What banking services are available and how do I choose the right one?")}
                >
                  <i className="text-[63px] text-primary-400">
                    <AiOutlineBank />
                  </i>
                  <p className="mt-2 text-gray-200">Banking Services</p>
                </div>
                <div
                  className="card w-full sm:w-[200px] cursor-pointer bg-surface/60 backdrop-blur border border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:bg-surface/80 rounded-lg p-[20px] duration-200"
                  onClick={() => getResponse("What common financial frauds should I know about and how can I stay safe?")}
                >
                  <i className="text-[40px] text-primary-400">
                    <IoWarningOutline />
                  </i>
                  <p className="mt-2 text-gray-200">Learn about Risks and Fraud</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="screen-2 overflow-y-auto w-full flex-1 min-h-[45vh] sm:min-h-[60vh] px-4 sm:px-8">
              {currentSession.length
                ? currentSession.map((item, index) => (
                    <div key={index}>
                      {item.role === "user" ? (
                        <div className="user bg-gray-800/80 border border-white/10 shadow-sm animate-slideUp w-full sm:w-auto max-w-full sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] mb-5 ml-auto p-[15px] rounded-xl">
                          <p className="text-[12px] uppercase tracking-wide text-gray-400">User</p>
                          <p className="leading-relaxed">{item.content}</p>
                        </div>
                      ) : (
                        <div className="ai bg-gray-800/80 border border-white/10 shadow-sm animate-slideUp w-full sm:w-auto max-w-full sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] mb-5 mr-auto p-[15px] rounded-xl">
                          <p className="text-[12px] uppercase tracking-wide text-gray-400">FinGPT</p>
                          <div className="prose prose-invert max-w-none">
                            <Markdown>{item.content}</Markdown>
                          </div>
                          {item.source && (
                            <p className="text-primary-300 mt-2 text-sm">Source: {item.source}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                : "No messages yet"}
              <div ref={messagesEndRef} />
              {loading && (
                <div className="loader">
                  <BeatLoader color="white" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Box */}
      <div className="inputBox w-full px-4 sm:px-6 lg:px-12 py-3 mt-2">
        <div className="input w-full flex flex-col sm:flex-row items-center gap-2 bg-surface/60 backdrop-blur border border-white/10 rounded-lg p-2 focus-within:ring-2 focus-within:ring-primary-500 transition-shadow">
          <input
            onKeyDown={(e) => e.key === "Enter" && getResponse()}
            onChange={(e) => setPrompt(e.target.value)}
            value={prompt}
            type="text"
            placeholder="Ask about investments, banking, budgeting, fraud awareness..."
            aria-label="Message input"
            className="flex-1 bg-transparent p-[10px] outline-none text-[16px] font-[500] placeholder:text-gray-400"
          />
          <VoiceInput onResult={(text) => setPrompt(text)} />
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            aria-pressed={ttsEnabled}
            aria-label={ttsEnabled ? "Disable voice" : "Enable voice"}
            className={`${
              ttsEnabled ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 hover:bg-gray-600"
            } ml-2 px-4 py-2 rounded-lg text-white transition-colors`}
          >
            {ttsEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
          </button>
          <button
            onClick={getResponse}
            aria-label="Send message"
            className="ml-2 p-3 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <IoSend size={20} />
          </button>
        </div>
        <p className="text-[gray] text-center mt-2 text-sm">
          This chatbot may make mistakes. Please cross-check important information before making financial decisions.
        </p>
      </div>
    </div>
  );
};

export default App;
