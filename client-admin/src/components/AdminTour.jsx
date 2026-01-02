import React, { useState, useEffect } from 'react';
import './AdminTour.css';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { tourSteps } from '../utils/tourSteps';

const AdminTour = ({ runTour, onTourEnd }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [coords, setCoords] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (runTour) {
            setStepIndex(0);
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [runTour]);

    useEffect(() => {
        if (!isVisible) return;

        const updatePosition = () => {
            const step = tourSteps[stepIndex];
            const element = document.querySelector(step.target);

            if (element) {
                const rect = element.getBoundingClientRect();
                let width = rect.width;
                let height = rect.height;
                let top = rect.top;
                let left = rect.left;

                if (step.customWidth) {
                    const diffW = width - step.customWidth;
                    width = step.customWidth;
                    left += diffW / 2;
                }
                if (step.customHeight) {
                    const diffH = height - step.customHeight;
                    height = step.customHeight;
                    top += diffH / 2;
                }

                setCoords({
                    top,
                    left,
                    width,
                    height,
                    position: step.position
                });
            }
        };

        const step = tourSteps[stepIndex];
        const element = document.querySelector(step.target);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: step.scrollBlock || 'center'
            });
        }

        const timer = setTimeout(updatePosition, 500);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            clearTimeout(timer);
        };
    }, [stepIndex, isVisible]);

    const handleNext = () => {
        if (stepIndex < tourSteps.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (stepIndex > 0) {
            setStepIndex(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        if (onTourEnd) onTourEnd();
    };

    if (!isVisible || !coords) return null;

    const currentStep = tourSteps[stepIndex];
    const cardWidth = 350;
    const cardHeight = 250;
    const safetyMargin = 20;

    let leftPos = coords.left + (coords.width / 2) - (cardWidth / 2);
    if (leftPos < safetyMargin) leftPos = safetyMargin;
    if (leftPos + cardWidth > window.innerWidth - safetyMargin) {
        leftPos = window.innerWidth - cardWidth - safetyMargin;
    }

    let topPos;
    if (coords.position === 'bottom') {
        topPos = coords.top + coords.height + 20;
        if (topPos + cardHeight > window.innerHeight) {
            topPos = coords.top - cardHeight - 20;
        }
    } else if (coords.position === 'right') {
        leftPos = coords.left + coords.width + 20;
        topPos = coords.top;
    } else {
        topPos = coords.top - 200;
        if (topPos < safetyMargin) {
            topPos = coords.top + coords.height + 20;
        }
    }

    return (
        <div className="admin-tour-overlay">
            <div
                className="tour-spotlight"
                style={{
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    height: coords.height,
                }}
            />
            <div
                className={`tour-card ${coords.position}`}
                style={{
                    top: topPos,
                    left: leftPos,
                    width: cardWidth
                }}
            >
                <div className="tour-header">
                    <h3>{currentStep.title}</h3>
                    <button onClick={handleClose} className="tour-close"><X size={18} /></button>
                </div>
                <div className="tour-body">
                    <p dangerouslySetInnerHTML={{ __html: currentStep.content }}></p>
                </div>
                <div className="tour-footer">
                    <span className="tour-counter">{stepIndex + 1} / {tourSteps.length}</span>
                    <div className="tour-actions">
                        <button onClick={handlePrev} disabled={stepIndex === 0} className="tour-btn secondary">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={handleNext} className="tour-btn primary">
                            {stepIndex === tourSteps.length - 1 ? 'Finalizar' : 'Siguiente'}
                            {stepIndex < tourSteps.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminTour;
