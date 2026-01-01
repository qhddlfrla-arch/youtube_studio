
import React, { useState, useEffect } from 'react';
import { Scene, AppStatus, VisualStyle, VISUAL_STYLES, CharacterProfile } from './types';
import { analyzeScript, generateSceneImage, generateSceneVideo, refineScriptForYoutube, generateCharacterImage } from './services/geminiService';
import { saveProject, loadProject, clearProject } from './services/storageService';
import Header from './components/Header';
import StoryboardCard from './components/StoryboardCard';
import StoryboardMatchingTable from './components/StoryboardMatchingTable';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const PROJECT_ID = 'STORYBOARD_PRO_PROJECT';

const INITIAL_CHARACTERS: CharacterProfile[] = [
  { id: 'husband', name: '문철수', description: '70세 한국 남성, 은발, 얇은 금테 안경, 인자하고 따뜻한 눈매, 수수한 셔츠 차림.', isGenerating: false },
  { id: 'wife', name: '박영순', description: '70세 한국 여성, 우아한 짧은 펌 회색 머리, 밝고 따뜻한 미소, 단정한 앞치마.', isGenerating: false }
];

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeySaved, setApiKeySaved] = useState<boolean>(false);
  const [script, setScript] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characterProfiles, setCharacterProfiles] = useState<CharacterProfile[]>(INITIAL_CHARACTERS);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [generatingSceneIds, setGeneratingSceneIds] = useState<Set<number>>(new Set());
  const [generatingVideoId, setGeneratingVideoId] = useState<number | null>(null);
  const [isGeneratingAllScenes, setIsGeneratingAllScenes] = useState<boolean>(false);
  const [isGeneratingAllCharacters, setIsGeneratingAllCharacters] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>('Default');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Load from IndexedDB on Mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const saved = await loadProject(PROJECT_ID);
        if (saved) {
          if (saved.script !== undefined) setScript(saved.script);
          if (saved.scenes !== undefined) setScenes(saved.scenes);
          if (saved.characterProfiles !== undefined) setCharacterProfiles(saved.characterProfiles);
          if (saved.activeStep !== undefined) setActiveStep(saved.activeStep);
          if (saved.selectedStyle !== undefined) setSelectedStyle(saved.selectedStyle);
          if (saved.selectedScenes !== undefined) setSelectedScenes(new Set(saved.selectedScenes));
        }
      } catch (e) {
        console.error("Failed to load project from IndexedDB", e);
      }
    };
    loadSavedData();
  }, []);

  // Save to IndexedDB on Changes
  useEffect(() => {
    const saveData = async () => {
      if (activeStep === 1 && !script && scenes.length === 0) return;
      try {
        const dataToSave = {
          script,
          scenes,
          characterProfiles,
          activeStep,
          selectedStyle,
          selectedScenes: Array.from(selectedScenes)
        };
        await saveProject(PROJECT_ID, dataToSave);
      } catch (e) {
        console.error("Failed to save project", e);
      }
    };
    saveData();
  }, [script, scenes, characterProfiles, activeStep, selectedStyle, selectedScenes]);

  /**
   * 고성능 PDF 저장 (메모리 절약형 순차 캡처)
   */
  const handleExportPDF = async () => {
    if (scenes.length === 0) return alert("저장할 장면이 없습니다.");
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      // 임시 렌더링 컨테이너 확보
      const cards = document.querySelectorAll('.storyboard-card-item');
      if (cards.length === 0) throw new Error("장면 요소를 찾을 수 없습니다.");

      for (let i = 0; i < cards.length; i++) {
        setExportProgress(Math.round(((i + 1) / cards.length) * 100));
        const card = cards[i] as HTMLElement;
        
        // 개별 카드 캡처
        const canvas = await html2canvas(card, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#1e293b'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const imgWidth = pdfWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // 한 페이지에 카드 2개씩 넣기 (공간 확인)
        const currentPos = (i % 2 === 0) ? margin : (pdfHeight / 2) + 5;
        
        if (i > 0 && i % 2 === 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', margin, currentPos, imgWidth, imgHeight > (pdfHeight/2 - 15) ? (pdfHeight/2 - 15) : imgHeight);
        
        // 하단에 텍스트 정보 추가
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Scene ${scenes[i].sceneNumber} - Page ${pdf.internal.getNumberOfPages()}`, margin, currentPos + (pdfHeight/2 - 10));
      }

      pdf.save(`storyboard_report_${new Date().getTime()}.pdf`);
      alert("PDF 리포트가 성공적으로 생성되었습니다.");
    } catch (err) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다. 장면 수를 줄이거나 잠시 후 다시 시도해주세요.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  /**
   * 일괄 다운로드 (안정성 강화)
   */
  const handleDownloadAllImages = () => {
    const generatedScenes = scenes.filter(s => s.generatedImageUrl);
    if (generatedScenes.length === 0) return alert("생성된 이미지가 없습니다.");
    
    if (window.confirm(`${generatedScenes.length}개의 파일을 다운로드합니다. 계속하시겠습니까?`)) {
      generatedScenes.forEach((scene, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = scene.generatedImageUrl!;
          link.download = `scene_${String(scene.sceneNumber).padStart(3, '0')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 500); // 0.5초 간격으로 브라우저 부하 방지
      });
    }
  };

  /**
   * 프로젝트 초기화 (IndexedDB 및 모든 상태 소거)
   */
  const handleReset = async () => {
    if (window.confirm("주의: 모든 작업 내역과 이미지가 영구 삭제됩니다. 계속하시겠습니까?")) {
      try {
        await clearProject(PROJECT_ID);
        // 모든 상태 초기화 후 새로고침으로 깨끗하게 시작
        window.location.href = window.location.origin + window.location.pathname;
      } catch (e) {
        alert("초기화 중 오류가 발생했습니다.");
      }
    }
  };

  const handleRefineScript = async () => {
    if (!script.trim()) return;
    setIsRefining(true);
    try {
      const refined = await refineScriptForYoutube(script);
      setScript(refined);
      alert("대본 최적화 완료!");
    } catch (err: any) { alert(err.message); } finally { setIsRefining(false); }
  };

  const handleAnalyze = async () => {
    if (!script.trim()) return;
    setStatus(AppStatus.ANALYZING);
    try {
      const analyzedScenes = await analyzeScript(script);
      setScenes(analyzedScenes);
      setSelectedScenes(new Set(analyzedScenes.map(s => s.sceneNumber)));
      setActiveStep(2);
    } catch (err: any) { alert(err.message); } finally { setStatus(AppStatus.IDLE); }
  };

  const handleGenerateCharacter = async (id: string) => {
    const profile = characterProfiles.find(p => p.id === id);
    if (!profile) return;
    setCharacterProfiles(prev => prev.map(p => p.id === id ? { ...p, isGenerating: true } : p));
    try {
      const img = await generateCharacterImage(profile, selectedStyle);
      setCharacterProfiles(prev => prev.map(p => p.id === id ? { ...p, imageUrl: img, isGenerating: false } : p));
    } catch (err: any) {
      setCharacterProfiles(prev => prev.map(p => p.id === id ? { ...p, isGenerating: false } : p));
    }
  };

  const handleGenerateAllCharacters = async () => {
    setIsGeneratingAllCharacters(true);
    for (const char of characterProfiles) {
      if (!char.imageUrl) await handleGenerateCharacter(char.id);
    }
    setIsGeneratingAllCharacters(false);
  };

  const handleGenerateImage = async (sceneNumber: number) => {
    setGeneratingSceneIds(prev => new Set(prev).add(sceneNumber));
    try {
      const scene = scenes.find(s => s.sceneNumber === sceneNumber);
      if (!scene) return;
      const img = await generateSceneImage(scene.visualPrompt, selectedStyle, characterProfiles);
      setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, generatedImageUrl: img } : s));
    } catch (err: any) { console.error(err); } finally {
      setGeneratingSceneIds(prev => {
        const n = new Set(prev);
        n.delete(sceneNumber);
        return n;
      });
    }
  };

  const handleGenerateAllImages = async () => {
    const selected = Array.from(selectedScenes) as number[];
    if (!selected.length) return alert("선택된 장면이 없습니다.");
    setIsGeneratingAllScenes(true);
    for (const id of selected) {
      const scene = scenes.find(s => s.sceneNumber === id);
      if (scene && !scene.generatedImageUrl) {
        await handleGenerateImage(id);
      }
    }
    setIsGeneratingAllScenes(false);
  };

  const handleGenerateVideo = async (sceneNumber: number) => {
    alert("현재 이미지 기반 영상 생성 모듈을 준비 중입니다.");
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* API 키 입력란 */}
      <div className="w-full bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-800">
        <label htmlFor="api-key-input" className="text-xs font-bold text-slate-400">API Key</label>
        <input
          id="api-key-input"
          type="password"
          value={apiKey}
          onChange={e => {
            setApiKey(e.target.value);
            setApiKeySaved(false);
          }}
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs w-80 focus:ring-2 focus:ring-[#DFFF00] outline-none"
          placeholder="API 키를 입력하세요"
        />
        <button
          onClick={() => setApiKeySaved(true)}
          className="ml-2 px-4 py-2 bg-[#DFFF00] text-black text-xs font-bold rounded hover:bg-yellow-300 transition-all"
        >확인</button>
        {apiKeySaved && (
          <span className="ml-4 text-emerald-400 text-xs font-bold">API 키가 저장되었습니다</span>
        )}
      </div>
      <Header currentStep={activeStep} onStepClick={setActiveStep} />
      <main className="flex-1 flex overflow-hidden">
        {(activeStep === 3 || activeStep === 4) && (
          <aside className="w-80 bg-[#1e293b] border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar no-print">
            <button onClick={handleReset} className="w-full py-3 bg-red-900/20 border border-red-500/40 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-900/40 transition-all uppercase italic">프로젝트 데이터 완전 초기화</button>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">저장 및 내보내기</label>
              <button 
                onClick={handleExportPDF} 
                disabled={isExporting} 
                className={`w-full py-3 ${isExporting ? 'bg-slate-700' : 'bg-emerald-600'} text-white text-[10px] font-black rounded-lg border border-white/10 italic flex items-center justify-center gap-2`}
              >
                {isExporting ? `PDF 생성 중 (${exportProgress}%)` : 'PDF 리포트 저장 (A4)'}
              </button>
              <button onClick={handleDownloadAllImages} className="w-full py-3 bg-blue-600 text-white text-[10px] font-black rounded-lg border border-white/10 italic">이미지 파일 일괄 다운로드</button>
              <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] text-slate-400 font-bold uppercase">IndexedDB 자동 보관 활성화됨</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">시각적 스타일 (재생성 시 적용)</label>
              <div className="grid grid-cols-1 gap-2">
                {VISUAL_STYLES.map(style => (
                  <button key={style.id} onClick={() => setSelectedStyle(style.id)} className={`p-3 rounded-lg text-left transition-all border ${selectedStyle === style.id ? 'bg-slate-700 border-[#DFFF00]' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}>
                    <div className={`text-[11px] font-black ${selectedStyle === style.id ? 'text-[#DFFF00]' : 'text-white'}`}>{style.label}</div>
                    <div className="text-[9px] text-slate-500 mt-1 leading-tight">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeStep === 1 && (
            <div className="max-w-4xl mx-auto py-10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black italic"><span className="text-[#DFFF00]">/</span> 1. 대본 입력</h2>
                <div className="flex gap-2">
                  <button onClick={handleReset} className="px-4 py-2 bg-slate-800 text-slate-400 text-[10px] font-black rounded-lg">초기화</button>
                  <button onClick={handleRefineScript} disabled={isRefining} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-lg">{isRefining ? '최적화 중...' : '유튜브 정책 최적화'}</button>
                </div>
              </div>
              <textarea value={script} onChange={e => setScript(e.target.value)} className="w-full h-96 bg-[#1e293b] border border-slate-700 rounded-xl p-6 text-white text-lg focus:ring-2 focus:ring-[#DFFF00] outline-none transition-all" placeholder="대본을 입력하세요. 문장 단위로 촘촘하게 분석됩니다." />
              <button onClick={handleAnalyze} className="w-full py-5 bg-[#DFFF00] text-black font-black rounded-xl text-xl italic uppercase shadow-[0_0_20px_rgba(223,255,0,0.2)]">초고밀도 장면 분석 시작 (최대 100컷)</button>
            </div>
          )}

          {activeStep === 2 && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic uppercase">2. Scene Analysis ({scenes.length} Shots)</h2>
                <div className="flex gap-3">
                  <button onClick={handleReset} className="px-6 py-3 bg-slate-800 text-slate-400 font-bold rounded-lg text-xs">초기화</button>
                  <button onClick={() => setActiveStep(3)} className="px-8 py-3 bg-[#DFFF00] text-black font-black rounded-lg italic">이미지 제작 단계로</button>
                </div>
              </div>
              <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-800 font-mono text-[12px] text-emerald-400 max-h-[70vh] overflow-auto custom-scrollbar">
                <div className="space-y-4">
                  {scenes.map(s => (
                    <div key={s.sceneNumber} className="border-b border-white/5 pb-2">
                      <span className="text-[#DFFF00] font-bold">SHOT {String(s.sceneNumber).padStart(3, '0')}:</span> {s.narrative}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div id="storyboard-container" className="space-y-12">
              <section className="space-y-4 no-print">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#DFFF00]"></div>
                      <h3 className="text-xl font-black italic uppercase">주요 등장인물 레퍼런스</h3>
                   </div>
                   <button onClick={handleGenerateAllCharacters} disabled={isGeneratingAllCharacters} className="px-4 py-2 bg-slate-800 border border-white/10 text-white text-[10px] font-black rounded hover:bg-slate-700 transition-all uppercase italic">인물 전체 생성</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {characterProfiles.map(profile => (
                    <div key={profile.id} className="min-w-[140px] max-w-[140px] bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden flex flex-col group relative">
                      <div className="aspect-square bg-black relative">
                        {profile.imageUrl ? <img src={profile.imageUrl} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center">
                            {profile.isGenerating ? <div className="w-4 h-4 border-2 border-slate-700 border-t-[#DFFF00] rounded-full animate-spin"></div> : <div className="text-[8px] text-slate-700 uppercase italic">Empty</div>}
                          </div>
                        )}
                        <button onClick={() => handleGenerateCharacter(profile.id)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-black text-[#DFFF00] uppercase italic">재생성</button>
                      </div>
                      <div className="p-2 bg-[#111827]">
                        <div className="text-[10px] font-black text-white truncate">{profile.name}</div>
                        <div className="text-[8px] text-slate-500 mt-1 line-clamp-1">{profile.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between no-print">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-[#e91e63]"></div>
                    <h3 className="text-xl font-black italic uppercase">장면 스토리보드 ({scenes.length})</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGenerateAllImages} disabled={isGeneratingAllScenes} className={`px-5 py-2.5 ${isGeneratingAllScenes ? 'bg-slate-700' : 'bg-[#e91e63]'} text-white text-[10px] font-black rounded-lg italic uppercase`}>
                      {isGeneratingAllScenes ? '일괄 생성 중...' : '선택 장면 이미지 일괄 생성'}
                    </button>
                    <button onClick={() => setActiveStep(4)} className="px-5 py-2.5 bg-[#DFFF00] text-black text-[10px] font-black rounded-lg italic uppercase">데이터 매칭표</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {scenes.map(scene => (
                    <div key={scene.sceneNumber} className="storyboard-card-item">
                      <StoryboardCard 
                        scene={scene}
                        onGenerateImage={handleGenerateImage}
                        onGenerateVideo={handleGenerateVideo}
                        onUpdatePrompt={p => setScenes(prev => prev.map(s => s.sceneNumber === scene.sceneNumber ? { ...s, visualPrompt: p } : s))}
                        isGeneratingImage={generatingSceneIds.has(scene.sceneNumber)}
                        isGeneratingVideo={generatingVideoId === scene.sceneNumber}
                        isSelected={selectedScenes.has(scene.sceneNumber)}
                        onToggleSelect={(id: number) => setSelectedScenes(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeStep === 4 && <StoryboardMatchingTable scenes={scenes} onBack={() => setActiveStep(3)} />}
          {activeStep === 5 && (
            <div className="max-w-6xl mx-auto p-8 bg-[#1e293b] rounded-2xl border border-slate-800">
               <h2 className="text-2xl font-black italic uppercase mb-6">FINAL PRODUCTION DATA (JSON)</h2>
               <div className="bg-black/40 p-6 rounded-lg font-mono text-xs text-emerald-400 overflow-auto max-h-[60vh]">
                  {JSON.stringify({ project: PROJECT_ID, totalScenes: scenes.length, scenes }, null, 2)}
               </div>
            </div>
          )}
        </div>
      </main>

      {status === AppStatus.ANALYZING && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-[#DFFF00] rounded-full animate-spin"></div>
          <div className="text-white font-black italic uppercase tracking-widest animate-pulse">Analyzing script for maximum shots...</div>
        </div>
      )}
    </div>
  );
};

export default App;
