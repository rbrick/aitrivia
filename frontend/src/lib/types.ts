export interface Player {
  id: string;
  name: string;
  points: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  category: string;
}

export interface CurrentQuestion {
  question: Question;
  startTime: number;
  endTime: number;
  answered: Record<string, boolean>;
}

export interface RoomConfig {
  categories: string[];
  answerTime: number;
}

export interface Room {
  id: string;
  joinCode: string;
  players: Player[];
  config: RoomConfig;
  currentQuestion?: CurrentQuestion;
}

// WebSocket messages
export type ServerMessageType = "session_ready" | "room_state" | "answer_result" | "error";

export interface ServerMessage {
  type: ServerMessageType;
  error?: string;
  playerId?: string;
  room?: Room;
  pointsRewarded?: number;
  correct?: boolean;
  correctAnswer?: number;
}

export interface AnswerResult {
  room: Room;
  pointsRewarded: number;
  correct: boolean;
  correctAnswer: number;
}
