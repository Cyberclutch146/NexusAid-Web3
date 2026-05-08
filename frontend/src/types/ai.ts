export type AiRole = "user" | "assistant";

export interface AiMessage {
  id: string;
  role: AiRole;
  content: string;
}