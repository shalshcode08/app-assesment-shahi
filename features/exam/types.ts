export type ExamOption = {
  id: string;
  label: string;
};

export type ExamQuestion = {
  id: number;
  section: string;
  prompt: string;
  options: ExamOption[];
};
