export interface ReviewControls {
  mode: string;
  onRecord: (id: string | number, correct: boolean, wordId?: number) => void;
  onFinish: () => void;
}
