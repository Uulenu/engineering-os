import type { Table } from "./model";
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: string;
};
export const nouns: Record<Table, string> = {
  semesters: "semester",
  courses: "class",
  class_meetings: "meeting",
  assignments: "assignment",
  exams: "exam",
  study_sessions: "study session",
  projects: "project",
  progress: "progress entry",
};
const course: Field = {
  key: "course_id",
  label: "Course",
  type: "course",
  required: true,
};
const notes: Field = { key: "notes", label: "Notes", type: "textarea" };
export const fields: Record<Table, Field[]> = {
  semesters: [
    { key: "name", label: "Semester name", required: true },
    { key: "start_date", label: "Start date (optional)", type: "date" },
    { key: "end_date", label: "End date (optional)", type: "date" },
  ],
  courses: [
    { key: "name", label: "Course name", required: true },
    { key: "code", label: "Course code", required: true },
    {
      key: "credits",
      label: "Credits",
      type: "number",
      min: 0,
      max: 30,
      step: "0.5",
      required: true,
    },
    {
      key: "priority",
      label: "Study priority (1 is highest)",
      type: "number",
      min: 1,
      max: 5,
      required: true,
    },
    { key: "professor", label: "Professor (optional)" },
    notes,
  ],
  class_meetings: [
    course,
    { key: "day", label: "Day", type: "day", required: true },
    {
      key: "type",
      label: "Class type",
      options: ["Lecture", "Seminar", "Lab"],
    },
    { key: "start_time", label: "Start time", type: "time", required: true },
    { key: "end_time", label: "End time", type: "time", required: true },
    { key: "room", label: "Room" },
  ],
  assignments: [
    { key: "title", label: "Title", required: true },
    course,
    { key: "due_date", label: "Due date", type: "date", required: true },
    { key: "due_time", label: "Due time", type: "time", required: true },
    { key: "priority", label: "Priority", options: ["Low", "Medium", "High"] },
    { key: "status", label: "Status", options: ["open", "completed"] },
    notes,
  ],
  exams: [
    { key: "title", label: "Title", required: true },
    course,
    {
      key: "type",
      label: "Exam type",
      options: ["Midterm", "Final", "Quiz", "Other"],
    },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "time", label: "Time", type: "time", required: true },
    { key: "room", label: "Room" },
    { key: "status", label: "Status", options: ["scheduled", "archived"] },
    notes,
  ],
  study_sessions: [
    { key: "title", label: "Study goal", required: true },
    course,
    { key: "date", label: "Date", type: "date", required: true },
    { key: "start_time", label: "Start time", type: "time", required: true },
    { key: "end_time", label: "End time", type: "time", required: true },
    {
      key: "status",
      label: "Status",
      options: ["planned", "suggested", "completed", "skipped"],
    },
    notes,
  ],
  projects: [
    { key: "title", label: "Project title", required: true },
    { ...course, label: "Linked course (optional)", required: false },
    { key: "status", label: "Status", options: ["planning", "active", "done"] },
    { key: "due_date", label: "Deadline (optional)", type: "date" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "url", label: "Link (optional)", type: "url" },
    notes,
  ],
  progress: [
    { ...course, label: "Course (optional)", required: false },
    {
      key: "gpa",
      label: "GPA (optional)",
      type: "number",
      min: 0,
      max: 100,
      step: "0.01",
    },
    {
      key: "gpa_scale",
      label: "GPA scale",
      type: "number",
      min: 1,
      max: 100,
      step: "0.1",
      required: true,
    },
    {
      key: "attendance",
      label: "Attendance % (optional)",
      type: "number",
      min: 0,
      max: 100,
      step: "0.1",
    },
    notes,
  ],
};
export const defaults: Record<Table, Record<string, string | number>> = {
  semesters: { name: "Fall 2026" },
  courses: { credits: 3, priority: 5 },
  class_meetings: {
    day: 2,
    type: "Lecture",
    start_time: "09:20",
    end_time: "10:50",
  },
  assignments: { due_time: "23:59", priority: "Medium", status: "open" },
  exams: { type: "Midterm", status: "scheduled" },
  study_sessions: {
    start_time: "10:00",
    end_time: "11:00",
    source: "manual",
    status: "planned",
  },
  projects: { status: "planning" },
  progress: { gpa_scale: 4 },
};
