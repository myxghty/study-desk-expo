import React, { useContext } from 'react';

export const light = { bg: '#f6f4ef', card: '#fffdf8', ink: '#1d2430', mut: '#6b7380', line: '#e3ded2', acc: '#2f6f62', accInk: '#ffffff', bad: '#c2412d', warn: '#a8650f' };
export const dark = { bg: '#12161c', card: '#1b2129', ink: '#e9edf2', mut: '#8f9aa8', line: '#2a323d', acc: '#6fcab5', accInk: '#0c1512', bad: '#ff8a76', warn: '#e8b45a' };

export const ThemeContext = React.createContext(light);
export const useC = () => useContext(ThemeContext);
