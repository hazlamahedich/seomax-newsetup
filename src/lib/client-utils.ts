/**
 * Client-side utility functions that handle browser-only APIs safely
 */

/**
 * Check if code is running on the client side (browser)
 */
export const isClient = () => {
  return typeof window !== 'undefined';
};

/**
 * Safely access window dimensions, returning defaults for server-side rendering
 */
export const getWindowDimensions = () => {
  if (!isClient()) {
    return { width: 1200, height: 800 }; // Default values for SSR
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

/**
 * Calculate parallax effect values based on mouse position
 */
export const calculateParallax = (
  mouseX: number, 
  mouseY: number, 
  strength: number = 0.02
) => {
  if (!isClient()) {
    return { x: 0, y: 0 }; // No parallax effect during SSR
  }
  
  const { width, height } = getWindowDimensions();
  const centerX = width / 2;
  const centerY = height / 2;
  
  const x = (mouseX - centerX) * strength;
  const y = (mouseY - centerY) * strength;
  
  return { x, y };
}; 