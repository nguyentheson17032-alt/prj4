import React, { createContext, useContext, useState, useRef } from 'react';

const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio());

  const toggleVoice = (playerId, audioUrl) => {
    if (activePlayerId === playerId && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActivePlayerId(null);
    } else {
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(e => console.log('Audio autoplay prevented or error:', e));
      }
      setActivePlayerId(playerId);
      setIsPlaying(true);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setActivePlayerId(null);
      };
    }
  };

  return (
    <AudioContext.Provider value={{ activePlayerId, isPlaying, toggleVoice }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
