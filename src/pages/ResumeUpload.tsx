import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileService } from '../domains/resume/resume.service';
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('IDLE');
      setErrorMsg('');
    }
  };

  const pollStatus = async (fileId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fileService.checkParseStatus(fileId);
        if (res.status === 'COMPLETED') {
          clearInterval(interval);
          setStatus('COMPLETED');
          setTimeout(() => navigate('/dungeon'), 1000);
        } else if (res.status === 'FAILED') {
          clearInterval(interval);
          setStatus('FAILED');
          setErrorMsg('이력서 파싱에 실패했습니다. 다른 파일을 시도해주세요.');
        }
      } catch (e) {
        clearInterval(interval);
        setStatus('FAILED');
        setErrorMsg('서버와 통신 중 오류가 발생했습니다.');
      }
      
      attempts++;
      if (attempts > 10) {
        clearInterval(interval);
        setStatus('FAILED');
        setErrorMsg('파싱 시간이 초과되었습니다.');
      }
    }, 2000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('UPLOADING');
    setErrorMsg('');
    
    try {
      const res = await fileService.uploadResume(file);
      setStatus('PROCESSING');
      pollStatus(res.fileId);
    } catch (e) {
      setStatus('FAILED');
      setErrorMsg('업로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-16 px-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-grey-25 rounded-md text-blue-grey-500 font-mono text-[14px] leading-[20px] font-bold mb-4 border border-blue-grey-75">
          STEP 01
        </div>
        <h2 className="text-[26px] leading-[32px] font-bold text-blue-grey-920 mb-3 tracking-tight">무기(이력서) 장착</h2>
        <p className="text-blue-grey-500 text-[14px] leading-[20px] font-normal">이력서를 업로드하여 당신만의 맞춤형 면접 던전을 생성하세요.</p>
      </div>

      <div className={twMerge(
        "bg-white border-2 border-dashed rounded-2xl p-16 text-center transition-colors cursor-pointer relative shadow-sm",
        status === 'IDLE' ? "border-blue-grey-75 hover:border-primary hover:bg-blue-grey-10" : "border-primary bg-blue-grey-10"
      )}
           onClick={() => status === 'IDLE' && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
          accept=".pdf,.txt,.md"
          disabled={status !== 'IDLE'}
        />
        
        {status === 'IDLE' && !file && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-grey-25 rounded-2xl flex items-center justify-center mb-6 border border-blue-grey-75">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-2">클릭하여 파일 업로드</h3>
            <p className="text-blue-grey-400 text-[14px] leading-[20px] font-normal">지원 형식: PDF, TXT, MD (최대 10MB)</p>
          </div>
        )}

        {file && status === 'IDLE' && (
          <div className="flex flex-col items-center">
            <FileText className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-[16px] leading-[24px] font-bold text-blue-grey-900 mb-1">{file.name}</h3>
            <p className="text-blue-grey-500 text-[14px] leading-[20px] font-normal font-mono mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            
            <button 
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
              className="px-8 py-3 bg-primary text-white rounded-2xl text-[14px] leading-[20px] font-bold hover:bg-[#005bb5] transition-colors shadow-sm active:scale-95"
            >
              면접 던전 생성하기
            </button>
          </div>
        )}

        {(status === 'UPLOADING' || status === 'PROCESSING') && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-6" />
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-2">
              {status === 'UPLOADING' ? '무기 장착 중...' : '이력서 분석 중...'}
            </h3>
            <p className="text-blue-grey-500 text-[14px] leading-[20px] font-normal">
              {status === 'PROCESSING' && 'AI가 예상 질문을 추출하고 있습니다'}
            </p>
          </div>
        )}

        {status === 'COMPLETED' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-success mb-4" />
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-2">분석 완료!</h3>
            <p className="text-blue-grey-500 text-[14px] leading-[20px] font-normal">곧 던전 입구로 이동합니다...</p>
          </div>
        )}
        
        {status === 'FAILED' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-danger mb-4" />
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-2">오류 발생</h3>
            <p className="text-danger text-[14px] leading-[20px] font-normal mb-6">{errorMsg}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setStatus('IDLE'); setFile(null); }}
              className="px-6 py-2 border border-blue-grey-75 rounded-lg text-blue-grey-700 text-[14px] leading-[20px] font-bold hover:bg-blue-grey-25 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
