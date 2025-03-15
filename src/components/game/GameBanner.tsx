
import React from 'react';

const GameBanner: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 right-0 mx-auto w-full max-w-4xl z-10 pointer-events-none">
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 rounded-b-lg shadow-lg font-['Poppins',_sans-serif] text-center">
        <h1 className="text-2xl font-bold mb-2">CITY BASKETBALL CHALLENGE</h1>
        <p className="text-lg mb-2">
          Guide your basketball through the city to reach the basketball court!
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="bg-black/20 px-3 py-1 rounded-full">
            <span className="font-bold">↑↓←→</span> Move Ball
          </div>
          <div className="bg-black/20 px-3 py-1 rounded-full">
            <span className="font-bold">SPACE</span> Bounce
          </div>
          <div className="bg-black/20 px-3 py-1 rounded-full">
            <span className="text-red-200 font-bold">AVOID</span> Nails
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBanner;
