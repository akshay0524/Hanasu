import React, { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Falling Cherry Blossom Component
const FallingPetal = ({ delay }) => {
    const randomX = Math.random() * 100; // Random horizontal start
    const duration = 5 + Math.random() * 5; // Long fall duration

    return (
        <motion.div
            initial={{ y: -20, x: `${randomX}vw`, opacity: 0, rotate: 0 }}
            animate={{
                y: '100vh',
                x: `${randomX + (Math.random() * 20 - 10)}vw`, // Drift
                opacity: [0, 1, 0],
                rotate: 360
            }}
            transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "linear"
            }}
            className="absolute top-0 w-3 h-3 bg-sakura-light/60 rounded-full blur-[1px] pointer-events-none"
            style={{
                borderRadius: '50% 0 50% 0' // Petal shape
            }}
        />
    );
};

const Login = () => {
    const { loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [petals, setPetals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Create 20 petals
        const p = Array.from({ length: 20 }).map((_, i) => i * 0.5);
        setPetals(p);
    }, []);

    // useGoogleLogin opens a plain browser popup — no iframe, no COOP issue
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError(null);
            try {
                // tokenResponse.access_token is sent to the backend
                await loginWithGoogle(tokenResponse.access_token);
                navigate('/');
            } catch (err) {
                console.error('Login Failed', err);
                setError('Sign-in failed. Please try again.');
            } finally {
                setLoading(false);
            }
        },
        onError: (err) => {
            console.error('Google OAuth error', err);
            setError('Google sign-in was cancelled or failed.');
        },
        // implicit flow — access_token returned directly in the popup
        flow: 'implicit',
    });

    return (
        <div className="h-dvh w-full flex items-center justify-center relative overflow-hidden bg-dark-900">
            {/* Background Gradient & Pattern handled in CSS, but adding a glow here */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-dark-900/90 z-0"></div>

            {/* The Moon */}
            <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-100/10 rounded-full blur-3xl" />

            {/* Falling Petals */}
            {petals.map((delay, i) => <FallingPetal key={i} delay={delay} />)}

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="glass-panel p-10 rounded-3xl w-full max-w-sm text-center z-10 relative shadow-2xl shadow-black/40 flex flex-col items-center"
            >
                {/* Minimal Logo / Kanji */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8"
                >
                    <h1 className="text-6xl font-japanese font-bold text-white mb-2 tracking-widest text-shadow">
                        話す
                    </h1>
                    <h2 className="text-xl text-sakura uppercase tracking-[0.3em] font-light">
                        Hanasu
                    </h2>
                </motion.div>

                <p className="text-gray-400 mb-10 text-sm font-light leading-relaxed">
                    Connect instantly.<br />
                    Speak freely.<br />
                    <span className="text-xs text-gray-500 mt-2 block">Minimal AI Chat Experience</span>
                </p>

                {/* Custom Google Sign-In Button — avoids COOP iframe issue */}
                <div className="relative group w-full">
                    <div className="absolute -inset-1 bg-gradient-to-r from-sakura to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <motion.button
                        id="google-signin-btn"
                        onClick={() => googleLogin()}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full text-white text-sm font-medium tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            /* Spinner */
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            /* Google logo SVG */
                            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                            </svg>
                        )}
                        <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
                    </motion.button>
                </div>

                {/* Error message */}
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 text-xs text-red-400 text-center"
                    >
                        {error}
                    </motion.p>
                )}

                <div className="mt-12 text-[10px] text-gray-600 uppercase tracking-widest font-mono">
                    Secure · Fast · Minimal
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
