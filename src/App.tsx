import React, { useState, useCallback } from 'react';
import { generateStorybookStream, StreamUpdate } from './services/geminiService';
import { StoryPage, QuizQuestion } from './types';
import { PAGE_THEMES, TOPICS, LOADING_STEPS } from './constants';

export default function App() {
  const [phase, setPhase] = useState<"home" | "loading" | "storybook" | "quiz" | "results">("home");
  const [topic, setTopic] = useState("");
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [fading, setFading] = useState(false);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [streamingPages, setStreamingPages] = useState<StoryPage[]>([]);

  const handleGenerate = useCallback(async (t?: string) => {
    const finalTopic = t || topic;
    if (!finalTopic.trim()) { setError("Please enter a topic first! 📚"); return; }

    setError("");
    setTopic(finalTopic);
    setPhase("loading");
    setLoadingStep(0);
    setCurrentPage(0);
    setStreamingPages([]);
    setPages([]);
    setQuiz([]);
    setQuizAnswers([]);
    setCurrentQ(0);

    let step = 0;
    const iv = setInterval(() => {
      step++;
      setLoadingStep(step);
      if (step >= LOADING_STEPS.length - 1) clearInterval(iv);
    }, 800);

    try {
      await generateStorybookStream(finalTopic, (update: StreamUpdate) => {
        switch (update.type) {

          // Status updates — shown in loading screen
          case "status":
            setStatusMessage(update.message || "");
            break;

          // PAGE arrives — this is the INTERLEAVED magic! ✨
          // Each page streams in one by one as Gemini generates it
          case "page":
            if (update.page) {
              const themedPage = {
                ...update.page,
                emoji: [...(update.page.illustration || "📖")][0] || "📖",
                ...PAGE_THEMES[(update.pageNumber! - 1) % PAGE_THEMES.length],
              };
              setStreamingPages(prev => [...prev, themedPage]);
            }
            break;

          // Quiz arrives after all pages
          case "quiz":
            if (update.quiz) setQuiz(update.quiz);
            break;

          // All done! Show the storybook
          case "complete":
            clearInterval(iv);
            setLoadingStep(LOADING_STEPS.length);
            setStreamingPages(prev => {
              setPages(prev);
              return prev;
            });
            setTimeout(() => setPhase("storybook"), 600);
            break;

          // Error handling
          case "error":
            clearInterval(iv);
            setError("⚠️ " + (update.message || "Something went wrong. Try again!"));
            setPhase("home");
            break;
        }
      });
    } catch (err: any) {
      clearInterval(iv);
      setError("⚠️ " + (err.message || "Could not connect to agent. Is it running?"));
      setPhase("home");
    }
  }, [topic]);

  const flipPage = (dir: "next" | "prev") => {
    if (fading) return;
    if (dir === "next" && currentPage >= pages.length - 1) return;
    if (dir === "prev" && currentPage <= 0) return;
    setDirection(dir === "next" ? 1 : -1);
    setFading(true);
    setTimeout(() => { setCurrentPage(p => dir === "next" ? p + 1 : p - 1); setFading(false); }, 320);
  };

  const handleAnswer = (idx: number) => {
    if (showCorrect) return;
    setSelectedAnswer(idx);
    setShowCorrect(true);
    setTimeout(() => {
      setQuizAnswers(prev => [...prev, idx]);
      setShowCorrect(false);
      setSelectedAnswer(null);
      if (currentQ < quiz.length - 1) { setCurrentQ(q => q + 1); }
      else { setPhase("results"); }
    }, 1200);
  };

  const score = quizAnswers.filter((a, i) => quiz[i] && a === quiz[i].correct).length;
  const page = pages[currentPage];
  const q = quiz[currentQ];

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: "100vh", background: "linear-gradient(135deg, #fdf4e3, #fce8d5, #f9d5e5)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@600;700;800&display=swap');
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes popIn { from{transform:scale(0.82);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes floatUp { from{transform:translateY(0)} to{transform:translateY(-18px)} }
        @keyframes slideIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .bounce-it { animation: bounce 2s ease-in-out infinite; }
        .spin-it { animation: spin 2.5s linear infinite; }
        .pop-in { animation: popIn 0.55s cubic-bezier(.34,1.56,.64,1) both; }
        .slide-in { animation: slideIn 0.4s ease both; }
        .ilbtn { transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; border: none; }
        .ilbtn:hover:not(:disabled) { transform: scale(1.07) rotate(-1deg); }
        .ilbtn:active:not(:disabled) { transform: scale(0.95); }
        .ilbtn:disabled { opacity: 0.4; cursor: not-allowed; }
        .chip { transition: all 0.18s; cursor: pointer; user-select: none; }
        .chip:hover { transform: scale(1.07); background: #fde68a !important; }
        .opt-btn { transition: all 0.2s; cursor: pointer; border: none; text-align: left; width: 100%; }
        .opt-btn:hover { transform: translateX(4px); }
        input:focus { outline: none; border-color: #c4b5fd !important; box-shadow: 0 0 0 3px rgba(196,181,253,0.25); }
      `}</style>

      {/* Floating bg */}
      {["🌟","✨","🌈","💫","🎨","📚","🌸","🦋","⭐","🎀"].map((e,i)=>(
        <div key={i} style={{position:"fixed",left:`${(i*23+7)%93}%`,top:`${(i*37+13)%88}%`,fontSize:`${12+(i%4)*4}px`,opacity:0.08,animation:`floatUp ${2.5+i%3}s ease-in-out ${i*0.35}s infinite alternate`,pointerEvents:"none",zIndex:0}}>{e}</div>
      ))}

      {/* ════ HOME ════ */}
      {phase === "home" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",position:"relative",zIndex:1}}>
          <div className="pop-in" style={{textAlign:"center",marginBottom:"12px"}}>
            <div className="bounce-it" style={{fontSize:"76px",lineHeight:1}}>📚</div>
            <h1 style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(2.8rem,9vw,5rem)",margin:"6px 0 0",background:"linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>IllumiLearn</h1>
            <p style={{fontSize:"0.88rem",color:"#7c3aed",fontWeight:800,margin:"4px 0 0",letterSpacing:"3px",textTransform:"uppercase"}}>✨ Illuminate Every Concept ✨</p>
          </div>

          <div className="pop-in" style={{background:"white",borderRadius:"32px",padding:"32px 28px",maxWidth:"480px",width:"100%",boxShadow:"0 20px 60px rgba(236,72,153,0.14)",border:"3px solid #fce7f3",animationDelay:"0.1s"}}>
            {error && <div style={{background:"#fef2f2",border:"2px solid #fca5a5",borderRadius:"14px",padding:"10px 14px",marginBottom:"16px",fontSize:"0.85rem",color:"#dc2626",fontWeight:700}}>{error}</div>}
            <p style={{fontSize:"1rem",color:"#6b7280",textAlign:"center",marginBottom:"14px",fontWeight:700}}>🌟 What would you like to learn today?</p>
            <div style={{display:"flex",gap:"10px",marginBottom:"18px"}}>
              <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleGenerate()}
                placeholder="e.g. How do volcanoes work? 🌋"
                style={{flex:1,padding:"13px 16px",borderRadius:"16px",border:"2px solid #f9a8d4",fontSize:"0.95rem",color:"#374151",background:"#fdf9f0"}}/>
              <button className="ilbtn" onClick={()=>handleGenerate()}
                style={{background:"linear-gradient(135deg,#f97316,#ec4899)",color:"white",borderRadius:"16px",padding:"13px 18px",fontSize:"1.4rem",boxShadow:"0 4px 15px rgba(236,72,153,0.4)"}}>🚀</button>
            </div>
            <p style={{fontSize:"0.72rem",color:"#9ca3af",textAlign:"center",marginBottom:"10px",fontWeight:800,letterSpacing:"1.5px",textTransform:"uppercase"}}>Or pick a topic:</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px",justifyContent:"center"}}>
              {TOPICS.map(t=>(
                <span key={t} className="chip" onClick={()=>handleGenerate(t)}
                  style={{background:"#fef3c7",border:"2px solid #fde68a",borderRadius:"20px",padding:"6px 13px",fontSize:"0.83rem",fontWeight:800,color:"#92400e"}}>{t}</span>
              ))}
            </div>
          </div>
          <p style={{fontSize:"0.7rem",color:"#d1d5db",marginTop:"16px",fontWeight:600}}>Powered by Gemini AI ✦ Google Cloud</p>
        </div>
      )}

      {/* ════ LOADING — shows pages streaming in real time ════ */}
      {phase === "loading" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1,position:"relative",padding:"24px"}}>
          <div className="spin-it" style={{fontSize:"68px",marginBottom:"16px"}}>📖</div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"2rem",color:"#7c3aed",margin:"0 0 6px",textAlign:"center"}}>Creating your storybook...</h2>
          <p style={{color:"#9ca3af",marginBottom:"20px",fontWeight:700,textAlign:"center"}}>About "{topic}"</p>

          {/* Status message from agent */}
          {statusMessage && (
            <div style={{background:"white",borderRadius:"14px",padding:"10px 20px",marginBottom:"16px",fontWeight:700,color:"#7c3aed",fontSize:"0.9rem",boxShadow:"0 4px 14px rgba(124,58,237,0.12)",border:"2px solid #ddd6fe"}}>
              {statusMessage}
            </div>
          )}

          {/* Loading steps */}
          <div style={{display:"flex",flexDirection:"column",gap:"11px",width:"100%",maxWidth:"285px",marginBottom:"20px"}}>
            {LOADING_STEPS.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",background:i<=loadingStep?"white":"rgba(255,255,255,0.45)",borderRadius:"16px",padding:"12px 16px",boxShadow:i<=loadingStep?"0 4px 20px rgba(124,58,237,0.12)":"none",border:`2px solid ${i<=loadingStep?"#c4b5fd":"#e5e7eb"}`,transition:"all 0.4s ease",transform:i===loadingStep?"scale(1.04)":"scale(1)"}}>
                <span style={{fontSize:"1.4rem",animation:i===loadingStep?"bounce 0.7s infinite":"none"}}>{s.icon}</span>
                <span style={{fontWeight:700,color:i<=loadingStep?"#7c3aed":"#9ca3af",fontSize:"0.88rem",flex:1}}>{s.text}</span>
                {i<loadingStep&&<span>✅</span>}
                {i===loadingStep&&<span style={{animation:"shimmer 1s infinite"}}>⏳</span>}
              </div>
            ))}
          </div>

          {/* Pages streaming in — INTERLEAVED output visible! */}
          {streamingPages.length > 0 && (
            <div style={{width:"100%",maxWidth:"400px"}}>
              <p style={{fontSize:"0.75rem",color:"#9ca3af",textAlign:"center",fontWeight:800,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px"}}>
                Pages ready: {streamingPages.length} / 6
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {streamingPages.map((p, i) => (
                  <div key={i} className="slide-in"
                    style={{background:`linear-gradient(135deg,${p.colors![0]},${p.colors![1]})`,borderRadius:"14px",padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 4px 12px rgba(0,0,0,0.08)",border:"2px solid rgba(255,255,255,0.8)"}}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.title} style={{width:"48px",height:"48px",borderRadius:"10px",objectFit:"cover"}}/>
                    ) : (
                      <span style={{fontSize:"1.8rem"}}>{p.emoji}</span>
                    )}
                    <div>
                      <p style={{fontFamily:"'Fredoka One',cursive",fontSize:"0.9rem",color:p.accent,margin:0}}>{p.title}</p>
                      <p style={{fontSize:"0.75rem",color:"#374151",margin:0,fontWeight:600,opacity:0.8}}>{p.text.substring(0,60)}...</p>
                    </div>
                    <span style={{marginLeft:"auto",fontSize:"1rem"}}>✅</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ STORYBOOK ════ */}
      {phase === "storybook" && page && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",zIndex:1,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px",width:"100%",maxWidth:"580px"}}>
            <button className="ilbtn" onClick={()=>setPhase("home")} style={{background:"white",border:"2px solid #fca5a5",borderRadius:"12px",padding:"8px 14px",fontWeight:800,color:"#ef4444",fontSize:"0.83rem"}}>← Home</button>
            <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.1rem",color:"#7c3aed",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>📚 {topic}</h2>
            <button className="ilbtn" onClick={()=>handleGenerate(topic)} style={{background:"white",border:"2px solid #c4b5fd",borderRadius:"12px",padding:"8px 12px",fontWeight:800,color:"#7c3aed",fontSize:"0.8rem"}}>🔄 Redo</button>
          </div>

          {/* Book card */}
          <div style={{background:`linear-gradient(135deg,${page.colors![0]},${page.colors![1]})`,borderRadius:"32px",maxWidth:"580px",width:"100%",boxShadow:"0 28px 70px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.85)",border:"4px solid rgba(255,255,255,0.85)",overflow:"hidden",opacity:fading?0:1,transform:fading?`scale(0.95) translateX(${direction*24}px)`:"scale(1) translateX(0)",transition:"opacity 0.3s ease,transform 0.3s ease"}}>
            {page.imageUrl ? (
              <img src={page.imageUrl} alt={page.title} style={{width:"100%",height:"200px",objectFit:"cover",display:"block"}}/>
            ) : (
              <div style={{width:"100%",height:"160px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.8rem",letterSpacing:"8px",background:"rgba(255,255,255,0.3)"}}>
                {page.illustration}
              </div>
            )}
            <div style={{padding:"24px 28px",textAlign:"center",position:"relative"}}>
              <div style={{position:"absolute",top:0,right:0,width:"40px",height:"40px",background:"rgba(255,255,255,0.4)",borderRadius:"0 0 0 24px"}}/>
              <div className="bounce-it" style={{fontSize:"42px",marginBottom:"8px"}}>{page.emoji}</div>
              <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.45rem",color:page.accent,margin:"0 0 12px",lineHeight:1.2}}>{page.title}</h3>
              <p style={{fontSize:"1rem",color:"#374151",lineHeight:1.8,fontWeight:600,maxWidth:"420px",margin:"0 auto"}}>{page.text}</p>
              <div style={{position:"absolute",bottom:"12px",right:"18px",fontFamily:"'Fredoka One',cursive",color:page.accent,opacity:0.55,fontSize:"0.85rem"}}>{currentPage+1}/{pages.length}</div>
            </div>
          </div>

          {/* Dots */}
          <div style={{display:"flex",gap:"8px",margin:"16px 0 13px"}}>
            {pages.map((_,i)=>(
              <div key={i} onClick={()=>!fading&&setCurrentPage(i)}
                style={{width:i===currentPage?"28px":"10px",height:"10px",borderRadius:"5px",background:i===currentPage?"#7c3aed":"#ddd6fe",transition:"all 0.3s ease",cursor:"pointer"}}/>
            ))}
          </div>

          {/* Nav */}
          <div style={{display:"flex",gap:"12px"}}>
            <button className="ilbtn" onClick={()=>flipPage("prev")} disabled={currentPage===0}
              style={{background:currentPage===0?"#f3f4f6":"white",color:currentPage===0?"#9ca3af":"#7c3aed",border:`2px solid ${currentPage===0?"#e5e7eb":"#c4b5fd"}`,borderRadius:"16px",padding:"12px 22px",fontFamily:"'Fredoka One',cursive",fontSize:"1rem",boxShadow:currentPage===0?"none":"0 4px 14px rgba(124,58,237,0.18)"}}>← Prev</button>
            <button className="ilbtn" onClick={()=>flipPage("next")} disabled={currentPage===pages.length-1}
              style={{background:currentPage===pages.length-1?"#f3f4f6":"linear-gradient(135deg,#8b5cf6,#ec4899)",color:currentPage===pages.length-1?"#9ca3af":"white",border:"none",borderRadius:"16px",padding:"12px 22px",fontFamily:"'Fredoka One',cursive",fontSize:"1rem",boxShadow:currentPage===pages.length-1?"none":"0 4px 14px rgba(139,92,246,0.38)"}}>Next →</button>
          </div>

          {currentPage===pages.length-1&&(
            <button className="ilbtn" onClick={()=>{setCurrentQ(0);setQuizAnswers([]);setPhase("quiz");}}
              style={{marginTop:"14px",background:"linear-gradient(135deg,#f97316,#ec4899)",color:"white",borderRadius:"16px",padding:"14px 28px",fontFamily:"'Fredoka One',cursive",fontSize:"1.05rem",boxShadow:"0 6px 22px rgba(236,72,153,0.42)"}}>
              🧠 Take the Quiz!
            </button>
          )}
        </div>
      )}

      {/* ════ QUIZ ════ */}
      {phase === "quiz" && q && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",zIndex:1,position:"relative"}}>
          <div className="pop-in" style={{background:"white",borderRadius:"32px",padding:"36px 30px",maxWidth:"500px",width:"100%",boxShadow:"0 20px 60px rgba(124,58,237,0.15)",border:"3px solid #ddd6fe"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <span style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7c3aed"}}>🧠 Quiz Time!</span>
              <span style={{fontSize:"0.85rem",color:"#9ca3af",fontWeight:800}}>Q{currentQ+1} of {quiz.length}</span>
            </div>
            <div style={{background:"#f3f4f6",borderRadius:"8px",height:"8px",marginBottom:"24px",overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,#8b5cf6,#ec4899)",height:"100%",borderRadius:"8px",width:`${(currentQ/quiz.length)*100}%`,transition:"width 0.4s ease"}}/>
            </div>
            <h3 style={{fontSize:"1.15rem",color:"#374151",fontWeight:800,marginBottom:"20px",lineHeight:1.5}}>{q.question}</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {q.options.map((opt,i)=>{
                let bg="white",border="2px solid #e5e7eb",color="#374151";
                if(showCorrect){
                  if(i===q.correct){bg="#f0fdf4";border="2px solid #86efac";color="#16a34a";}
                  else if(i===selectedAnswer){bg="#fef2f2";border="2px solid #fca5a5";color="#dc2626";}
                }
                return(
                  <button key={i} className="opt-btn" onClick={()=>handleAnswer(i)}
                    style={{background:bg,border,borderRadius:"14px",padding:"14px 18px",fontWeight:700,fontSize:"0.95rem",color,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                    <span style={{marginRight:"10px",fontWeight:800}}>{["A","B","C","D"][i]}.</span>
                    {opt}
                    {showCorrect&&i===q.correct&&" ✅"}
                    {showCorrect&&i===selectedAnswer&&i!==q.correct&&" ❌"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════ RESULTS ════ */}
      {phase === "results" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",zIndex:1,position:"relative"}}>
          <div className="pop-in" style={{background:"white",borderRadius:"32px",padding:"40px 32px",maxWidth:"460px",width:"100%",boxShadow:"0 20px 60px rgba(236,72,153,0.15)",border:"3px solid #fce7f3",textAlign:"center"}}>
            <div className="bounce-it" style={{fontSize:"72px",marginBottom:"12px"}}>
              {score===quiz.length?"🏆":score>=quiz.length/2?"🌟":"📚"}
            </div>
            <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"2rem",color:"#7c3aed",margin:"0 0 8px"}}>
              {score===quiz.length?"Perfect Score!":score>=quiz.length/2?"Great Job!":"Keep Learning!"}
            </h2>
            <p style={{fontSize:"1.1rem",color:"#6b7280",marginBottom:"20px",fontWeight:700}}>
              You got <span style={{color:"#7c3aed",fontSize:"1.5rem",fontFamily:"'Fredoka One',cursive"}}>{score}</span> out of <span style={{color:"#7c3aed",fontSize:"1.5rem",fontFamily:"'Fredoka One',cursive"}}>{quiz.length}</span> correct!
            </p>
            <div style={{background:"#f3f4f6",borderRadius:"12px",height:"16px",marginBottom:"24px",overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,#f97316,#ec4899)",height:"100%",borderRadius:"12px",width:`${(score/quiz.length)*100}%`,transition:"width 1s ease"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"24px",textAlign:"left"}}>
              {quiz.map((q,i)=>(
                <div key={i} style={{background:quizAnswers[i]===q.correct?"#f0fdf4":"#fef2f2",border:`2px solid ${quizAnswers[i]===q.correct?"#86efac":"#fca5a5"}`,borderRadius:"12px",padding:"10px 14px"}}>
                  <p style={{fontSize:"0.82rem",fontWeight:800,color:"#374151",margin:"0 0 2px"}}>Q{i+1}: {q.question}</p>
                  <p style={{fontSize:"0.8rem",color:quizAnswers[i]===q.correct?"#16a34a":"#dc2626",margin:0,fontWeight:700}}>
                    {quizAnswers[i]===q.correct?"✅":"❌"} {q.options[quizAnswers[i]]}
                    {quizAnswers[i]!==q.correct&&<span style={{color:"#16a34a"}}> → {q.options[q.correct]}</span>}
                  </p>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
              <button className="ilbtn" onClick={()=>{setCurrentQ(0);setQuizAnswers([]);setPhase("quiz");}}
                style={{background:"white",border:"2px solid #c4b5fd",borderRadius:"16px",padding:"12px 20px",fontFamily:"'Fredoka One',cursive",color:"#7c3aed",fontSize:"0.95rem"}}>🔄 Retry Quiz</button>
              <button className="ilbtn" onClick={()=>{setPhase("home");setTopic("");}}
                style={{background:"linear-gradient(135deg,#f97316,#ec4899)",color:"white",border:"none",borderRadius:"16px",padding:"12px 20px",fontFamily:"'Fredoka One',cursive",fontSize:"0.95rem",boxShadow:"0 4px 14px rgba(236,72,153,0.4)"}}>🌟 New Topic!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
