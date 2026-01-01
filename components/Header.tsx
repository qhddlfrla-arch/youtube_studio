
import React from 'react';

interface HeaderProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const Header: React.FC<HeaderProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    { id: 1, label: '1. 대본 입력' },
    { id: 2, label: '2. 구조 생성' },
    { id: 3, label: '3. 이미지 생성' },
    { id: 4, label: '4. 매칭표' },
    { id: 5, label: '5. 영상 제작 JSON' },
  ];

  return (
    <header className="bg-[#DFFF00] no-print py-4 flex flex-col items-center gap-2 border-b border-black/10 shadow-sm shrink-0">
      <div className="text-center">
        <h1 className="text-xl md:text-2xl font-black text-black tracking-tighter uppercase italic">
          Storyboard Creator
        </h1>
      </div>

      <div className="flex items-center gap-1 mt-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <button 
              onClick={() => onStepClick?.(step.id)}
              className={`px-4 py-2 rounded-md text-[10px] font-black transition-all border-2 border-transparent ${
                currentStep === step.id 
                ? 'bg-[#e91e63] text-white shadow-xl scale-105 border-white/20' 
                : 'bg-[#333745] text-white/50 hover:bg-[#404557] hover:text-white'
              }`}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && (
              <svg className="w-3 h-3 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    </header>
  );
};

export default Header;
