import { PageTheme, LoadingStep } from "./types";

export const PAGE_THEMES: PageTheme[] = [
  { colors: ["#bbf7d0", "#6ee7b7"], accent: "#16a34a" },
  { colors: ["#fef08a", "#fcd34d"], accent: "#d97706" },
  { colors: ["#bae6fd", "#7dd3fc"], accent: "#0284c7" },
  { colors: ["#ddd6fe", "#c4b5fd"], accent: "#7c3aed" },
  { colors: ["#fbcfe8", "#f9a8d4"], accent: "#e11d48" },
  { colors: ["#fed7aa", "#fde68a"], accent: "#ea580c" },
];

export const TOPICS: string[] = [
  "Photosynthesis 🌱",
  "Water Cycle 💧",
  "Solar System 🚀",
  "Human Body 🫀",
  "Volcanoes 🌋",
  "Dinosaurs 🦕",
];

export const LOADING_STEPS: LoadingStep[] = [
  { icon: "🔍", text: "Understanding your topic..." },
  { icon: "✍️", text: "Crafting the story..." },
  { icon: "🎨", text: "Painting illustrations..." },
  { icon: "📖", text: "Binding your storybook..." },

  
];
