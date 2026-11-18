import { useColorScheme } from 'react-native';

// Same palette as the web app. s1 to s3 are the chart colours, checked for colour-blind separation on both backgrounds.
const light = { bg: '#ffffff', card: '#ffffff', soft: '#f5f7fa', fg: '#12161c', muted: '#5b6573', line: '#e4e8ee', brand: '#4f46e5', brandInk: '#ffffff', accent: '#0ea5a4', ready: '#0f7b4f', readyBg: '#e6f5ee', danger: '#b42318', s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a' };
const dark: typeof light = { bg: '#0e1116', card: '#151a21', soft: '#151a21', fg: '#eef1f5', muted: '#98a2b3', line: '#252b35', brand: '#8b85ff', brandInk: '#0e1116', accent: '#2dd4bf', ready: '#5fd3a2', readyBg: '#12281f', danger: '#ff8a7a', s1: '#3987e5', s2: '#d95926', s3: '#199e70' };

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);
