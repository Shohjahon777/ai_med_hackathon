'use client';

import './app.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  AnalysisMode,
  ViewMode,
  FileInfo,
  HistoryEntry,
  LogEntry,
  ToastData,
  ClassificationResult,
  SegmentationResult,
} from '@/lib/types';
import { validateFile, validateImageDimensions, fmtBytes } from '@/lib/validation';
import { classifyImage, segmentImage, ApiError } from '@/lib/api';
import { validateWithGemini, isGeminiConfigured } from '@/lib/gemini';
import { generateMockClassification, generateMockSegmentation } from '@/lib/mockData';
import {
  PIPELINE_STEPS,
  MODEL_INFO,
  PREPROCESS_STEPS,
  CLASS_COLORS,
  CLASS_NAMES,
} from '@/lib/constants';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Home() {
  const [task, setTask] = useState<AnalysisMode>('classify');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [view, setView] = useState<ViewMode>('original');

  const [clsResult, setClsResult] = useState<ClassificationResult | null>(null);
  const [segResult, setSegResult] = useState<SegmentationResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showSegMetrics, setShowSegMetrics] = useState(false);
  const [showViewTabs, setShowViewTabs] = useState(false);

  const [pipStates, setPipStates] = useState<string[]>(['', '', '', '', '']);
  const [pipLines, setPipLines] = useState<boolean[]>([false, false, false, false]);
  const [ppDone, setPpDone] = useState<boolean[]>([false, false, false, false]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [procText, setProcText] = useState('Initializing...');
  const [procPct, setProcPct] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [clock, setClock] = useState('--:--:--');
  const [coords, setCoords] = useState('0, 0');
  const [rgb, setRgb] = useState('—');
  const [scanGo, setScanGo] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [showPreprocess, setShowPreprocess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const probBarsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB'));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    addLog('Galacticos ready', 'ok');
    addLog('Classification → DINOv2-ViT-L · LoRA · 12 classes');
    addLog('Segmentation → nnUNet 2D');
    addLog('Awaiting image upload...');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToast = useCallback((type: ToastData['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    const dur = type === 'suc' ? 3000 : 5000;
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), dur);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = '') => {
    const time = new Date().toLocaleTimeString('en-GB');
    setLogs((prev) => [{ time, message, type }, ...prev].slice(0, 50));
  }, []);

  const showError = useCallback(
    (title: string, msg: string) => { addToast('err', title, msg); addLog(`${title} — ${msg}`, 'er'); },
    [addToast, addLog]
  );

  const showWarn = useCallback(
    (title: string, msg: string) => { addToast('wrn', title, msg); addLog(`${title} — ${msg}`, 'wr'); },
    [addToast, addLog]
  );

  const showOk = useCallback(
    (msg: string) => { addToast('suc', 'Success', msg); addLog(msg, 'ok'); },
    [addToast, addLog]
  );

  const handleFile = useCallback(
    (f: File) => {
      const fileValidation = validateFile(f);
      if (!fileValidation.valid) {
        showError(fileValidation.error!.title, fileValidation.error!.message);
        return;
      }

      setFile(f);
      const reader = new FileReader();
      reader.onerror = () => showError('Read Error', 'Could not read file. It may be corrupted or inaccessible.');
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => showError('Decode Error', 'Image could not be decoded. Verify it is a valid PNG, JPG or BMP.');
        img.onload = () => {
          const dimValidation = validateImageDimensions(img.width, img.height);
          if (!dimValidation.valid) {
            showError(dimValidation.error!.title, dimValidation.error!.message);
            return;
          }
          if (dimValidation.warning) {
            showWarn(dimValidation.warning.title, dimValidation.warning.message);
          }

          const src = e.target!.result as string;
          setImgSrc(src);
          setFileInfo({ name: f.name, width: img.width, height: img.height, size: f.size, format: f.type.split('/')[1].toUpperCase() });

          const c = canvasRef.current!;
          c.width = img.width;
          c.height = img.height;
          c.getContext('2d')!.drawImage(img, 0, 0);
          c.style.display = 'block';

          // Reset previous results
          setClsResult(null);
          setSegResult(null);
          setShowResults(false);
          setShowSegMetrics(false);
          setShowViewTabs(false);
          setView('original');
          const oc = overlayRef.current;
          if (oc) oc.style.display = 'none';

          setPipStates((prev) => { const n = [...prev]; n[0] = 'done'; return n; });
          addLog(`Loaded: ${f.name} (${img.width}×${img.height})`, 'ok');
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(f);
    },
    [showError, showWarn, addLog]
  );

  const showSegOverlay = useCallback((segData: SegmentationResult, viewMode: ViewMode) => {
    const oc = overlayRef.current;
    const mc = canvasRef.current;
    if (!oc || !mc) return;

    if (viewMode === 'original') {
      oc.style.display = 'none';
      return;
    }

    const imageMap: Record<string, string> = {
      mask: segData.images.mask,
      overlay: segData.images.overlay,
      contour: segData.images.contour,
      heat: segData.images.heatmap,
    };

    const b64 = imageMap[viewMode];
    if (!b64) { oc.style.display = 'none'; return; }

    const img = new Image();
    img.onload = () => {
      oc.width = mc.width;
      oc.height = mc.height;
      const ctx = oc.getContext('2d')!;
      ctx.clearRect(0, 0, oc.width, oc.height);
      ctx.drawImage(img, 0, 0, oc.width, oc.height);
      oc.style.display = 'block';
    };
    img.src = `data:image/png;base64,${b64}`;
  }, []);

  const changeView = useCallback(
    (m: ViewMode) => {
      setView(m);
      if (segResult) {
        showSegOverlay(segResult, m);
      }
    },
    [segResult, showSegOverlay]
  );

  // Restore a history entry's results to the viewer
  const restoreHistory = useCallback((entry: HistoryEntry) => {
    // Load the thumbnail back into the canvas
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current!;
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      c.style.display = 'block';

      setImgSrc(entry.thumb);
      setFile(null);
      setFileInfo(null);
      setTask(entry.task);
      setUsingMock(entry.isMock);
      setView('original');
      const oc = overlayRef.current;
      if (oc) oc.style.display = 'none';

      // Restore classification
      if (entry.clsResult) {
        setClsResult(entry.clsResult);
        setShowResults(true);
        setTimeout(() => {
          probBarsRef.current?.querySelectorAll<HTMLDivElement>('.prob-bar').forEach((el) => { el.style.width = el.dataset.w + '%'; });
        }, 50);
      } else {
        setClsResult(null);
        setShowResults(false);
      }

      // Restore segmentation
      if (entry.segResult) {
        setSegResult(entry.segResult);
        setShowSegMetrics(true);
        setShowViewTabs(true);
      } else {
        setSegResult(null);
        setShowSegMetrics(false);
        setShowViewTabs(false);
      }

      // Set pipeline to completed state
      setPipStates(['done', 'done', 'done', 'done', 'done']);
      setPipLines([true, true, true, true]);
      setPpDone([true, true, true, true]);

      addLog(`Restored: ${entry.name} (${entry.time})`, 'ok');
    };
    img.src = entry.thumb;
  }, [addLog]);

  const deleteHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    addLog('History cleared', 'wr');
  }, [addLog]);

  // Helper to update a single pipeline step
  const setPip = useCallback((idx: number, state: string) => {
    setPipStates(prev => { const n = [...prev]; n[idx] = state; return n; });
  }, []);
  const setLine = useCallback((idx: number, done: boolean) => {
    setPipLines(prev => { const n = [...prev]; n[idx] = done; return n; });
  }, []);

  const analyze = useCallback(async () => {
    if (!imgSrc || !file) { showError('No Image', 'Please upload an image first.'); return; }

    setIsProcessing(true);
    setUsingMock(false);
    setShowResults(false);
    setShowSegMetrics(false);
    setShowViewTabs(false);
    setView('original');
    // Reset pipeline: Upload already done
    setPipStates(['done', '', '', '', '']);
    setPipLines([false, false, false, false]);
    setPpDone([false, false, false, false]);

    let classResult: ClassificationResult | null = null;
    let segResultData: SegmentationResult | null = null;
    let usedMock = false;

    // ── Step 2: Validate ──
    setPip(1, 'active');
    setLine(0, true);
    setProcText('Validating image...');
    setProcPct(15);

    if (isGeminiConfigured()) {
      addLog('Validating image with Gemini AI...', '');
      try {
        const geminiResult = await validateWithGemini(file);
        if (!geminiResult.valid) {
          setPip(1, 'fail');
          setIsProcessing(false);
          setProcPct(0);
          showError('Invalid Image', geminiResult.reason);
          addLog(`Validation failed: ${geminiResult.reason}`, 'er');
          return;
        }
        addLog(`Validated: ${geminiResult.reason}`, 'ok');
      } catch {
        addLog('Gemini validation skipped (error)', 'wr');
      }
    } else {
      addLog('File format validated', 'ok');
      await sleep(300);
    }
    setPip(1, 'done');
    setProcPct(25);

    // ── Step 3: Classify ──
    if (task === 'classify' || task === 'both') {
      setPip(2, 'active');
      setLine(1, true);
      setProcText('Running classification...');
      setProcPct(40);
      addLog('Calling /classify endpoint...', '');

      try {
        classResult = await classifyImage(file);
        setPip(2, 'done');
        addLog(`Classification: ${CLASS_NAMES[classResult.predicted_class] || 'Class ' + classResult.predicted_class} (${(classResult.confidence * 100).toFixed(1)}%)`, 'ok');
      } catch (e) {
        const apiErr = e as ApiError;
        setPip(2, 'fail');
        showWarn('Classification Failed', `${apiErr.message}. Using demo mode.`);
        usedMock = true;
        classResult = generateMockClassification();
      }
    } else {
      setPip(2, 'skip');
      setLine(1, true);
    }
    setProcPct(60);

    // ── Step 4: Segment ──
    if (task === 'segment' || task === 'both') {
      setPip(3, 'active');
      setLine(2, true);
      setProcText('Running segmentation...');
      setProcPct(70);
      addLog('Calling /segment endpoint...', '');

      try {
        segResultData = await segmentImage(file);
        setPip(3, 'done');
        addLog(`Segmentation: ${segResultData.metrics.foreground_coverage_pct.toFixed(1)}% coverage, ${segResultData.metrics.num_regions} regions`, 'ok');
      } catch (e) {
        const apiErr = e as ApiError;
        setPip(3, 'fail');
        showWarn('Segmentation Failed', `${apiErr.message}. Using demo mode.`);
        usedMock = true;
        segResultData = generateMockSegmentation();
      }
    } else {
      setPip(3, 'skip');
      setLine(2, true);
    }
    setProcPct(90);

    // ── Step 5: Results ──
    setLine(3, true);
    const anyFailed = !classResult && !segResultData;
    if (anyFailed) {
      setPip(4, 'fail');
    } else {
      setPip(4, 'active');
      setProcText('Preparing results...');
    }

    setUsingMock(usedMock);
    setScanGo(true);
    await sleep(350);

    setProcPct(100);
    setIsProcessing(false);

    if (classResult) {
      setClsResult(classResult);
      setShowResults(true);
      setTimeout(() => {
        probBarsRef.current?.querySelectorAll<HTMLDivElement>('.prob-bar').forEach((el) => { el.style.width = el.dataset.w + '%'; });
      }, 50);
    }

    if (segResultData) {
      setSegResult(segResultData);
      setShowSegMetrics(true);
      setShowViewTabs(true);
    }

    if (!anyFailed) setPip(4, 'done');

    setHistory((prev) => [
      {
        id: Date.now().toString(),
        thumb: imgSrc!,
        name: file?.name || 'image',
        task,
        time: new Date().toLocaleTimeString('en-GB'),
        cls: classResult?.predicted_class ?? null,
        clsResult: classResult,
        segResult: segResultData,
        isMock: usedMock,
      },
      ...prev,
    ]);

    showOk(`Analysis complete — ${task} finished successfully.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc, file, task, showError, showWarn, showOk, addLog, setPip, setLine]);

  const doExport = useCallback(() => {
    try {
      const mc = canvasRef.current!;
      const ec = document.createElement('canvas');
      ec.width = mc.width; ec.height = mc.height;
      const ctx = ec.getContext('2d')!;
      ctx.drawImage(mc, 0, 0);
      const oc = overlayRef.current;
      if (oc && oc.style.display !== 'none') ctx.drawImage(oc, 0, 0);
      const a = document.createElement('a');
      a.download = 'galacticos_' + Date.now() + '.png';
      a.href = ec.toDataURL();
      a.click();
      showOk('Result exported as PNG');
    } catch (e) { showError('Export Failed', (e as Error).message); }
  }, [showOk, showError]);

  // Sort probabilities for display
  const sortedProbs = clsResult
    ? Object.entries(clsResult.probabilities)
        .map(([key, val]) => ({ i: Number(key), v: val }))
        .sort((a, b) => b.v - a.v)
    : [];
  const confClass = clsResult ? (clsResult.confidence > 0.7 ? 'c-hi' : clsResult.confidence > 0.5 ? 'c-md' : 'c-lo') : '';

  return (
    <>
      <div className="accent-bar" />
      <div className="disclaimer">&#9888; For research and demonstration purposes only. Not for clinical use.</div>

      <header>
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="#fff" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2.5" fill="#fff" />
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Galacticos</div>
            <div className="brand-ver">biopsy intelligence</div>
          </div>
        </div>
        <div className="header-r">
          <div className="chip"><div className="dot"></div>System Active</div>
          <div className="chip" style={{ minWidth: 78 }}>{clock}</div>
        </div>
      </header>

      <div className="pipeline">
        {PIPELINE_STEPS.map((step, idx) => (
          <span key={step.id} style={{ display: 'contents' }}>
            <div className={`pip-step ${pipStates[idx]}`}>
              <div className="pip-n">{pipStates[idx] === 'done' ? '✓' : pipStates[idx] === 'fail' ? '✕' : pipStates[idx] === 'skip' ? '—' : step.id}</div>
              {step.label}
            </div>
            {idx < 4 && <div className={`pip-line ${pipLines[idx] ? 'done' : ''}`} />}
          </span>
        ))}
      </div>

      <div className="main">
        {/* LEFT */}
        <div className="col col-left">
          <div className="lbl">Image Input</div>
          <div
            className={`drop-zone ${isDragging ? 'over' : ''} ${imgSrc ? 'loaded' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); }}
          >
            {!imgSrc && (
              <div>
                <div className="dz-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="dz-title">Upload biopsy image</div>
                <div className="dz-sub">Drag &amp; drop or click to browse</div>
                <div className="dz-tags">
                  <span className="dz-tag">PNG</span>
                  <span className="dz-tag">JPG</span>
                  <span className="dz-tag">BMP</span>
                </div>
              </div>
            )}
            {imgSrc && <img src={imgSrc} alt="Preview" className="preview-img" />}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/bmp" hidden
              onChange={(e) => { if (e.target.files?.length) handleFile(e.target.files[0]); }} />
          </div>

          {imgSrc && (
            <div className="img-actions">
              <button className="img-action-btn" onClick={() => fileInputRef.current?.click()}>
                Change Image
              </button>
              <button className="img-action-btn danger" onClick={() => {
                setImgSrc(null);
                setFile(null);
                setFileInfo(null);
                setClsResult(null);
                setSegResult(null);
                setShowResults(false);
                setShowSegMetrics(false);
                setShowViewTabs(false);
                setView('original');
                setPipStates(['', '', '', '', '']);
                setPipLines([false, false, false, false]);
                setPpDone([false, false, false, false]);
                const c = canvasRef.current;
                if (c) { c.getContext('2d')!.clearRect(0, 0, c.width, c.height); c.style.display = 'none'; }
                const oc = overlayRef.current;
                if (oc) { oc.getContext('2d')!.clearRect(0, 0, oc.width, oc.height); oc.style.display = 'none'; }
                if (fileInputRef.current) fileInputRef.current.value = '';
                addLog('Image removed', 'wr');
              }}>
                Remove
              </button>
            </div>
          )}

          {fileInfo && (
            <div className="file-info">
              <div className="fi-row"><span className="fi-k">Filename</span><span className="fi-v">{fileInfo.name}</span></div>
              <div className="fi-row"><span className="fi-k">Dimensions</span><span className="fi-v">{fileInfo.width}×{fileInfo.height}px</span></div>
              <div className="fi-row"><span className="fi-k">File size</span><span className="fi-v">{fmtBytes(fileInfo.size)}</span></div>
              <div className="fi-row"><span className="fi-k">Format</span><span className="fi-v">{fileInfo.format}</span></div>
            </div>
          )}

          <div className="lbl" style={{ marginTop: 20 }}>Analysis Mode</div>
          <div className="tabs">
            {(['classify', 'segment', 'both'] as AnalysisMode[]).map((m) => (
              <button key={m} className={`tab ${task === m ? 'on' : ''}`}
                onClick={() => { setTask(m); addLog(`Mode → ${m}`); }}>
                {m === 'classify' ? 'Classification' : m === 'segment' ? 'Segmentation' : 'Both'}
              </button>
            ))}
          </div>

          {/* Collapsible: Model Architecture */}
          <button className={`section-toggle ${showModelInfo ? 'open' : ''}`}
            onClick={() => setShowModelInfo(!showModelInfo)}>
            Model Architecture
            <span className="arrow">▼</span>
          </button>
          <div className={`section-content ${showModelInfo ? 'open' : ''}`}>
            {Object.values(MODEL_INFO).map((model) => (
              <div className="info-card" key={model.title}>
                <div className="ic-head">
                  <div className="ic-title">{model.title}</div>
                  <div className="ic-badge">{model.badge}</div>
                </div>
                {model.rows.map(([k, v]) => (
                  <div className="ic-row" key={k}><span className="ic-k">{k}</span><span className="ic-v">{v}</span></div>
                ))}
              </div>
            ))}
          </div>

          {/* Collapsible: Preprocessing */}
          <button className={`section-toggle ${showPreprocess ? 'open' : ''}`}
            onClick={() => setShowPreprocess(!showPreprocess)}>
            Preprocessing Pipeline
            <span className="arrow">▼</span>
          </button>
          <div className={`section-content ${showPreprocess ? 'open' : ''}`}>
            {PREPROCESS_STEPS.map((step, idx) => (
              <div className={`pp-step ${ppDone[idx] ? 'done' : ''}`} key={idx}>
                <div className="pp-dot">{ppDone[idx] ? '✓' : idx + 1}</div>
                <div>
                  <div className="pp-label">{step.label}</div>
                  <div className="pp-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="go-btn" disabled={!imgSrc || isProcessing} onClick={analyze}>
            <span className="shine"></span>
            {isProcessing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {/* CENTER */}
        <div className="col col-center">
          <div className="lbl" style={{ alignSelf: 'flex-start', width: '100%' }}>Scan Viewer</div>
          <div className="viewer-box" ref={viewerRef}
            onMouseMove={(e) => {
              const box = viewerRef.current;
              const c = canvasRef.current;
              if (!box || !c || !c.width) return;
              const r = box.getBoundingClientRect();
              const x = Math.floor(((e.clientX - r.left) / r.width) * c.width);
              const y = Math.floor(((e.clientY - r.top) / r.height) * c.height);
              setCoords(`${x}, ${y}`);
              try { const p = c.getContext('2d')!.getImageData(x, y, 1, 1).data; setRgb(`RGB(${p[0]}, ${p[1]}, ${p[2]})`); } catch { /* */ }
            }}>
            <div className="v-corner v-tl" /><div className="v-corner v-tr" />
            <div className="v-corner v-bl" /><div className="v-corner v-br" />
            <div className={`scan-bar ${scanGo ? 'go' : ''}`} onAnimationEnd={() => setScanGo(false)} />

            {!imgSrc && (
              <div className="v-empty">
                <svg viewBox="0 0 56 56" fill="none">
                  <rect x="6" y="6" width="44" height="44" rx="6" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="28" cy="28" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M28 22v12M22 28h12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                </svg>
                <div className="ve-t">No image loaded</div>
                <div className="ve-s">Upload a biopsy image to begin analysis</div>
              </div>
            )}

            <canvas ref={canvasRef} className="canvas-main" style={{ display: imgSrc ? 'block' : 'none' }} />
            <canvas ref={overlayRef} className="canvas-overlay" />
            {imgSrc && (
              <div className="v-bar" style={{ display: 'flex' }}>
                <span>{coords}</span><span>{rgb}</span>
              </div>
            )}
          </div>

          {showViewTabs && (
            <div className="v-tabs" style={{ display: 'flex' }}>
              {(['original', 'mask', 'overlay', 'contour', 'heat'] as ViewMode[]).map((m) => (
                <button key={m} className={`v-tab ${view === m ? 'on' : ''}`} onClick={() => changeView(m)}>
                  {m === 'heat' ? 'Heatmap' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          )}

          {showViewTabs && (
            <div className="v-slider" style={{ display: 'flex' }}>
              <label>Original</label>
              <input type="range" min={0} max={100} defaultValue={100}
                onChange={(e) => { const oc = overlayRef.current; if (oc) oc.style.opacity = String(Number(e.target.value) / 100); }} />
              <label>Overlay</label>
            </div>
          )}

          <div style={{ width: '100%', maxWidth: 540, marginTop: 24 }}>
            <div className="hist-header">
              <div className="lbl">History</div>
              {history.length > 0 && (
                <button className="hist-clear" onClick={clearHistory}>Clear all</button>
              )}
            </div>
            {history.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 16 }}>
                No analyses performed yet
              </div>
            )}
            {history.map((h) => (
              <div className="hist-item" key={h.id}>
                <img className="hist-img" src={h.thumb} alt=""
                  onClick={() => restoreHistory(h)} />
                <div className="hist-info" onClick={() => restoreHistory(h)}>
                  <div className="hist-name">{h.name}</div>
                  <div className="hist-meta">
                    {h.task} &middot; {h.time}
                    {h.cls !== null ? ` · ${CLASS_NAMES[h.cls] || `Class ${h.cls}`}` : ''}
                  </div>
                </div>
                <button className="hist-del" onClick={() => deleteHistory(h.id)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="col col-right">
          <div className="lbl">Analysis Results</div>

          {!showResults && !showSegMetrics && (
            <div className="res-empty">
              <svg viewBox="0 0 44 44" fill="none">
                <rect x="4" y="4" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15 22h14M22 15v14" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              </svg>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Awaiting analysis</div>
              <div style={{ fontSize: 12 }}>Upload an image and run analysis to see results</div>
            </div>
          )}

          {clsResult && showResults && (
            <>
              <div className="pred-hero show">
                <div className="ph-label">Predicted Diagnosis</div>
                <div className="ph-class">{CLASS_NAMES[clsResult.predicted_class] || `Class ${clsResult.predicted_class}`}</div>
                <div className="ph-class-id">Class {clsResult.predicted_class}</div>
                <div className={`ph-conf ${confClass}`}>
                  {(clsResult.confidence * 100).toFixed(1)}% confidence
                </div>
                {usingMock && <div className="mock-badge">Demo mode</div>}
              </div>

              <div className="lbl">Class Probabilities</div>
              <div className="prob-list" ref={probBarsRef}>
                {sortedProbs.map(({ v, i }) => (
                  <div className="prob-item" key={i}>
                    <span className="prob-id" title={CLASS_NAMES[i] || `Class ${i}`}>{i}</span>
                    <span className="prob-name">{CLASS_NAMES[i] || `Class ${i}`}</span>
                    <div className="prob-track">
                      <div className="prob-bar" data-w={v * 100} style={{ background: CLASS_COLORS[i], width: 0 }} />
                    </div>
                    <span className="prob-pct">{(v * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {segResult && showSegMetrics && (
            <div className="seg-box show">
              <div className="lbl">Segmentation Metrics</div>
              <div className="seg-grid">
                <div className="seg-cell">
                  <div className="seg-n" style={{ color: 'var(--emerald)' }}>{segResult.metrics.foreground_coverage_pct.toFixed(1)}%</div>
                  <div className="seg-l">Coverage</div>
                </div>
                <div className="seg-cell">
                  <div className="seg-n" style={{ color: 'var(--primary)' }}>{segResult.metrics.mean_confidence.toFixed(2)}</div>
                  <div className="seg-l">Mean Confidence</div>
                </div>
                <div className="seg-cell">
                  <div className="seg-n" style={{ color: 'var(--violet)' }}>{segResult.metrics.num_regions}</div>
                  <div className="seg-l">Regions</div>
                </div>
                <div className="seg-cell">
                  <div className="seg-n" style={{ color: 'var(--amber)' }}>
                    {segResult.metrics.regions.length > 0 ? segResult.metrics.regions[0].area_px.toLocaleString() : '0'}
                  </div>
                  <div className="seg-l">Area (px)</div>
                </div>
              </div>

              {segResult.metrics.regions.length > 0 && (
                <div className="seg-regions">
                  <div className="lbl" style={{ marginTop: 12 }}>Detected Regions</div>
                  {segResult.metrics.regions.map((r) => (
                    <div className="seg-region-item" key={r.id}>
                      <span className="sr-id">Region {r.id}</span>
                      <span className="sr-detail">{r.area_pct.toFixed(1)}% area · confidence {r.mean_confidence.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {usingMock && <div className="mock-badge" style={{ marginTop: 12 }}>Demo mode</div>}
            </div>
          )}

          {(showResults || showSegMetrics) && (
            <button className="exp-btn show" onClick={doExport}>↓ Export results as PNG</button>
          )}

          <div style={{ marginTop: 20 }}>
            <div className="lbl">System Log</div>
            <div className="log-box">
              {logs.map((log, idx) => (
                <div className="log-e" key={idx}>
                  <span className="log-t">{log.time}</span>
                  <span className={`log-m ${log.type}`}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="proc on">
          <div className="proc-inner">
            <div className="proc-ring" />
            <div className="proc-title">Analyzing Image</div>
            <div className="proc-sub">{procText}</div>
            <div className="proc-bar"><div className="proc-fill" style={{ width: `${procPct}%` }} /></div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <button className="toast-x" onClick={() => removeToast(t.id)}>✕</button>
            <div className="toast-ti">{t.title}</div>
            <div className="toast-tx">{t.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}
