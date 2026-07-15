import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface ChatLog {
  speaker: 'interviewer' | 'applicant';
  name: string;
  message: string;
}

export interface InterviewHistoryItem {
  id: string;
  date: string;
  interviewerName: string;
  score: number;
  passed: boolean;
  tag?: string;
  feedback?: string;
  logs: ChatLog[];
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historyItem: InterviewHistoryItem | null;
}

export function HistoryDrawer({ isOpen, onClose, historyItem }: HistoryDrawerProps) {
  return (
    <>
      {/* Dimmed Background */}
      <div 
        className={twMerge(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={twMerge(
          "fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-blue-grey-100 bg-white shrink-0">
          <div>
            <h2 className="text-[20px] leading-[28px] font-bold text-blue-grey-900">면접 상세 기록</h2>
            {historyItem && (
              <p className="text-[14px] leading-[20px] text-blue-grey-500 mt-1">
                {historyItem.date} • {historyItem.interviewerName}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-blue-grey-400 hover:text-blue-grey-900 hover:bg-blue-grey-50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-blue-grey-10">
          {historyItem?.logs.map((log, index) => {
            const isInterviewer = log.speaker === 'interviewer';
            return (
              <div 
                key={index} 
                className={twMerge(
                  "flex flex-col max-w-[85%]",
                  isInterviewer ? "items-start self-start mr-auto" : "items-end self-end ml-auto"
                )}
              >
                <span className="text-[12px] font-bold text-blue-grey-500 mb-1 px-1">
                  {log.name}
                </span>
                <div 
                  className={twMerge(
                    "p-4 rounded-2xl text-[14px] leading-[22px] whitespace-pre-wrap",
                    isInterviewer 
                      ? "bg-white border border-blue-grey-75 text-blue-grey-900 rounded-tl-none shadow-sm" 
                      : "bg-primary text-white rounded-tr-none shadow-sm"
                  )}
                >
                  {log.message}
                </div>
              </div>
            );
          })}
          {!historyItem?.logs.length && (
            <div className="text-center text-blue-grey-400 mt-10">
              대화 기록이 없습니다.
            </div>
          )}

          {/* 최종 종합 피드백 섹션 */}
          {historyItem?.feedback && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[14px] font-bold text-blue-800 mb-2 flex items-center gap-2">
                ✨ 최종 종합 피드백
              </h3>
              <p className="text-[13px] leading-[22px] text-blue-900 whitespace-pre-wrap">
                {historyItem.feedback}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
