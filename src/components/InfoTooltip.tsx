import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  question: string;
  answer: string;
}

export function InfoTooltip({ question, answer }: InfoTooltipProps) {
  // group-hover만으로는 키보드/터치 사용자가 내용을 볼 수 없어서, 포커스/클릭으로도 열리게 한다.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative group inline-flex items-center justify-center ml-2"
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={question}
        aria-expanded={isOpen}
        className="flex items-center justify-center cursor-help outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
      >
        <HelpCircle className="w-4 h-4 text-blue-grey-400 hover:text-blue-grey-600 transition-colors" />
      </button>
      <div
        role="tooltip"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-blue-grey-900 text-white text-[13px] leading-[18px] rounded-lg shadow-xl transition-all duration-200 z-50 group-hover:opacity-100 group-hover:visible ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <p className="font-bold mb-1 text-primary-light">{question}</p>
        <p className="font-normal text-blue-grey-100">{answer}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-grey-900"></div>
      </div>
    </div>
  );
}
