import * as Speech from 'expo-speech';

export const speakDirection = (text: string) => {
  Speech.speak(text, { language: 'en', rate: 1.0 });
};
