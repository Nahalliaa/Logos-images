import { useState, useRef, useCallback } from "react";

const PRESETS = [
  { name: "Original", icon: "◎", f: { brightness: 100, contrast: 100, saturation: 100, sharpness: 0, warmth: 0, vignette: 0, fade: 0, hue: 0 } },
  { name: "Vivid",    icon: "✦", f: { brightness: 108, contrast: 118, saturation: 148, sharpness: 30, warmth: 8,  vignette: 12, fade: 0,  hue: 0 } },
  { name: "Cinema",  icon: "▬", f: { brightness: 93,  contrast: 125, saturation: 72,  sharpness: 22, warmth: -10,vignette: 42, fade: 10, hue: 0 } },
  { name: "Portrait",icon: "◉", f: { brightness: 112, contrast: 105, saturation: 112, sharpness: 12, warmth: 16, vignette: 22, fade: 6,  hue: 0 } },
  { name: "Vintage", icon: "◈", f: { brightness: 104, contrast: 92,  saturation: 75,  sharpness: 0,  warmth: 28, vignette: 38, fade: 22, hue: 5 } },
  { name: "Noir",    icon: "◐", f: { brightness: 100, contrast: 145, saturation: 0,   sharpness: 42, warmth: 0,  vignette: 55, fade: 0,  hue: 0 } },
  { name: "Airy",    icon: "◌", f: { brightness: 118, contrast: 88,  saturation: 88,  sharpness: 0,  warmth: 6,  vignette: 0,  fade: 28, hue: 0 } },
  { name: "Drama",   icon: "◆", f: { brightness: 88,  contrast: 138, saturation: 122, sharpness: 52, warmth: -5, vignette: 48, fade: 0,  hue: 0 } },
  { name: "Matte",   icon: "▣", f: { brightness: 105, contrast: 95,  saturation: 90,  sharpness: 0,  warmth: 5,  vignette: 10, fade: 35, hue: 0 } },
  { name: "Sunset",  icon: "◑", f: { brightness: 106, contrast: 112, saturation: 130, sharpness: 10, warmth: 35, vignette: 25, fade: 8,  hue: 8 } },
];

const SCALES = [
  { label: "1× Original", value: 1 },
  { label: "2× HD",       value: 2 },
  { label: "4× Ultra HD", value: 4 },
];

const SLIDERS = [
  { key: "brightness", label: "Brilho",      min: 60,  max: 150, center: 100 },
  { key: "contrast",   label: "Contraste",   min: 60,  max: 170, center: 100 },
  { key: "saturation", label: "Saturação",   min: 0,   max: 210, center: 100 },
  { key: "sharpness",  label: "Nitidez",     min: 0,   max: 100, center: 0   },
  { key: "warmth",     label: "Temperatura", min: -40, max: 50,  center: 0   },
  { key: "vignette",   label: "Vinheta",     min: 0,   max: 80,  center: 0   },
  { key: "fade",       label: "Fade",        min: 0,   max: 60,  center: 0   },
  { key: "hue",        label: "Matiz",       min: -30, max: 30,  center: 0   },
];

function buildCSSFilter(f) {
  const warm = f.warmth > 0
    ? `sepia(${f.warmth * 0.45}%) hue-rotate(-${f.warmth * 0.25}deg)`
    : f.warmth < 0 ? `hue-rotate(${Math.abs(f.warmth) * 0.4}deg)` : "";
  const hue = f.hue !== 0 ? `hue-rotate(${f.hue}deg)` : "";
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) ${warm} ${hue}`;
}

function renderToCanvas(imgEl, filters, scale) {
  const W = imgEl.naturalWidth  * scale;
  const H = imgEl.naturalHeight * scale;
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const warm = filters.warmth > 0
    ? `sepia(${filters.warmth * 0.45}%) hue-rotate(-${filters.warmth * 0.25}deg)`
    : filters.warmth < 0 ? `hue-rotate(${Math.abs(filters.warmth) * 0.4}deg)` : "";
  const hue = filters.hue !== 0 ? `hue-rotate(${filters.hue}deg)` : "";
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) ${warm} ${hue}`;
  ctx.drawImage(imgEl, 0, 0, W, H);
  ctx.filter = "none";

  if (filters.sharpness > 0) {
    const amount = filters.sharpness / 100;
    const imageData = ctx.getImageData(0, 0, W, H);
    const d = imageData.data;
    const orig = new Uint8ClampedArray(d);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          const lap =
            -orig[((y-1)*W + x    ) * 4 + c]
            -orig[(  y  *W + x - 1) * 4 + c]
            + 4 * orig[i + c]
            -orig[(  y  *W + x + 1) * 4 + c]
            -orig[((y+1)*W + x    ) * 4 + c];
          d[i + c] = Math.min(255, Math.max(0, orig[i + c] + lap * amount * 0.45));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (filters.fade > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(filters.fade / 100) * 0.22})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (filters.vignette > 0) {
    const s = filters.vignette / 100;
    const g = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.28, W/2, H/2, Math.max(W,H)*0.82);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${s * 0.8})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  return canvas;
}

export default function PhotoEnhancer() {
  const [imgSrc, setImgSrc]       = useState(null);
  const [imgEl, setImgEl]         = useState(null);
  const [filters, setFilters]     = useState(PRESETS[0].f);
  const [activeP, setActiveP]     = useState(0);
  const [scale, setScale]         = useState(2);
  const [dragging, setDragging]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab]             = useState("presets");
  const [filename, setFilename]   = useState("enhanced");
  const fileRef = useRef();

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const el = new Image();
    el.onload = () => setImgEl(el);
    el.src = url;
    setFilters(PRESETS[0].f);
    setActiveP(0);
    setFilename(file.name.replace(/\.[^.]+$/, "") || "enhanced");
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); };
  const applyPreset = (i) => { setActiveP(i); setFilters({ ...PRESETS[i].f }); };
  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: Number(val) })); setActiveP(-1); };
  const resetFilters = () => applyPreset(0);

  const doExport = async () => {
    if (!imgEl) return;
    setExporting(true);
    await new Promise(r => setTimeout(r, 60));
    const canvas = renderToCanvas(imgEl, filters, scale);
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}_${scale}x.png`;
      a.click();
      setExporting(false);
    }, "image/png", 1.0);
  };

  const cssFilter = buildCSSFilter(filters);

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d10", color:"#e2d9cc", fontFamily:"'DM Sans','Helvetica Neue',sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#c8a96e44;border-radius:2px}
        .upload-zone{border:1.5px dashed #3a3530;border-radius:16px;transition:all .25s;cursor:pointer}
        .upload-zone:hover,.upload-zone.drag{border-color:#c8a96e;background:rgba(200,169,110,.04)}
        .preset-card{border:1.5px solid transparent;border-radius:10px;padding:10px 8px;cursor:pointer;transition:all .2s;background:#16161a;text-align:center;flex:1;min-width:72px;max-width:90px}
        .preset-card:hover{border-color:#c8a96e55;background:#1e1e24}
        .preset-card.active{border-color:#c8a96e;background:#1e1c17}
        .tab{background:none;border:none;cursor:pointer;padding:9px 20px;font-family:'DM Sans',sans-serif;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#5a5248;transition:color .2s;border-bottom:2px solid transparent}
        .tab.on{color:#c8a96e;border-bottom-color:#c8a96e}
        .slider-row{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .slider-label{font-size:12px;color:#9a9088;width:90px;letter-spacing:.04em}
        .slider-val{font-size:12px;color:#c8a96e;width:34px;text-align:right;font-variant-numeric:tabular-nums;font-family:'DM Sans',sans-serif}
        input[type=range]{flex:1;-webkit-appearance:none;height:3px;background:linear-gradient(to right,#c8a96e var(--p,50%),#2e2a26 var(--p,50%));border-radius:2px;outline:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#c8a96e;border:2px solid #0d0d10;box-shadow:0 0 0 2px #c8a96e44}
        .btn-primary{background:linear-gradient(135deg,#c8a96e,#e8c88a);color:#0d0d10;border:none;border-radius:10px;padding:13px 28px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:13.5px;letter-spacing:.05em;cursor:pointer;transition:opacity .2s,transform .1s;display:flex;align-items:center;gap:8px}
        .btn-primary:hover{opacity:.9;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .btn-ghost{background:none;border:1.5px solid #2e2a26;border-radius:8px;padding:8px 16px;color:#9a9088;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all .2s;letter-spacing:.05em}
        .btn-ghost:hover{border-color:#c8a96e55;color:#c8a96e}
        .scale-opt{border:1.5px solid #2e2a26;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;color:#6a6258;transition:all .2s;background:transparent;font-family:'DM Sans',sans-serif}
        .scale-opt.on{border-color:#c8a96e;color:#c8a96e}
        .scale-opt:hover{border-color:#c8a96e55}
      `}</style>

      {/* Header */}
      <header style={{ padding:"22px 32px 18px", borderBottom:"1px solid #1a1816", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:"#e8ddd0" }}>
            Lens<span style={{ color:"#c8a96e" }}>Lab</span>
          </div>
          <div style={{ fontSize:10.5, color:"#3a3530", letterSpacing:".14em", textTransform:"uppercase", marginTop:2 }}>Enhancer · 100% local · sem upload</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#16161c", border:"1px solid #2a2620", borderRadius:8, padding:"8px 14px" }}>
          <span style={{ fontSize:14 }}>🔒</span>
          <span style={{ fontSize:11.5, color:"#6a6258" }}>Nenhuma imagem sai do seu dispositivo</span>
        </div>
      </header>

      <main style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:308, minWidth:260, background:"#111115", borderRight:"1px solid #1a1816", display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ display:"flex", borderBottom:"1px solid #1a1816" }}>
            {[["presets","Presets"],["adjust","Ajustes"],["export","Exportar"]].map(([id,label]) => (
              <button key={id} className={`tab ${tab===id?"on":""}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          <div style={{ padding:"20px 16px", flex:1 }}>

            {tab === "presets" && (
              <div>
                <div style={{ fontSize:10.5, color:"#3a3530", letterSpacing:".12em", textTransform:"uppercase", marginBottom:14 }}>Escolha um estilo</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {PRESETS.map((p, i) => (
                    <div key={p.name} className={`preset-card ${activeP===i?"active":""}`} onClick={() => applyPreset(i)}>
                      <div style={{ fontSize:17, marginBottom:5, color: activeP===i ? "#c8a96e" : "#4a4440" }}>{p.icon}</div>
                      <div style={{ fontSize:10.5, color: activeP===i ? "#c8a96e" : "#6a6058", letterSpacing:".06em", fontFamily:"'DM Sans',sans-serif" }}>{p.name}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:18, fontSize:11.5, color:"#3a3530", lineHeight:1.7, padding:"10px 0" }}>
                  Selecione um preset e ajuste nos <em style={{color:"#5a5248"}}>Ajustes</em> para personalizar.
                </div>
              </div>
            )}

            {tab === "adjust" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  <div style={{ fontSize:10.5, color:"#3a3530", letterSpacing:".12em", textTransform:"uppercase" }}>Controles</div>
                  <button className="btn-ghost" onClick={resetFilters} style={{padding:"6px 12px",fontSize:11}}>Resetar</button>
                </div>
                {SLIDERS.map(s => {
                  const val = filters[s.key] ?? s.center;
                  const pct = ((val - s.min) / (s.max - s.min)) * 100;
                  return (
                    <div key={s.key} className="slider-row">
                      <div className="slider-label">{s.label}</div>
                      <input type="range" min={s.min} max={s.max} value={val}
                        style={{"--p":`${pct}%`}} onChange={e => setFilter(s.key, e.target.value)} />
                      <div className="slider-val">{val}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "export" && (
              <div>
                <div style={{ fontSize:10.5, color:"#3a3530", letterSpacing:".12em", textTransform:"uppercase", marginBottom:14 }}>Resolução de saída</div>
                <div style={{ display:"flex", gap:8, marginBottom:24 }}>
                  {SCALES.map(s => (
                    <button key={s.value} className={`scale-opt ${scale===s.value?"on":""}`} onClick={() => setScale(s.value)}>{s.label}</button>
                  ))}
                </div>

                <div style={{ fontSize:10.5, color:"#3a3530", letterSpacing:".12em", textTransform:"uppercase", marginBottom:8 }}>Nome do arquivo</div>
                <input value={filename} onChange={e => setFilename(e.target.value)}
                  style={{ width:"100%", background:"#18181e", border:"1.5px solid #2a2620", borderRadius:8, padding:"9px 12px", color:"#c8a96e", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", marginBottom:22 }} />

                {imgEl && (
                  <div style={{ marginBottom:20, fontSize:12, color:"#4a4540", lineHeight:1.9 }}>
                    <div>Original: <span style={{color:"#8a8078"}}>{imgEl.naturalWidth} × {imgEl.naturalHeight}px</span></div>
                    <div>Saída: <span style={{color:"#c8a96e",fontWeight:600}}>{imgEl.naturalWidth*scale} × {imgEl.naturalHeight*scale}px</span></div>
                    <div>Formato: <span style={{color:"#8a8078"}}>PNG sem perda</span></div>
                  </div>
                )}

                <button className="btn-primary" onClick={doExport} disabled={!imgEl || exporting} style={{ width:"100%", justifyContent:"center" }}>
                  {exporting ? "⏳ Processando…" : "⬇ Baixar Imagem"}
                </button>
                <div style={{ marginTop:14, fontSize:10.5, color:"#2e2a26", lineHeight:1.6, textAlign:"center" }}>
                  Upscale por interpolação bilinear de alta qualidade.<br/>Nitidez aplicada pixel a pixel via Canvas API.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:36, background:"#0d0d10", overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 25% 35%, #14120e 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #0e0e14 0%, transparent 50%)", pointerEvents:"none" }} />

          {!imgSrc ? (
            <div className={`upload-zone ${dragging?"drag":""}`}
              style={{ width:"100%", maxWidth:500, padding:"64px 40px", textAlign:"center", position:"relative" }}
              onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
              onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])} />
              <div style={{ fontSize:44, marginBottom:18, opacity:.35 }}>⬆</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, color:"#8a8078", marginBottom:10 }}>Solte sua foto aqui</div>
              <div style={{ fontSize:12.5, color:"#3a3530", lineHeight:1.8 }}>
                ou clique para escolher<br/>
                <span style={{color:"#2a2520"}}>JPG · PNG · WEBP · GIF · BMP</span>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, maxWidth:"100%", maxHeight:"100%" }}>
              <div style={{ position:"relative", borderRadius:12, overflow:"hidden", boxShadow:"0 28px 72px rgba(0,0,0,.75), 0 0 0 1px #2a241c" }}>
                <img src={imgSrc} alt="preview"
                  style={{ display:"block", maxWidth:"min(680px,68vw)", maxHeight:"60vh", objectFit:"contain", filter:cssFilter }} />
                {filters.vignette > 0 && (
                  <div style={{ position:"absolute", inset:0,
                    background:`radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,${filters.vignette/100*0.78}) 100%)`,
                    pointerEvents:"none" }} />
                )}
                {filters.fade > 0 && (
                  <div style={{ position:"absolute", inset:0,
                    background:`rgba(255,255,255,${filters.fade/100*0.22})`,
                    pointerEvents:"none" }} />
                )}
              </div>

              {/* Bottom controls */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px", background:"#111115", borderRadius:12, border:"1px solid #1e1c18", flexWrap:"wrap", justifyContent:"center" }}>
                <button className="btn-ghost" style={{padding:"7px 14px",fontSize:11.5}} onClick={() => {setImgSrc(null);setImgEl(null);applyPreset(0);}}>
                  ✕ Trocar foto
                </button>
                <div style={{width:1,height:22,background:"#2a2620"}} />
                <span style={{fontSize:11.5,color:"#3a3530"}}>
                  {imgEl ? `${imgEl.naturalWidth}×${imgEl.naturalHeight}px` : "—"}
                </span>
                <div style={{width:1,height:22,background:"#2a2620"}} />
                {SCALES.map(s => (
                  <button key={s.value} className={`scale-opt ${scale===s.value?"on":""}`}
                    onClick={() => {setScale(s.value);setTab("export");}}
                    style={{padding:"6px 10px",fontSize:11}}>{s.label}</button>
                ))}
                <div style={{width:1,height:22,background:"#2a2620"}} />
                <button className="btn-primary" style={{padding:"9px 20px",fontSize:12.5}} onClick={doExport} disabled={exporting}>
                  {exporting ? "⏳" : "⬇"} {exporting ? "Exportando…" : "Baixar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
