import WebApp from '@twa-dev/sdk';

// Initialize Telegram WebApp SDK
if (typeof window !== 'undefined') {
  try {
    WebApp.ready();
    WebApp.expand(); // Expand app to full height
  } catch (error) {
    console.error('Failed to initialize Telegram WebApp:', error);
  }
}

export const getTelegramUser = () => {
  const user = WebApp.initDataUnsafe?.user;
  if (user) {
    return user;
  }
  
  // Return mock user if running outside Telegram (development mode)
  if (import.meta.env.DEV) {
    return {
      id: 123456789, // Mock user ID (matches placeholder default)
      first_name: 'Mock',
      last_name: 'User',
      username: 'mock_football_fan'
    };
  }
  
  return null;
};

export const getTelegramInitData = () => {
  return WebApp.initData || '';
};

export default WebApp;
