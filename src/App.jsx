import { HiMenu } from "react-icons/hi";
import { useState } from "react";

const App = () => {
  const [screen, setScreen] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState([]);
  const messagesEndRef = useRef(null);

  // scrollToBottom function here...
  // getResponse function here...
  // startNewChat function here...

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900 text-white">
      <Navbar />

      {/* Hamburger for Mobile */}
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
                  setSidebarOpen(false); // close on mobile when selecting
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
                {/* Your 4 cards here, same as previous */}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
              {currentSession.length ? (
                currentSession.map((item, index) => (
                  <div key={index} className="mb-4 flex flex-col">
                    {item.role === "user" ? (
                      <div className="self-end bg-blue-500 text-white rounded-2xl p-3 max-w-xs sm:max-w-[50%] shadow-md">
                        <p className="text-sm text-gray-100 mb-1">You</p>
                        <p>{item.content}</p>
                      </div>
                    ) : (
                      <div className="self-start bg-gray-700 rounded-2xl p-3 max-w-xs sm:max-w-[50%] shadow-md">
                        <p className="text-sm text-gray-300 mb-1">FinGPT</p>
                        <Markdown>{item.content}</Markdown>
                        {item.source && (
                          <p className="text-blue-400 mt-2 text-sm">Source: {item.source}</p>
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
                className="flex-1 bg-transparent p-3 outline-none rounded text-white text-sm sm:text-base"
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
