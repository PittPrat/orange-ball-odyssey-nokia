
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HighScoreEntry {
  name: string;
  score: number;
}

interface HighScoreDisplayProps {
  highScores: HighScoreEntry[];
  isNewHighScore: boolean;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onSaveScore: () => void;
  finalScore: number;
}

const HighScoreDisplay: React.FC<HighScoreDisplayProps> = ({
  highScores,
  isNewHighScore,
  playerName,
  onPlayerNameChange,
  onSaveScore,
  finalScore
}) => {
  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-2">Score: {finalScore}</h2>
      
      {isNewHighScore && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="font-bold text-amber-700 mb-2">New High Score! 🏆</p>
          <Input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full mb-2"
          />
          <Button
            onClick={onSaveScore}
            className="w-full bg-[#FF7700] hover:bg-[#FF9933] text-white"
          >
            Save Score
          </Button>
        </div>
      )}
      
      <div>
        <h3 className="font-bold mb-2 text-gray-700">High Scores</h3>
        <ScrollArea className="h-[150px] rounded border p-2 bg-white/90">
          {highScores.length > 0 ? (
            <div className="pr-4">
              {highScores.map((entry, index) => (
                <div 
                  key={index} 
                  className="py-2 border-b border-dotted border-gray-300 flex justify-between"
                >
                  <span className="font-medium">{index + 1}. {entry.name}</span>
                  <span className="font-bold">{entry.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-4">No high scores yet. Be the first!</p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default HighScoreDisplay;
