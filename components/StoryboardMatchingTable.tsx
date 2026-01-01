
import React, { useState } from 'react';
import { Scene } from '../types';

interface StoryboardMatchingTableProps {
  scenes: Scene[];
  onBack: () => void;
}

const StoryboardMatchingTable: React.FC<StoryboardMatchingTableProps> = ({ scenes, onBack }) => {
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerateTable = () => {
    setIsGenerated(true);
  };

  const copyTableToClipboard = () => {
    const table = document.getElementById('matching-table');
    if (!table) return;
    
    const range = document.createRange();
    range.selectNode(table);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    
    try {
      document.execCommand('copy');
      alert('표가 클립보드에 복사되었습니다. 구글 시트 등에 붙여넣기(Ctrl+V) 하세요.\n\n※ 주의: 구글 시트는 텍스트 전용이므로 이미지는 데이터(Base64) 형태로 복사됩니다. 시각적인 보관은 [PDF 저장]을 이용해 주세요!');
    } catch (err) {
      alert('복사에 실패했습니다.');
    }
    window.getSelection()?.removeAllRanges();
  };

  /**
   * CSV 다운로드 (데이터 위주)
   */
  const downloadCSV = () => {
    // 이미지를 제외한 데이터 중심 헤더
    const headers = ['No', 'Title', 'Script Range (Start ~ End)', 'Narrative', 'Visual Prompt', 'Camera Movement', 'Duration', 'Storage Note'];
    
    const rows = scenes.map(scene => [
      scene.sceneNumber,
      `"${(scene.title || '').replace(/"/g, '""')}"`,
      `"${(scene.scriptStartSentence || '').replace(/"/g, '""')} ~ ${(scene.scriptEndSentence || '').replace(/"/g, '""')}"`,
      `"${(scene.narrative || '').replace(/"/g, '""')}"`,
      `"${(scene.visualPrompt || '').replace(/"/g, '""')}"`,
      `"${(scene.cameraMovement || '').replace(/"/g, '""')}"`,
      `"${(scene.estimatedDuration || '5s').replace(/"/g, '""')}"`,
      `"Images not supported in CSV - Use PDF export for visual reports"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `storyboard_data_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('데이터 CSV가 다운로드되었습니다.\n(이미지는 포함되지 않으니 시각 자료는 PDF로 저장하세요)');
  };

  if (!isGenerated) {
    return (
      <div className="h-full flex items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="max-w-2xl w-full bg-[#1e222d] rounded-xl p-10 border border-white/5 shadow-2xl text-center">
          <div className="mb-6 inline-block p-4 bg-[#DFFF00]/10 rounded-full">
            <svg className="w-12 h-12 text-[#DFFF00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-[#DFFF00] mb-4 uppercase italic">4. 이미지 매칭표 생성</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            생성된 이미지와 대본 정보를 하나의 표로 통합합니다.<br />
            제작 관리용 데이터를 구글 시트에 붙여넣거나 CSV로 저장하세요.
          </p>
          
          <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-lg mb-8 text-left">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-amber-400 text-[11px] leading-relaxed">
                <strong>💡 저장 팁:</strong> CSV 파일 및 구글 시트는 텍스트 전용이므로 이미지가 직접 보이지 않습니다. 
                이미지가 포함된 전체 시각 자료가 필요하시면 좌측의 <strong>[PDF로 전체 저장]</strong>을 사용해 주세요!
              </p>
            </div>
          </div>

          <button 
            onClick={handleGenerateTable}
            className="px-12 py-4 bg-[#5c67f2] text-white font-black rounded-md hover:bg-[#4a54d1] transition-all shadow-lg uppercase italic"
          >
            매칭표 생성하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] min-h-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-[100rem] mx-auto bg-[#1e222d] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between bg-black/20 gap-4">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase mb-1">IMAGE & VIDEO MATCHING TABLE</h2>
            <p className="text-slate-500 text-xs font-medium italic">이미지가 포함된 전체 문서는 사이드바의 [PDF 저장]을 이용하세요.</p>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <button onClick={onBack} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-all">이전 단계로</button>
            <button onClick={downloadCSV} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-2">
              데이터(CSV) 다운로드
            </button>
            <button onClick={copyTableToClipboard} className="px-6 py-2.5 bg-[#DFFF00] text-black rounded-lg text-xs font-black hover:opacity-90 transition-all shadow-lg">전체 표 복사하기</button>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table id="matching-table" className="w-full border-collapse text-left text-white text-[12px]">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 uppercase font-black text-[10px] tracking-widest text-slate-500">
                <th className="p-4 w-12">No</th>
                <th className="p-4 w-40 text-[#4476f5]">Visual (Thumbnail)</th>
                <th className="p-4 w-64">Script Segment (Start ~ End)</th>
                <th className="p-4 w-48">Visual Prompt</th>
                <th className="p-4 w-24">Camera</th>
                <th className="p-4">Narrative</th>
                <th className="p-4 w-16">Time</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene) => (
                <tr key={scene.sceneNumber} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-black text-slate-600 align-top">{scene.sceneNumber}</td>
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-lg">
                        {scene.generatedVideoUrl ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-[8px] text-emerald-400 font-bold uppercase tracking-tighter">VIDEO MODE</div>
                        ) : scene.generatedImageUrl ? (
                          <img src={scene.generatedImageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-800 uppercase italic">Empty</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-2 p-2 bg-slate-900/50 rounded border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500">START:</span>
                        <span className="text-[10px] text-slate-300 italic">"{scene.scriptStartSentence}"</span>
                      </div>
                      <div className="flex flex-col border-t border-white/5 pt-1">
                        <span className="text-[8px] font-black text-slate-500">END:</span>
                        <span className="text-[10px] text-slate-300 italic">"{scene.scriptEndSentence}"</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="text-slate-400 leading-relaxed text-[10px] italic line-clamp-4">
                      "{scene.visualPrompt}"
                    </div>
                  </td>
                  <td className="p-4 align-top font-black text-[#4476f5] uppercase tracking-tighter text-[10px]">
                    {scene.cameraMovement}
                  </td>
                  <td className="p-4 align-top leading-relaxed font-bold text-slate-200 text-[11px]">
                    "{scene.narrative}"
                  </td>
                  <td className="p-4 align-top font-mono text-[#DFFF00] text-[10px] font-bold">
                    {scene.estimatedDuration || '5s'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoryboardMatchingTable;
