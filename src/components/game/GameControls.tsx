
import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { difficultySettings } from './GameUtils';

interface GameControlsProps {
  onRestart: () => void;
  onBallSizeChange: (size: number) => void;
  ballSize: number;
  onDifficultyChange: (difficulty: 'easy' | 'medium' | 'hard') => void;
  difficulty: 'easy' | 'medium' | 'hard';
  isGameOver: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  onRestart,
  onBallSizeChange,
  ballSize,
  onDifficultyChange,
  difficulty,
  isGameOver
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md border border-gray-200 max-w-md mx-auto mt-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Ball Size</h3>
          <div className="flex-1 mx-4">
            <Slider
              disabled={!isGameOver}
              value={[ballSize]}
              min={10}
              max={20}
              step={1}
              onValueChange={(values) => onBallSizeChange(values[0])}
            />
          </div>
          <span className="text-sm font-bold">{ballSize}px</span>
        </div>
        
        <div className="flex justify-between gap-2">
          <h3 className="text-sm font-medium mr-2">Difficulty:</h3>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <TooltipProvider key={level}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={difficulty === level ? "default" : "outline"}
                      size="sm"
                      disabled={!isGameOver}
                      onClick={() => onDifficultyChange(level)}
                      className="text-xs capitalize"
                    >
                      {level}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Speed: {difficultySettings[level].gameSpeed}</p>
                    <p>Gravity: {difficultySettings[level].gravity}</p>
                    <p>Jump Force: {Math.abs(difficultySettings[level].jumpForce)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
        
        {isGameOver && (
          <Button 
            variant="default" 
            className="w-full bg-[#FF7700] hover:bg-[#FF9933] text-white" 
            onClick={onRestart}
          >
            Play Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default GameControls;
