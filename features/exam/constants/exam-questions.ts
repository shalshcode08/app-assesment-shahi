import type { ExamQuestion } from "@/features/exam/types";

export const EXAM_DURATION_SECONDS = 30 * 60;

export const EXAM_TITLE = "Trainer Competency Assessment";

export const EXAM_CANDIDATE = {
  name: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  state: "Haryana",
  hub: "North Hub",
} as const;

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 1,
    section: "Training fundamentals",
    prompt:
      "Which action should a trainer take first when a participant is struggling to follow a demonstrated process?",
    options: [
      {
        id: "a",
        label: "Repeat the same instruction at a faster pace",
      },
      {
        id: "b",
        label: "Ask a quick diagnostic question to identify the specific gap",
      },
      {
        id: "c",
        label: "Move the participant to the end of the session",
      },
      {
        id: "d",
        label: "Continue the session and address the issue afterward",
      },
    ],
  },
  {
    id: 2,
    section: "Session planning",
    prompt:
      "What is the most useful way to confirm that a learning objective is measurable?",
    options: [
      { id: "a", label: "It describes what the trainer will explain" },
      { id: "b", label: "It uses detailed technical terminology" },
      {
        id: "c",
        label: "It states an observable action the participant can perform",
      },
      { id: "d", label: "It covers every topic in the training manual" },
    ],
  },
  {
    id: 3,
    section: "Facilitation",
    prompt:
      "A group becomes quiet during a discussion. What is the best first response from the trainer?",
    options: [
      { id: "a", label: "Answer the discussion question personally" },
      { id: "b", label: "End the activity and continue with the slides" },
      {
        id: "c",
        label: "Reframe the question and allow participants time to think",
      },
      { id: "d", label: "Call on the newest participant immediately" },
    ],
  },
  {
    id: 4,
    section: "Assessment",
    prompt:
      "Which assessment method gives the clearest evidence that a participant can apply a practical skill?",
    options: [
      { id: "a", label: "An attendance record" },
      { id: "b", label: "A self-rating questionnaire" },
      { id: "c", label: "A supervised performance demonstration" },
      { id: "d", label: "A summary of the training material" },
    ],
  },
  {
    id: 5,
    section: "Feedback",
    prompt:
      "Which feedback statement is most likely to help a participant improve?",
    options: [
      { id: "a", label: "You need to be more careful next time" },
      { id: "b", label: "That result was not good enough" },
      {
        id: "c",
        label:
          "Your setup was correct; now check the final measurement before submitting",
      },
      { id: "d", label: "Watch how the others complete the task" },
    ],
  },
  {
    id: 6,
    section: "Training fundamentals",
    prompt:
      "When should a trainer check participant understanding during a session?",
    options: [
      { id: "a", label: "Only after the final topic" },
      { id: "b", label: "At planned points throughout the session" },
      { id: "c", label: "Only when a participant asks a question" },
      { id: "d", label: "After attendance has been recorded" },
    ],
  },
  {
    id: 7,
    section: "Session planning",
    prompt:
      "What should determine the amount of time assigned to a practical activity?",
    options: [
      { id: "a", label: "The number of presentation slides" },
      { id: "b", label: "The trainer's preferred teaching pace" },
      {
        id: "c",
        label: "The task complexity and the participants' experience level",
      },
      { id: "d", label: "The time used in the previous session" },
    ],
  },
  {
    id: 8,
    section: "Facilitation",
    prompt:
      "How should a trainer respond when one participant dominates a group discussion?",
    options: [
      { id: "a", label: "Stop inviting comments from that participant" },
      { id: "b", label: "Allow the discussion to continue unchanged" },
      {
        id: "c",
        label: "Acknowledge the contribution and invite other perspectives",
      },
      { id: "d", label: "Move directly to an individual written exercise" },
    ],
  },
  {
    id: 9,
    section: "Assessment",
    prompt:
      "Why should assessment criteria be shared before participants begin a task?",
    options: [
      { id: "a", label: "To make the task easier to complete" },
      { id: "b", label: "To ensure expectations are clear and consistent" },
      { id: "c", label: "To reduce the number of questions asked" },
      { id: "d", label: "To help participants compare their scores" },
    ],
  },
  {
    id: 10,
    section: "Feedback",
    prompt:
      "What is the best way to close a training session?",
    options: [
      { id: "a", label: "Introduce an additional topic" },
      { id: "b", label: "Review key points and confirm the next action" },
      { id: "c", label: "Ask participants to leave as soon as they finish" },
      { id: "d", label: "Repeat the full presentation" },
    ],
  },
];
