import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Palette, 
  Award, 
  Info,
  ChevronRight,
  Eye,
  Trash2
} from 'lucide-react';
import { 
  IngredientType, 
  RecipeState, 
  PlacedIngredient, 
  BlendedResult,
  calculateSubtractiveMix,
  INGREDIENTS,
  IngredientGraphic,
  sfx
} from '../App';

export interface ArtworkZone {
  id: string;
  number: number;
  name: string;
  hint: string;
  targetHex: string;
  targetRgb: [number, number, number];
  path: string;
  labelPos: { x: number; y: number };
}

export interface ArtworkTemplate {
  id: string;
  title: string;
  shortTitle: string;
  desc: string;
  zones: ArtworkZone[];
}

export interface PlayerPaintRecord {
  hex: string;
  rgb: [number, number, number];
  accuracy: number;
  name: string;
  recipe: RecipeState;
}

// 3 Curated Geometric Coloring Templates (in English)
export const GAME_TEMPLATES: ArtworkTemplate[] = [
  {
    id: 'fruit-platter',
    title: 'Geometric Tropical Fruits',
    shortTitle: 'Tropical Fruits',
    desc: 'Classic subtractive fruit color challenge. Test your eye on pure yellow, lush green, juicy red, and deep blueberry!',
    zones: [
      {
        id: 'pineapple-body',
        number: 1,
        name: 'Pineapple Body',
        hint: 'Pure, high-chroma primary yellow!',
        targetHex: '#FACC15',
        targetRgb: [250, 204, 21],
        path: 'M 140 180 Q 200 205 260 180 Q 275 175 285 190 L 310 275 Q 315 295 290 305 Q 200 335 110 305 Q 85 295 90 275 L 115 190 Q 125 175 140 180 Z',
        labelPos: { x: 200, y: 255 }
      },
      {
        id: 'pineapple-crown',
        number: 2,
        name: 'Pineapple Crown',
        hint: 'Mix Yellow + Blue for natural botanical green!',
        targetHex: '#16A34A',
        targetRgb: [22, 163, 74],
        path: 'M 155 180 L 135 115 L 175 140 L 200 65 L 225 140 L 265 115 L 245 180 Q 200 195 155 180 Z',
        labelPos: { x: 200, y: 130 }
      },
      {
        id: 'melon-flesh',
        number: 3,
        name: 'Watermelon Slice',
        hint: 'Sweet, bright primary red block base!',
        targetHex: '#EF4444',
        targetRgb: [239, 68, 68],
        path: 'M 255 240 L 360 210 A 130 130 0 0 1 360 340 Z',
        labelPos: { x: 310, y: 265 }
      },
      {
        id: 'melon-rind',
        number: 4,
        name: 'Watermelon Rind',
        hint: 'Mix Yellow + Blue with extra yellow for bright lime rind!',
        targetHex: '#22C55E',
        targetRgb: [34, 197, 94],
        path: 'M 360 210 A 130 130 0 0 1 360 340 L 375 350 A 148 148 0 0 0 375 200 Z',
        labelPos: { x: 375, y: 275 }
      },
      {
        id: 'orange-slice',
        number: 5,
        name: 'Orange Segment',
        hint: 'Mix Red + Yellow for warm, zesty orange!',
        targetHex: '#F97316',
        targetRgb: [249, 115, 22],
        path: 'M 145 240 L 40 210 A 130 130 0 0 0 40 340 Z',
        labelPos: { x: 90, y: 265 }
      },
      {
        id: 'blueberries',
        number: 6,
        name: 'Blueberry Berries',
        hint: 'Deep primary blue fruit cluster!',
        targetHex: '#2563EB',
        targetRgb: [37, 99, 235],
        path: 'M 170 340 A 24 24 0 1 0 205 340 A 24 24 0 1 0 240 350 A 24 24 0 1 0 170 340 Z',
        labelPos: { x: 205, y: 340 }
      },
      {
        id: 'plate-stand',
        number: 7,
        name: 'Geometric Pedestal',
        hint: 'Mix Red + Blue for regal royal purple!',
        targetHex: '#9333EA',
        targetRgb: [147, 51, 234],
        path: 'M 110 368 L 290 368 L 315 392 L 85 392 Z',
        labelPos: { x: 200, y: 382 }
      }
    ]
  },
  {
    id: 'macaw',
    title: 'Geometric Scarlet Macaw',
    shortTitle: 'Scarlet Macaw',
    desc: "Nature's most dazzling plumage! Blend warm earth brown, lush green, and deep obsidian slate.",
    zones: [
      {
        id: 'beak',
        number: 1,
        name: 'Golden Beak',
        hint: 'Bright, warm high-visibility amber yellow!',
        targetHex: '#FBBF24',
        targetRgb: [251, 191, 36],
        path: 'M 170 120 L 255 150 L 170 180 Z',
        labelPos: { x: 200, y: 150 }
      },
      {
        id: 'crest',
        number: 2,
        name: 'Crimson Crest',
        hint: 'Radiant, fiery primary red feather crown!',
        targetHex: '#DC2626',
        targetRgb: [220, 38, 38],
        path: 'M 170 120 L 170 65 L 115 95 L 85 145 L 140 185 L 170 180 Z',
        labelPos: { x: 135, y: 135 }
      },
      {
        id: 'wing',
        number: 3,
        name: 'Azure Wing',
        hint: 'High-saturation sky blue wing plumage!',
        targetHex: '#0284C7',
        targetRgb: [2, 132, 199],
        path: 'M 85 145 L 45 255 L 110 305 L 140 185 Z',
        labelPos: { x: 95, y: 225 }
      },
      {
        id: 'belly',
        number: 4,
        name: 'Emerald Belly',
        hint: 'Deep rainforest foliage green!',
        targetHex: '#15803D',
        targetRgb: [21, 128, 61],
        path: 'M 140 185 L 110 305 L 180 315 L 200 215 L 170 180 Z',
        labelPos: { x: 160, y: 250 }
      },
      {
        id: 'perch',
        number: 5,
        name: 'Mocha Perch',
        hint: 'Mix all 3 primary colors (Red + Yellow + Blue) for warm earth brown!',
        targetHex: '#78350F',
        targetRgb: [120, 53, 15],
        path: 'M 30 305 L 370 325 L 360 355 L 20 335 Z',
        labelPos: { x: 270, y: 340 }
      },
      {
        id: 'tail',
        number: 6,
        name: 'Obsidian Tail',
        hint: 'Add charcoal black powder for deep shadowy slate!',
        targetHex: '#1E293B',
        targetRgb: [30, 41, 59],
        path: 'M 95 305 L 65 390 L 115 390 L 130 315 Z',
        labelPos: { x: 95, y: 355 }
      }
    ]
  },
  {
    id: 'rocket',
    title: 'Retro Cosmic Rocket',
    shortTitle: 'Space Rocket',
    desc: 'An interstellar voyage covering clean aero-white, cosmic navy, and blazing propulsion exhaust.',
    zones: [
      {
        id: 'fuselage',
        number: 1,
        name: 'Rocket Fuselage',
        hint: 'Use white chalk powder to lighten into clean aero-white!',
        targetHex: '#F8FAFC',
        targetRgb: [248, 250, 252],
        path: 'M 200 55 L 245 155 L 245 265 L 155 265 L 155 155 Z',
        labelPos: { x: 200, y: 190 }
      },
      {
        id: 'nosecone',
        number: 2,
        name: 'Cosmic Nose Cone',
        hint: 'Deep, serene space navy blue!',
        targetHex: '#1E3A8A',
        targetRgb: [30, 58, 138],
        path: 'M 200 55 L 230 120 L 170 120 Z',
        labelPos: { x: 200, y: 95 }
      },
      {
        id: 'wings',
        number: 3,
        name: 'Aerospace Fins',
        hint: 'Iconic bold aerospace scarlet red!',
        targetHex: '#E11D48',
        targetRgb: [225, 29, 72],
        path: 'M 155 205 L 90 280 L 155 275 Z M 245 205 L 310 280 L 245 275 Z',
        labelPos: { x: 120, y: 255 }
      },
      {
        id: 'flame',
        number: 4,
        name: 'Outer Thruster Flame',
        hint: 'Mix Red + Yellow for searing combustion orange!',
        targetHex: '#EA580C',
        targetRgb: [234, 88, 12],
        path: 'M 170 265 L 230 265 L 200 370 Z',
        labelPos: { x: 200, y: 310 }
      },
      {
        id: 'core-glow',
        number: 5,
        name: 'Core Plasma Glow',
        hint: 'Ultra-hot pure golden yellow core!',
        targetHex: '#FACC15',
        targetRgb: [250, 204, 21],
        path: 'M 185 265 L 215 265 L 200 325 Z',
        labelPos: { x: 200, y: 285 }
      },
      {
        id: 'window',
        number: 6,
        name: 'Cockpit Viewport',
        hint: 'Deep midnight indigo reflecting outer space!',
        targetHex: '#0F172A',
        targetRgb: [15, 23, 42],
        path: 'M 175 175 A 25 25 0 1 0 225 175 A 25 25 0 1 0 175 175 Z',
        labelPos: { x: 200, y: 175 }
      }
    ]
  }
];

// Color accuracy calculator (Redmean formula)
function calculateColorMatch(c1Rgb: [number, number, number], c2Rgb: [number, number, number]): number {
  const rMean = (c1Rgb[0] + c2Rgb[0]) / 2;
  const dR = c1Rgb[0] - c2Rgb[0];
  const dG = c1Rgb[1] - c2Rgb[1];
  const dB = c1Rgb[2] - c2Rgb[2];
  const dist = Math.sqrt(
    (2 + rMean / 256) * dR * dR +
    4 * dG * dG +
    (2 + (255 - rMean) / 256) * dB * dB
  );
  const score = Math.max(0, Math.min(100, Math.round(100 - (dist / 4.8))));
  return score;
}

export function ColoringGame() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fruit-platter');
  const template = useMemo(() => {
    return GAME_TEMPLATES.find(t => t.id === selectedTemplateId) || GAME_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Game state
  const [currentZoneIdx, setCurrentZoneIdx] = useState<number>(0);
  const [playerPaints, setPlayerPaints] = useState<Record<string, PlayerPaintRecord>>({});

  // Mini-game blender state
  const [gameRecipe, setGameRecipe] = useState<RecipeState>({
    red: 0,
    yellow: 0,
    blue: 0,
    white: 0,
    black: 0
  });
  const [placedItems, setPlacedItems] = useState<PlacedIngredient[]>([]);
  const [isBlending, setIsBlending] = useState(false);
  const [blendProgress, setBlendProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalFruitCount = gameRecipe.red + gameRecipe.yellow + gameRecipe.blue + gameRecipe.white + gameRecipe.black;
  const maxCapacity = 10;
  const currentZone = template.zones[currentZoneIdx];
  const isFinished = currentZoneIdx >= template.zones.length;

  // Blended result
  const blendedResult = useMemo<BlendedResult>(() => {
    return calculateSubtractiveMix(gameRecipe);
  }, [gameRecipe]);

  // Overall Match Score
  const overallScore = useMemo(() => {
    const records = Object.values(playerPaints) as PlayerPaintRecord[];
    if (records.length === 0) return 0;
    return Math.round(records.reduce((a, b) => a + b.accuracy, 0) / records.length);
  }, [playerPaints]);

  // Add ingredient into game blender
  const addIngredient = useCallback((type: IngredientType) => {
    if (totalFruitCount >= maxCapacity || isBlending || isFinished) return;
    sfx.playPop();

    const currentCount = placedItems.length;
    const stackLayer = Math.min(7, currentCount);
    const baseY = 78 - stackLayer * 5.2;
    const randomY = Math.max(30, baseY + (Math.random() * 8 - 4));
    const randomX = 28 + Math.random() * 44;
    const randomRotation = -20 + Math.random() * 40;
    const randomScale = 0.95 + Math.random() * 0.15;

    const newItem: PlacedIngredient = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      x: randomX,
      y: randomY,
      rotation: randomRotation,
      scale: randomScale
    };

    setPlacedItems(prev => [...prev, newItem]);
    setGameRecipe(prev => ({ ...prev, [type]: prev[type] + 1 }));
  }, [totalFruitCount, maxCapacity, isBlending, isFinished, placedItems.length]);

  // Clear pitcher before blending (raw ingredients only)
  const clearPitcher = useCallback(() => {
    if (isBlending) return;
    sfx.playSplash();
    setGameRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
  }, [isBlending]);

  // Blend and IMMEDIATELY paint directly onto the canvas! (No undo, no rethink!)
  const blendAndPaintDirectly = useCallback(() => {
    if (!currentZone || isFinished || totalFruitCount === 0 || isBlending) return;

    setIsBlending(true);
    setBlendProgress(0);
    sfx.playBlenderWhir(0.9);

    const startTime = Date.now();
    const duration = 850;
    const currentMixResult = calculateSubtractiveMix(gameRecipe);
    const currentMixRecipe = { ...gameRecipe };

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setBlendProgress(progress);

      if (progress >= 1) {
        clearInterval(interval);
        setIsBlending(false);

        // Instantly commit and paint directly onto the canvas!
        const accuracy = calculateColorMatch(currentMixResult.rgb, currentZone.targetRgb);
        sfx.playSplash();
        setTimeout(() => sfx.playChime(), 150);

        setPlayerPaints(prev => ({
          ...prev,
          [currentZone.id]: {
            hex: currentMixResult.hex,
            rgb: currentMixResult.rgb,
            accuracy,
            name: currentMixResult.name,
            recipe: currentMixRecipe
          }
        }));

        let feedback = '';
        if (accuracy >= 90) {
          feedback = `🎯 Zone #${currentZone.number} matched brilliantly! Accuracy: ${accuracy}%`;
        } else if (accuracy >= 75) {
          feedback = `✨ Zone #${currentZone.number} is very close! Accuracy: ${accuracy}%`;
        } else if (accuracy >= 55) {
          feedback = `🎨 Zone #${currentZone.number} locked in! Accuracy: ${accuracy}%`;
        } else {
          feedback = `🧪 Wild bold shade for Zone #${currentZone.number}! Accuracy: ${accuracy}%`;
        }
        setToastMessage(feedback);
        setTimeout(() => setToastMessage(null), 3000);

        // Reset pitcher immediately for next zone
        setGameRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
        setPlacedItems([]);

        const nextIdx = currentZoneIdx + 1;
        setCurrentZoneIdx(nextIdx);

        if (nextIdx >= template.zones.length) {
          setTimeout(() => sfx.playSuccess(), 400);
        }
      }
    }, 20);
  }, [currentZone, isFinished, totalFruitCount, isBlending, gameRecipe, currentZoneIdx, template.zones.length]);

  // Restart current game
  const resetGame = useCallback(() => {
    sfx.playPop();
    setCurrentZoneIdx(0);
    setPlayerPaints({});
    setGameRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
    setToastMessage(null);
  }, []);

  // Switch Template
  const handleSelectTemplate = (tplId: string) => {
    sfx.playPop();
    setSelectedTemplateId(tplId);
    setCurrentZoneIdx(0);
    setPlayerPaints({});
    setGameRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
    setToastMessage(null);
  };

  // High-Resolution Artwork Download via HTML5 Canvas
  const downloadArtwork = useCallback(() => {
    sfx.playChime();
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#fbf9f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 16;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    // Header
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(template.title, canvas.width / 2, 95);

    ctx.fillStyle = '#78716c';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(`Juice Blender Color Studio • Overall Color Accuracy: ${overallScore}%`, canvas.width / 2, 130);

    // Render Artwork Polygons
    ctx.save();
    const scale = 1.75;
    const offsetX = (canvas.width - 400 * scale) / 2;
    const offsetY = 170;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    template.zones.forEach((zone) => {
      const p = new Path2D(zone.path);
      const paint = playerPaints[zone.id];
      ctx.fillStyle = paint ? paint.hex : '#f5f5f4';
      ctx.fill(p);

      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke(p);
    });

    ctx.restore();

    // Color Palette Breakdown at bottom
    ctx.fillStyle = '#292524';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Blended Juice Swatches (Palette Breakdown):', 60, 930);

    const swatchWidth = (canvas.width - 120) / template.zones.length;
    template.zones.forEach((zone, idx) => {
      const paint = playerPaints[zone.id];
      const x = 60 + idx * swatchWidth;
      const y = 955;

      ctx.fillStyle = paint ? paint.hex : '#e7e5e4';
      ctx.fillRect(x + 4, y, swatchWidth - 8, 55);

      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, y, swatchWidth - 8, 55);

      ctx.fillStyle = zone.targetHex;
      ctx.beginPath();
      ctx.arc(x + swatchWidth - 14, y + 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${zone.number}`, x + 8, y + 16);

      ctx.fillStyle = '#44403c';
      ctx.font = '600 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(paint ? `${paint.accuracy}%` : '--', x + swatchWidth / 2, y + 78);

      ctx.fillStyle = '#78716c';
      ctx.font = '11px sans-serif';
      ctx.fillText(zone.name.slice(0, 8), x + swatchWidth / 2, y + 95);
    });

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    ctx.fillStyle = '#a8a29e';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Generated by Juice Blender Color Studio • ${dateStr}`, canvas.width / 2, 1140);

    const link = document.createElement('a');
    link.download = `juice-artwork-${template.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [template, playerPaints, overallScore]);

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-0 select-none">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-md border border-stone-700 animate-in fade-in slide-in-from-top-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* COMPACT TOP TOOLBAR: fits entirely in minimal height */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200/90">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-black tracking-tight text-stone-900">
              Coloring Challenge
            </h2>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
              Single-Shot
            </span>
          </div>

          {/* Template Selector Pills */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
            {GAME_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedTemplateId === t.id
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {t.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {/* Right Info: Progress & Restart */}
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-stone-600 bg-white border border-stone-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
            {isFinished ? (
              <span className="text-emerald-700 font-bold">🎉 Complete! Avg: {overallScore}%</span>
            ) : (
              <span>Zone <strong className="text-stone-900">{currentZoneIdx + 1}</strong> of {template.zones.length}</span>
            )}
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-lg border border-stone-200 shadow-2xs transition-colors"
            title="Restart Canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      {/* MAIN SINGLE-SCREEN WORKSPACE: 3 COLUMNS SIDE-BY-SIDE */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 xl:gap-3 items-stretch">

        {/* COLUMN 1: TARGET GOAL & REFERENCE (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col justify-between min-h-0 bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs gap-2.5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
              <Eye className="w-3.5 h-3.5 text-stone-500" />
              Target Goal
            </span>
            <span className="text-[10px] text-stone-400 font-semibold">Standard Guide</span>
          </div>

          {/* Scaled Reference Artwork */}
          <div className="relative flex-1 min-h-0 w-full rounded-xl bg-stone-50 border border-stone-200/80 p-2 overflow-hidden flex items-center justify-center shadow-inner">
            <svg viewBox="0 0 400 400" className="w-full h-full max-h-[170px] xl:max-h-[210px] object-contain drop-shadow-xs">
              {template.zones.map(zone => (
                <g key={zone.id}>
                  <path
                    d={zone.path}
                    fill={zone.targetHex}
                    stroke="#292524"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={zone.labelPos.x}
                    cy={zone.labelPos.y}
                    r="12"
                    fill="#ffffff"
                    stroke="#1c1917"
                    strokeWidth="1.5"
                  />
                  <text
                    x={zone.labelPos.x}
                    y={zone.labelPos.y + 4.5}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fill="#1c1917"
                  >
                    {zone.number}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Active Target Color Swatch & Recipe Hint */}
          <div className="shrink-0 p-2.5 bg-amber-50/90 rounded-xl border border-amber-200/80 flex flex-col gap-1.5">
            {!isFinished && currentZone ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg border border-stone-300 shadow-xs shrink-0"
                    style={{ backgroundColor: currentZone.targetHex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-amber-900 truncate">
                      Target #{currentZone.number}: {currentZone.name}
                    </div>
                    <div className="text-[10px] font-mono text-stone-500">
                      {currentZone.targetHex}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-amber-950 font-medium leading-snug pt-1 border-t border-amber-200/60">
                  💡 <span className="font-semibold">Hint:</span> {currentZone.hint}
                </div>
              </>
            ) : (
              <div className="text-center py-1 text-xs text-amber-900 font-semibold">
                ✨ All zones painted! See results in canvas.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: LIVE PLAYER CANVAS (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col justify-between min-h-0 bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs gap-2 relative">
          <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Your Live Canvas
            </span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              {isFinished ? 'Complete (100%)' : `Zone #${currentZoneIdx + 1} Active`}
            </span>
          </div>

          {/* Interactive Player SVG Canvas */}
          <div className="relative flex-1 min-h-0 w-full rounded-xl bg-stone-50/50 border-2 border-amber-200/80 p-2 overflow-hidden flex items-center justify-center shadow-inner">
            <svg viewBox="0 0 400 400" className="w-full h-full max-h-[290px] xl:max-h-[350px] object-contain drop-shadow-sm">
              {template.zones.map((zone, idx) => {
                const paint = playerPaints[zone.id];
                const isActive = !isFinished && idx === currentZoneIdx;

                return (
                  <g key={zone.id}>
                    <path
                      d={zone.path}
                      fill={paint ? paint.hex : isActive ? '#ffffff' : '#f8fafc'}
                      stroke={isActive ? '#f59e0b' : '#44403c'}
                      strokeWidth={isActive ? '3.5' : '2'}
                      strokeDasharray={isActive ? '6 3' : 'none'}
                      strokeLinejoin="round"
                      className={isActive ? 'animate-pulse' : ''}
                    />
                    <circle
                      cx={zone.labelPos.x}
                      cy={zone.labelPos.y}
                      r={isActive ? '13' : '10'}
                      fill={paint ? '#ffffff' : isActive ? '#fef3c7' : '#f1f5f9'}
                      stroke={isActive ? '#d97706' : '#78716c'}
                      strokeWidth={isActive ? '2' : '1'}
                      className="drop-shadow-xs"
                    />
                    <text
                      x={zone.labelPos.x}
                      y={zone.labelPos.y + (isActive ? 4.5 : 3.5)}
                      textAnchor="middle"
                      fontSize={isActive ? '12' : '10'}
                      fontWeight="bold"
                      fill={isActive ? '#b45309' : '#1c1917'}
                    >
                      {zone.number}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Pulsing indicator on active cell */}
            {!isFinished && currentZone && (
              <div 
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  left: `${(currentZone.labelPos.x / 400) * 100}%`,
                  top: `${(currentZone.labelPos.y / 400) * 100}%`,
                }}
              >
                <span className="w-6 h-6 rounded-full border-2 border-amber-500 animate-ping opacity-75" />
              </div>
            )}
          </div>

          {/* Bottom Progress Badges / Celebration Banner */}
          <div className="shrink-0 border-t border-stone-100 pt-2">
            {isFinished ? (
              <div className="flex items-center justify-between gap-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-[11px] font-bold text-stone-900">
                    Artwork Finished! Score: {overallScore}%
                  </div>
                </div>
                <button
                  onClick={downloadArtwork}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg shadow-xs active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {template.zones.map((zone, idx) => {
                  const paint = playerPaints[zone.id];
                  const isActive = idx === currentZoneIdx;

                  return (
                    <div
                      key={zone.id}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 transition-all ${
                        paint
                          ? 'bg-stone-50 border-stone-200 text-stone-800'
                          : isActive
                            ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-300'
                            : 'bg-stone-100/60 border-stone-200 text-stone-400'
                      }`}
                      title={zone.name}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-stone-300"
                        style={{ backgroundColor: paint ? paint.hex : zone.targetHex }}
                      />
                      <span>#{zone.number}</span>
                      {paint && <span className="text-[10px] text-stone-500">{paint.accuracy}%</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: BLENDER MIXING STATION (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col justify-between min-h-0 bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs gap-2">
          {/* Header & Status */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 shrink-0">
            <span className="text-xs font-bold text-stone-800">
              Blender Mixing Station
            </span>
            <span className="text-[10px] font-semibold text-stone-500">
              Vol: {totalFruitCount}/10
            </span>
          </div>

          {/* Compact Pitcher Display */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-36 h-36 bg-stone-50/90 rounded-b-2xl rounded-t-md border-2 border-stone-300 shadow-inner overflow-hidden flex items-end justify-center">
              
              {/* Measurement lines */}
              <div className="absolute left-1.5 top-2 bottom-2 w-3 flex flex-col justify-between pointer-events-none z-20 text-[8px] font-bold text-stone-400">
                <span>800</span>
                <span>400</span>
                <span>200</span>
              </div>

              {/* Mixed Liquid Volume */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-300 z-10"
                style={{
                  height: isBlending 
                    ? `${Math.min(90, blendProgress * Math.max(20, totalFruitCount * 9))}%` 
                    : '0%',
                  backgroundColor: blendedResult.hex,
                  opacity: isBlending ? blendProgress * 0.95 : 0
                }}
              >
                <div className="w-full h-1.5 bg-white/40 border-b border-white/20" />
              </div>

              {/* Physical Fruits in Pitcher */}
              <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
                {placedItems.map(item => (
                  <div
                    key={item.id}
                    className="absolute transition-all duration-300 ease-out"
                    style={{
                      left: `${item.x}%`,
                      top: isBlending ? '75%' : `${item.y}%`,
                      transform: `translate(-50%, -50%) rotate(${
                        isBlending ? item.rotation + blendProgress * 720 : item.rotation
                      }deg) scale(${isBlending ? Math.max(0, (1 - blendProgress) * item.scale * 0.8) : item.scale * 0.8})`,
                      opacity: isBlending ? Math.max(0, 1 - blendProgress * 1.3) : 1
                    }}
                  >
                    <IngredientGraphic type={item.type} size="sm" />
                  </div>
                ))}
              </div>

              {totalFruitCount === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-stone-400 text-[11px] p-2">
                  <span>Pitcher is empty</span>
                  <span className="text-[9px] text-stone-400 mt-0.5">Tap fruits below to load</span>
                </div>
              )}

              {/* Blade */}
              <div className="absolute bottom-1 w-8 h-1.5 bg-stone-400 rounded-full z-20" />
            </div>

            {/* Status readout under pitcher */}
            <div className="w-full flex items-center justify-between mt-1 px-1 text-[11px]">
              {isBlending ? (
                <span className="font-bold text-amber-600 flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />
                  Blending & Painting...
                </span>
              ) : totalFruitCount > 0 ? (
                <span className="font-bold text-stone-700">
                  {totalFruitCount} fruit{totalFruitCount > 1 ? 's' : ''} loaded
                </span>
              ) : (
                <span className="text-stone-400 font-medium text-[10px]">Add fruits then blend</span>
              )}
              <span className="text-[10px] font-semibold text-stone-400">
                {isFinished ? 'Done' : `Target #${currentZone?.number}`}
              </span>
            </div>
          </div>

          {/* INGREDIENT BUTTONS (Red, Yellow, Blue, White, Black) */}
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[11px] font-bold text-stone-700">Add Ingredients:</span>
            <div className="grid grid-cols-5 gap-1.5">
              {INGREDIENTS.map(ing => (
                <button
                  key={ing.id}
                  onClick={() => addIngredient(ing.id)}
                  disabled={totalFruitCount >= maxCapacity || isBlending || isFinished}
                  className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-amber-400 hover:shadow-2xs active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none group"
                  title={`Add ${ing.name}`}
                >
                  <div className="w-7 h-7 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IngredientGraphic type={ing.id} size="sm" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-700 mt-0.5 leading-tight truncate">
                    {ing.id === 'red' ? 'Red' : ing.id === 'yellow' ? 'Yellow' : ing.id === 'blue' ? 'Blue' : ing.id === 'white' ? 'White' : 'Black'}
                  </span>
                  <span className="text-[9px] text-stone-400 font-semibold">
                    +{gameRecipe[ing.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS: Single direct Blend & Paint action */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-stone-100 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={clearPitcher}
                disabled={totalFruitCount === 0 || isBlending}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl border border-stone-200 transition-colors disabled:opacity-40 shrink-0"
                title="Clear raw ingredients"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Single Irreversible Action: Blend & Commit Directly */}
              <button
                onClick={blendAndPaintDirectly}
                disabled={isFinished || totalFruitCount === 0 || isBlending}
                className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-xs active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Palette className={`w-3.5 h-3.5 fill-white ${isBlending ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {isBlending 
                    ? `Blending & Painting Zone #${currentZone?.number}...` 
                    : `Blend & Paint Zone #${currentZone?.number}`}
                </span>
                {!isBlending && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-amber-800 font-medium text-center leading-none">
              🔒 Locks immediately into canvas — cannot be undone!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
