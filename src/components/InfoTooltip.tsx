import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  question: string;
  answer: string;
}

export function InfoTooltip({ question, answer }: InfoTooltipProps) {
  return (
    <div className="relative group inline-flex items-center justify-center ml-2">
      <HelpCircle className="w-4 h-4 text-blue-grey-400 cursor-help hover:text-blue-grey-600 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-blue-grey-900 text-white text-[13px] leading-[18px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
        <p className="font-bold mb-1 text-primary-light">{question}</p>
        <p className="font-normal text-blue-grey-100">{answer}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-grey-900"></div>
      </div>
    </div>
  );
}
