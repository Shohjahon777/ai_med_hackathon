'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CLASS_NAMES, CLASS_COLORS } from '@/lib/constants';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: 'grid', color: 'blue',
    title: 'Image Classification',
    desc: 'Identify tissue type across 12 dermatological classes with per-class probability scoring and confidence levels.',
  },
  {
    icon: 'layers', color: 'teal',
    title: 'Tissue Segmentation',
    desc: '4 visualization modes — binary mask, overlay, contour lines, and probability heatmap — powered by nnU-Net.',
  },
  {
    icon: 'shield', color: 'emerald',
    title: 'AI Image Validation',
    desc: 'Gemini-powered pre-screening ensures only valid medical images are analyzed, rejecting non-medical uploads.',
  },
  {
    icon: 'upload', color: 'violet',
    title: 'Drag & Drop Upload',
    desc: 'Upload PNG, JPG, or BMP biopsy images with instant preview and file validation.',
  },
  {
    icon: 'clock', color: 'amber',
    title: 'Analysis History',
    desc: 'Review and restore previous analysis results. Click any history entry to reload its full results.',
  },
  {
    icon: 'download', color: 'rose',
    title: 'Export Results',
    desc: 'Download complete analysis results — including segmentation overlays — as PNG images.',
  },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
  layers: <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  shield: <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
  upload: <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  clock: <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  download: <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
};

const CLS_PIPELINE = [
  { label: 'Input', desc: '224 x 224 biopsy image' },
  { label: 'Backbone', desc: 'DINOv2 ViT-L (700M params, self-supervised)' },
  { label: 'Fine-tuning', desc: 'LoRA — 18.9M / 700M trainable (2.7%)' },
  { label: 'Ensemble', desc: '5-fold cross-validation' },
  { label: 'Augmentation', desc: 'D4 test-time augmentation (40 predictions)' },
  { label: 'Output', desc: '12-class prediction + confidence' },
];

const SEG_PIPELINE = [
  { label: 'Input', desc: 'Biopsy image (variable size)' },
  { label: 'Architecture', desc: 'nnU-Net v2, 2D auto-configured' },
  { label: 'Post-processing', desc: 'Threshold 0.30, hole filling, small object removal' },
  { label: 'Output', desc: 'Mask, overlay, contour, heatmap views' },
];

export default function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const accRef = useRef<HTMLSpanElement>(null);
  const iouRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.7 } });
      tl.fromTo('.lp-hero-badge', { opacity: 0, y: 24 }, { opacity: 1, y: 0 })
        .fromTo('.lp-hero-title', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, '-=0.5')
        .fromTo('.lp-hero-subtitle', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, '-=0.5')
        .fromTo('.lp-hero-desc', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, '-=0.5')
        .fromTo('.lp-hero-actions', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, '-=0.5');

      // Features
      gsap.fromTo('.lp-feature-card', { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1,
        scrollTrigger: { trigger: '.lp-features-grid', start: 'top 85%', once: true },
      });

      // Architecture cards
      gsap.fromTo('.lp-arch-card:first-child', { opacity: 0, x: -50 }, {
        opacity: 1, x: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-arch-grid', start: 'top 80%', once: true },
      });
      gsap.fromTo('.lp-arch-card:last-child', { opacity: 0, x: 50 }, {
        opacity: 1, x: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-arch-grid', start: 'top 80%', once: true },
      });

      // Pipeline steps
      gsap.fromTo('.lp-pipe-step', { opacity: 0, x: -20 }, {
        opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-arch-grid', start: 'top 70%', once: true },
      });

      // Metric counters
      const animateCounter = (ref: HTMLSpanElement | null, target: number, decimals: number, suffix: string) => {
        if (!ref) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target, duration: 2, ease: 'power1.out',
          scrollTrigger: { trigger: ref, start: 'top 85%', once: true },
          onUpdate: () => { ref.textContent = obj.val.toFixed(decimals) + suffix; },
        });
      };
      animateCounter(accRef.current, 86.25, 2, '%');
      animateCounter(iouRef.current, 0.8172, 4, '');

      // Context box
      gsap.fromTo('.lp-metric-context', { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.6,
        scrollTrigger: { trigger: '.lp-metric-context', start: 'top 90%', once: true },
      });

      // Disease class cards
      gsap.fromTo('.lp-class-card', { opacity: 0, scale: 0.92, y: 16 }, {
        opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-classes-grid', start: 'top 85%', once: true },
      });

      // Footer
      gsap.fromTo('.lp-footer-title', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.7,
        scrollTrigger: { trigger: '.lp-footer', start: 'top 85%', once: true },
      });
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="lp-landing" ref={mainRef}>
      {/* ─── HERO ─── */}
      <section className="lp-hero">
        <div className="lp-hero-badge">AI-Powered Biopsy Analysis</div>
        <h1 className="lp-hero-title">Galacticos</h1>
        <div className="lp-hero-subtitle">Biopsy Intelligence</div>
        <p className="lp-hero-desc">
          AI-powered classification and segmentation of biopsy images across 12 tissue classes.
          Built with DINOv2 Vision Transformer and nnU-Net.
        </p>
        <div className="lp-hero-actions">
          <Link href="/app" className="lp-cta">
            Try Now <span aria-hidden>&#8594;</span>
          </Link>
          <a href="#features" className="lp-hero-scroll">
            Learn more <span aria-hidden>&#8595;</span>
          </a>
        </div>
        <div className="lp-disclaimer">
          &#9888; For research and demonstration purposes only. Not for clinical use.
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="lp-section" id="features">
        <div className="lp-section-label">Capabilities</div>
        <h2 className="lp-section-title">What Galacticos Can Do</h2>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div className="lp-feature-card" key={f.title}>
              <div className={`lp-feature-icon lp-fi-${f.color}`}>
                {ICONS[f.icon]}
              </div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section className="lp-section">
        <div className="lp-section-label">Architecture</div>
        <h2 className="lp-section-title">Two-Pipeline System</h2>
        <div className="lp-arch-grid">
          {/* Classification */}
          <div className="lp-arch-card">
            <div className="lp-arch-accent blue" />
            <div className="lp-arch-body">
              <div className="lp-arch-header">
                <div className="lp-arch-title">Classification</div>
                <div className="lp-arch-badge blue">DINOv2 + LoRA</div>
              </div>
              {CLS_PIPELINE.map((step, i) => (
                <div className="lp-pipe-step" key={i}>
                  <div className="lp-pipe-dot">{i + 1}</div>
                  <div>
                    <div className="lp-pipe-label">{step.label}</div>
                    <div className="lp-pipe-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
              <div className="lp-arch-stats">
                <div className="lp-arch-stat"><strong>11,411</strong> training images</div>
                <div className="lp-arch-stat"><strong>86.25%</strong> best fold accuracy</div>
              </div>
            </div>
          </div>

          {/* Segmentation */}
          <div className="lp-arch-card">
            <div className="lp-arch-accent teal" />
            <div className="lp-arch-body">
              <div className="lp-arch-header">
                <div className="lp-arch-title">Segmentation</div>
                <div className="lp-arch-badge teal">nnU-Net v2</div>
              </div>
              {SEG_PIPELINE.map((step, i) => (
                <div className="lp-pipe-step" key={i}>
                  <div className="lp-pipe-dot">{i + 1}</div>
                  <div>
                    <div className="lp-pipe-label">{step.label}</div>
                    <div className="lp-pipe-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
              <div className="lp-arch-stats">
                <div className="lp-arch-stat"><strong>1,800 + 400</strong> train / val images</div>
                <div className="lp-arch-stat">IoU: <strong>0.8172</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── METRICS ─── */}
      <section className="lp-metrics-bg">
        <div className="lp-section">
          <div className="lp-section-label">Performance</div>
          <h2 className="lp-section-title">Honest Metrics, Real Results</h2>
          <div className="lp-metrics-row">
            <div className="lp-metric">
              <div className="lp-metric-value blue"><span ref={accRef}>0.00%</span></div>
              <div className="lp-metric-label">Best Fold Validation Accuracy</div>
              <div className="lp-metric-sub">5-fold cross-validation on 11,411 images</div>
            </div>
            <div className="lp-metric">
              <div className="lp-metric-value teal"><span ref={iouRef}>0.0000</span></div>
              <div className="lp-metric-label">Segmentation IoU</div>
              <div className="lp-metric-sub">Validated on 400 images</div>
            </div>
          </div>
          <div className="lp-metric-context">
            These metrics represent validation performance. Classification accuracy is the best single fold result
            from 5-fold cross-validation. Real-world performance may vary depending on image quality and tissue preparation.
          </div>
        </div>
      </section>

      {/* ─── DISEASE CLASSES ─── */}
      <section className="lp-section">
        <div className="lp-section-label">Classification Targets</div>
        <h2 className="lp-section-title">12 Tissue Classes</h2>
        <div className="lp-classes-grid">
          {Object.entries(CLASS_NAMES).map(([key, name]) => {
            const i = Number(key);
            return (
              <div className="lp-class-card" key={i}>
                <div className="lp-class-bar" style={{ background: CLASS_COLORS[i] }} />
                <div className="lp-class-num">{i}</div>
                <div className="lp-class-name">{name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <footer className="lp-footer">
        <h2 className="lp-footer-title">Ready to Analyze?</h2>
        <p className="lp-footer-desc">
          Upload a biopsy image and get AI-powered classification and segmentation results in seconds.
        </p>
        <Link href="/app" className="lp-cta">
          Launch Analysis Tool <span aria-hidden>&#8594;</span>
        </Link>
        <div className="lp-footer-disclaimer">
          &#9888; For research and demonstration purposes only. Not for clinical use.
        </div>
        <div className="lp-footer-bottom">
          Galacticos &mdash; Built with DINOv2, nnU-Net, and Next.js
        </div>
      </footer>
    </div>
  );
}
