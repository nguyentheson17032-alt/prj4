import React from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';

export const AudioWave = ({ playerId, audioUrl, duration = '0:15' }) => {
  const { activePlayerId, isPlaying, toggleVoice } = useAudio();
  const isThisPlaying = activePlayerId === playerId && isPlaying;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVoice(playerId, audioUrl);
  };

  return (
    <button
      className={`player-voice-btn ${isThisPlaying ? 'playing' : ''}`}
      onClick={handleClick}
      title="Nghe giọng nói giới thiệu"
    >
      {isThisPlaying ? <Pause size={14} /> : <Play size={14} />}
      <div className={`waveform-bars ${isThisPlaying ? '' : 'paused'}`}>
        <span className="waveform-bar" />
        <span className="waveform-bar" />
        <span className="waveform-bar" />
        <span className="waveform-bar" />
        <span className="waveform-bar" />
      </div>
      <span>{duration}</span>
    </button>
  );
};

export default AudioWave;
