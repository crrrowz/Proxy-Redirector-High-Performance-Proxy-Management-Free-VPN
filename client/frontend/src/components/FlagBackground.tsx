import { useState, useEffect } from 'react';

type Props = {
  countryCode: string;
};

export function FlagBackground({ countryCode }: Props) {
  const [currentSrc, setCurrentSrc] = useState('');
  const [prevSrc, setPrevSrc] = useState('');
  const [showCurrent, setShowCurrent] = useState(true);

  useEffect(() => {
    if (!countryCode || countryCode === 'Unknown' || countryCode === 'GLOBAL') {
      if (currentSrc !== '') {
        setPrevSrc(currentSrc);
        setCurrentSrc('');
        setShowCurrent(false);
      }
      return;
    }

    const newUrl = `https://flagcdn.com/w1280/${countryCode.toLowerCase()}.png`;
    if (newUrl === currentSrc) return;

    // Preload image
    const img = new Image();
    img.onload = () => {
      setPrevSrc(currentSrc);
      setCurrentSrc(newUrl);
      setShowCurrent(false);
      // Trigger cross-fade
      requestAnimationFrame(() => {
        // Small delay to ensure the DOM has updated with opacity 0 before transitioning to 1
        setTimeout(() => setShowCurrent(true), 50);
      });
    };
    img.src = newUrl;
  }, [countryCode, currentSrc]);

  return (
    <div className="flag-background">
      {/* Previous flag (fading out) */}
      {prevSrc && (
        <img
          className="flag-background__fabric"
          src={prevSrc}
          style={{ opacity: showCurrent ? 0 : 0.15 }}
          alt=""
        />
      )}
      {/* Current flag (fading in) */}
      {currentSrc && (
        <img
          className="flag-background__fabric"
          src={currentSrc}
          style={{ opacity: showCurrent ? 0.15 : 0 }}
          alt=""
        />
      )}
      
      {/* Fabric simulation overlays */}
      <div className="flag-background__folds" />
      <div className="flag-background__light" />
    </div>
  );
}
