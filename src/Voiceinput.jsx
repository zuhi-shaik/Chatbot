import React, { useState } from "react";

export default function VoiceInput({ onResult }) {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Sorry, your browser does not support speech recognition.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recog = new SpeechRecognition();
    recog.lang = "en-US"; // change language if needed
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) {
        onResult(transcript); // pass recognized text to parent
      }
      setIsListening(false);
    };

    recog.onerror = () => setIsListening(false);
    recog.onend = () => setIsListening(false);

    recog.start();
    setIsListening(true);
  };

  return (
    <button
      onClick={startListening}
      className={`p-2 rounded-lg ${
        isListening ? "bg-red-500" : "bg-blue-500"
      } text-white`}
    >
      {isListening ? "Listening..." : "🎤 Speak"}
    </button>
  );
}
