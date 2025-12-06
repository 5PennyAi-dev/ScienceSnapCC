import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { X, CheckCircle, XCircle, Trophy, RefreshCw, ArrowRight } from 'lucide-react';
import Confetti from 'react-confetti';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  questions: QuizQuestion[];
  colorProfile?: string; // Optional hex for theming
}

export const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, title, questions, colorProfile }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setShowResults(false);
    }
  }, [isOpen]);

  // Window resize listener for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white p-6 rounded-2xl max-w-sm text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">Quiz load error</h3>
            <p className="text-gray-600 mb-4">No questions found for this quiz.</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">Close</button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedOption === currentQuestion?.correctAnswerIndex;
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    let message = "Good effort!";
    if (percentage === 100) message = "Perfect Score! 🌟";
    else if (percentage >= 80) message = "Amazing Job! 🎉";
    else if (percentage >= 60) message = "Well Done! 👍";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        {percentage >= 60 && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}
        
        <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl transform transition-all animate-scale-in">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-300 drop-shadow-md" />
            <h2 className="text-3xl font-bold mb-2">{message}</h2>
            <div className="text-white/80 font-medium">You completed the quiz!</div>
          </div>
          
          <div className="p-8 text-center space-y-6">
            <div className="flex flex-col items-center">
              <div className="text-6xl font-black text-slate-800 mb-2">
                {score}<span className="text-2xl text-slate-400 font-bold">/{questions.length}</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Final Score
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <button 
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedOption(null);
                  setIsAnswered(false);
                  setScore(0);
                  setShowResults(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Play Again
              </button>
              <button 
                onClick={onClose}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-slate-300"
              >
                Close
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Interactive Quiz</div>
            <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentQuestionIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
              Question {currentQuestionIndex + 1}/{questions.length}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-8 leading-snug">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              let stateStyles = "border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 transition-all cursor-pointer";
              let icon = null;

              if (isAnswered) {
                if (idx === currentQuestion.correctAnswerIndex) {
                  stateStyles = "bg-green-100 border-2 border-green-500 text-green-800 shadow-md ring-2 ring-green-500/20";
                  icon = <CheckCircle className="w-6 h-6 text-green-600" />;
                } else if (idx === selectedOption) {
                  stateStyles = "bg-red-50 border-2 border-red-500 text-red-800 opacity-60";
                  icon = <XCircle className="w-6 h-6 text-red-500" />;
                } else {
                  stateStyles = "border border-gray-200 opacity-40 grayscale";
                }
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  className={`relative p-5 rounded-xl flex items-center justify-between gap-4 text-left font-medium text-lg group ${stateStyles} ${selectedOption === idx ? 'scale-[1.02]' : ''}`}
                >
                  <span className="flex-1">{option}</span>
                  {icon}
                </div>
              );
            })}
          </div>

          {/* Explanation Reveal */}
          {isAnswered && (
            <div className={`mt-8 p-6 rounded-2xl animate-slide-up ${isCorrect ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-1.5 rounded-full ${isCorrect ? 'bg-green-200 text-green-700' : 'bg-blue-200 text-blue-700'}`}>
                  {isCorrect ? <CheckCircle className="w-4 h-4" /> : <TrendingUpIcon className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className={`font-bold text-sm uppercase tracking-wide mb-1 ${isCorrect ? 'text-green-800' : 'text-blue-800'}`}>
                    {isCorrect ? "Correct!" : "Did you know?"}
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-lg transition-all
              ${isAnswered 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-1' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Start Icon for "Did you know" (Lightbulb/Info alternative)
function TrendingUpIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
