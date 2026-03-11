export interface StoryPage {
  title: string;
  text: string;
  illustration: string;
  emoji?: string;
  colors?: string[];
  accent?: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface LoadingStep {
  icon: string;
  text: string;
}

export interface PageTheme {
  colors: string[];
  accent: string;
}
