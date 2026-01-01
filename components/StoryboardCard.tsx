
import React from 'react';
import { Scene } from '../types';

interface StoryboardCardProps {
  scene: Scene;
  onGenerateImage: (sceneNumber: number) => void;
  onGenerateVideo: (sceneNumber: number) => void;
  onUpdatePrompt: (newPrompt: string) => void;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isSelected: boolean;
  onToggleSelect: (sceneNumber: number) => void;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({ 
  scene, 
  onGenerateImage, 
  onGenerateVideo,
  onUpdatePrompt, 
  isGeneratingImage,
  isGeneratingVideo,
  isSelected,
  onToggleSelect
}) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    if (scene.generatedVideoUrl) {
      link.href = scene.generatedVideoUrl;
      link.download = `scene_${scene.sceneNumber}.mp4`;
    } else if (scene.generatedImageUrl) {
      link.href = scene.generatedImageUrl;
      link.download = `scene_${scene.sceneNumber}.png`;
    } else {
      return;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-[#1e293b] rounded-xl overflow-hidden border-2 ${isSelected ? 'border-[#DFFF00]' : 'border-slate-800'} transition-all flex flex-col relative group`}>
      {/* Title & Selection */}
      <div className="px-3 py-2 bg-[#1a1c23] border-b border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#DFFF00] uppercase">Scene {scene.sceneNumber}</span>
          <h4 className="text-[11px] font-bold text-slate-300 truncate max-w-[150px]">{scene.title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {(scene.generatedImageUrl || scene.generatedVideoUrl) && (
            <button 
              onClick={handleDownload}
              className="text-[#DFFF00] hover:text-white transition-colors no-print"
              title="다운로드"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onToggleSelect(scene.sceneNumber)}
            className="w-4 h-4 rounded border-slate-700 bg-[#0f172a] text-[#DFFF00] focus:ring-[#DFFF00] cursor-pointer no-print"
          />
        </div>
      </div>

      {/* Script Range Indicator */}
      <div className="px-3 py-1.5 bg-black/40 border-b border-slate-800/50">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-1 rounded">START</span>
            <span className="text-[9px] text-slate-400 italic">"{scene.scriptStartSentence}"</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-1 rounded">END</span>
            <span className="text-[9px] text-slate-400 italic ml-1.5">"{scene.scriptEndSentence}"</span>
          </div>
        </div>
      </div>

      {/* Image/Video Area */}
      <div className="aspect-video bg-black relative flex items-center justify-center border-b border-slate-800 overflow-hidden">
        {scene.generatedVideoUrl ? (
          <video src={scene.generatedVideoUrl} controls className="w-full h-full object-cover" />
        ) : scene.generatedImageUrl ? (
          <img src={scene.generatedImageUrl} alt={scene.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-800 flex flex-col items-center">
             {(isGeneratingImage || isGeneratingVideo) ? (
               <div className="w-8 h-8 border-3 border-slate-800 border-t-[#DFFF00] rounded-full animate-spin"></div>
             ) : (
               <svg className="w-12 h-12 opacity-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             )}
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 no-print">
           <button 
             onClick={() => onGenerateImage(scene.sceneNumber)}
             className="w-32 py-2 bg-white text-black text-[10px] font-black rounded hover:bg-[#DFFF00] transition-colors uppercase italic"
           >
             이미지 재생성
           </button>
           <button 
             onClick={() => onGenerateVideo(scene.sceneNumber)}
             className="w-32 py-2 bg-[#e91e63] text-white text-[10px] font-black rounded hover:bg-pink-600 transition-colors uppercase italic"
           >
             영상 생성
           </button>
           {(scene.generatedImageUrl || scene.generatedVideoUrl) && (
             <button 
               onClick={handleDownload}
               className="w-32 py-2 bg-[#4476f5] text-white text-[10px] font-black rounded hover:bg-blue-600 transition-colors uppercase italic"
             >
               파일 다운로드
             </button>
           )}
        </div>
      </div>

      {/* Narrative & Camera Movement */}
      <div className="p-3 bg-[#111827] flex-1">
        <div className="text-[9px] text-emerald-400 font-bold mb-1 uppercase tracking-tighter">🎥 {scene.cameraMovement}</div>
        <p className="text-[10px] text-slate-300 line-clamp-3 leading-relaxed">
          {scene.narrative}
        </p>
      </div>

      <div className="px-3 pb-3 no-print">
        <div className="text-[8px] text-slate-600 font-bold mb-1 uppercase">Visual Prompt</div>
        <textarea
          value={scene.visualPrompt}
          onChange={(e) => onUpdatePrompt(e.target.value)}
          className="w-full h-14 bg-black/40 border border-slate-800 rounded p-1.5 text-[9px] text-slate-500 focus:border-[#DFFF00] outline-none resize-none custom-scrollbar"
        />
      </div>
    </div>
  );
};

export default StoryboardCard;
