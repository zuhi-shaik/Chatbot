import React, { useState, useEffect, useRef } from "react";
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

const isFinancialQuestion = (text) => {
  const keywords = ["investment", "stocks", "finance", "banking", "money", "risk", "fraud", "interest rate", "loan"];
  const lowerText = text.toLowerCase();
  return keywords.some(word => lowerText.includes(word));
};

const App = () => {
  const [screen, setScreen] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

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
      setHistory(prev => [...prev, { firstLine, session: [] }]);
    }

    const userMessage = isFinancialQuestion(prompt)
      ? `You are a financial expert. Answer concisely and always provide sources in the format:\nAnswer: <your answer>\nSource: <source link or reference>\nQuestion: ${prompt}`
      : `Answer concisely.\nQuestion: ${prompt}`;

    const newMessage = { role: "user", content: prompt };
    setCurrentSession(prev => [...prev, newMessage]);
    setPrompt("");
    setScreen(2);
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
      });

      let botReply = response?.contents?.[0]?.text || response?.text || "Sorry, no response from API";

      let answer = botReply;
      let source = "";

      if (isFinancialQuestion(prompt) && botReply.includes("Source:")) {
        const parts = botReply.split("Source:");
        answer = parts[0].replace("Answer:", "").trim();
        source = parts[1].trim();
      }

      const botMessage = { role: "ai", content: answer, source };

      setCurrentSession(prev => {
        const updatedSession = [...prev, botMessage];
        setHistory(history => {
          const newHistory = [...history];
          if (newHistory.length > 0) newHistory[newHistory.length - 1].session = updatedSession;
          return newHistory;
        });
        return updatedSession;
      });

      if (ttsEnabled) speakText(answer);

    } catch (error) {
      console.error("AI API Error:", error);
      setCurrentSession(prev => [...prev, { role: "ai", content: "Error fetching response" }]);
    }

    setLoading(false);
  };

  const startNewChat = () => {
    setCurrentSession([]);
    setPrompt("");
    setScreen(1);
  };

  return (
    <div>
      <Navbar />
      <div className="flex flex-col sm:flex-row">
        {/* Sidebar */}
        <div className="w-full sm:w-[250px] bg-zinc-900 text-white p-4 h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">History</h3>
          {history.length ? (
            history.map((item, idx) => (
              <div
                key={idx}
                className="mb-2 p-2 rounded bg-gray-700 cursor-pointer hover:bg-gray-600"
                onClick={() => {
                  setCurrentSession(item.session);
                  setScreen(2);
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
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 p-2 rounded text-white"
          >
            + New Chat
          </button>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1">
          {screen === 1 ? (
            <div className="screen-1 w-full h-[70vh] flex items-center justify-center flex-col">
              <h3 className="!text-[45px] font-[700]">
                Fin<span className="text-blue-500">GPT</span>
              </h3>
              <div className="flex flex-wrap justify-center items-center gap-4 mt-5">
                <div className="card w-full sm:w-[200px] cursor-pointer bg-zinc-800 transition-all hover:bg-gray-800 rounded-lg p-[20px]" onClick={() => setScreen(2)}>
                  <i className="text-[63px]"><MdOutlineAttachMoney /></i>
                  <p>Money Management</p>
                </div>
                <div className="card w-full sm:w-[200px] cursor-pointer bg-zinc-800 transition-all hover:bg-gray-800 rounded-lg p-[20px]" onClick={() => setScreen(2)}>
                  <i className="text-[39px]"><BsGraphUp /></i>
                  <p>Insights and Investments</p>
                </div>
                <div className="card w-full sm:w-[200px] cursor-pointer bg-zinc-800 transition-all hover:bg-gray-800 rounded-lg p-[20px]" onClick={() => setScreen(2)}>
                  <i className="text-[63px]"><AiOutlineBank /></i>
                  <p>Banking Services</p>
                </div>
                <div className="card w-full sm:w-[200px] cursor-pointer bg-zinc-800 transition-all hover:bg-gray-800 rounded-lg p-[20px]" onClick={() => setScreen(2)}>
                  <i className="text-[40px]"><IoWarningOutline /></i>
                  <p>Learn about Risks and Fraud</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="screen-2 overflow-y-auto w-full h-[65vh] px-4 sm:px-8">
              {currentSession.length
                ? currentSession.map((item, index) => (
                  <div key={index}>
                    {item.role === "user" ? (
                      <div className="user bg-gray-800 w-full sm:w-fit sm:max-w-[40vw] mb-5 ml-auto p-[15px] break-words">
                        <p className="text-[14px] text-[gray]">User</p>
                        <p>{item.content}</p>
                      </div>
                    ) : (
                      <div className="ai bg-gray-800 w-full sm:w-fit sm:max-w-[40vw] mb-5 mr-auto p-[15px] break-words">
                        <p className="text-[14px] text-[gray]">FinGPT</p>
                        <Markdown>{item.content}</Markdown>
                        {item.source && <p className="text-blue-400 mt-2 text-sm">Source: {item.source}</p>}
                      </div>
                    )}
                  </div>
                ))
                : "No messages yet"}
              <div ref={messagesEndRef} />
              {loading && <div className="loader"><BeatLoader color="white" /></div>}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="inputBox px-4 sm:px-[150px] h-[15vh] pt-3">
        <div className="input w-full flex flex-col sm:flex-row items-center gap-2 bg-zinc-800 rounded-lg p-[5px]">
          <input
            onKeyDown={(e) => e.key === "Enter" && getResponse()}
            onChange={(e) => setPrompt(e.target.value)}
            value={prompt}
            type="text"
            placeholder="Enter your message"
            className="flex-1 bg-transparent p-[15px] outline-none text-[16px] sm:text-[18px] font-[500]"
          />
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <VoiceInput onResult={(text) => setPrompt(text)} />
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`px-4 py-2 rounded-lg ${ttsEnabled ? "bg-green-500" : "bg-gray-600"} text-white`}
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
        </div>
        <p className="text-[gray] text-center mt-2 sm:mt-0">
          This chatbot may make mistakes. Please cross-check important information before making financial decisions.
        </p>
      </div>
    </div>
  );
};

export default App;
