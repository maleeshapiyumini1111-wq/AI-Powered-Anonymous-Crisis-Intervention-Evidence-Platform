import { useState, useEffect } from 'react';

export const useAnonymousAuth = () => {
  const [userHash, setUserHash] = useState(null);
  const [loading, setLoading] = useState(true);

  const generateSHA256 = async (inputString) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    const initAnonymousUser = async () => {
      try {
        let storedHash = localStorage.getItem('anon_user_hash');
        if (!storedHash) {
          const randomArray = new Uint8Array(32);
          window.crypto.getRandomValues(randomArray);
          const rawSeed = Array.from(randomArray).join('') + Date.now().toString();
          storedHash = await generateSHA256(rawSeed);
          localStorage.setItem('anon_user_hash', storedHash);
        }
        setUserHash(storedHash);
      } catch (error) {
        console.error("Crypto Key generation failed:", error);
      } finally {
        setLoading(false);
      }
    };
    initAnonymousUser();
  }, []);

  return { userHash, loading };
};