import React from 'react';
import { FaCrown, FaStar, FaGem } from 'react-icons/fa';
import './VIPBadge.css';

const VIPBadge = ({ tier, size = 'medium', showLabel = true }) => {
    if (!tier) return null;

    const tierLower = tier.toLowerCase();

    const getTierConfig = () => {
        if (tierLower.includes('oro')) {
            return {
                icon: <FaCrown />,
                label: 'ORO',
                className: 'vip-badge-gold'
            };
        }
        if (tierLower.includes('plata')) {
            return {
                icon: <FaGem />,
                label: 'PLATA',
                className: 'vip-badge-silver'
            };
        }
        if (tierLower.includes('bronce')) {
            return {
                icon: <FaStar />,
                label: 'BRONCE',
                className: 'vip-badge-bronze'
            };
        }
        return null;
    };

    const config = getTierConfig();
    if (!config) return null;

    return (
        <span className={`vip-badge ${config.className} vip-badge-${size}`}>
            <span className="vip-badge-icon">{config.icon}</span>
            {showLabel && <span className="vip-badge-label">{config.label}</span>}
        </span>
    );
};

export default VIPBadge;
