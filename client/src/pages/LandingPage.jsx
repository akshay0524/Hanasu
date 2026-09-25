import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KageLandingPage } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'HANASU_NAVIGATE') {
        const route = event.data.route || (user ? '/chat' : '/login');
        navigate(route);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, user]);

  return (
    <div className="shader-frame w-screen h-screen overflow-hidden bg-[#0A0704] relative">
      <KageLandingPage
        headingFont="geist"
        bodyFont="geist"
        headingWeight="500"
        bodyWeight="300"
        primaryColor="#FF6A00"
        headingSize={46}
        bodySize={17}
        headingLetterSpacing={-0.012}
      />
    </div>
  );
}
