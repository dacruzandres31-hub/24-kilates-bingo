import React, { useState, useEffect } from 'react';
import '../styles/Countdown.css';

const Countdown = ({ targetDate }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        H: Math.floor((difference / (1000 * 60 * 60)) % 24),
        M: Math.floor((difference / 1000 / 60) % 60),
        S: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Clear the timer if the component is unmounted
    return () => clearTimeout(timer);
  });

  const hasTimeLeft = Object.values(timeLeft).some(val => val > 0);

  return (
    <div className="countdown-container">
      <div className={`countdown-label-text ${!hasTimeLeft ? 'drawing' : ''}`}>
        {hasTimeLeft ? 'Próximo sorteo en...' : 'SORTEANDO'}
      </div>
      <div className="countdown-timer">
        <div className="countdown-segment">
          <span className="countdown-number">{String(timeLeft.H || 0).padStart(2, '0')}</span>
          <span className="countdown-label">H</span>
        </div>
        <span className="countdown-separator">:</span>
        <div className="countdown-segment">
          <span className="countdown-number">{String(timeLeft.M || 0).padStart(2, '0')}</span>
          <span className="countdown-label">M</span>
        </div>
        <span className="countdown-separator">:</span>
        <div className="countdown-segment">
          <span className="countdown-number">{String(timeLeft.S || 0).padStart(2, '0')}</span>
          <span className="countdown-label">S</span>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
