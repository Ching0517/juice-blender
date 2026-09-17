import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Target, 
  Sparkles, 
  RotateCcw, 
  Play, 
  Check, 
  Trophy, 
  Flame, 
  Info, 
  ChevronRight, 
  Shuffle, 
  Award, 
  Trash2,
  HelpCircle
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

export interface ColorChallengeItem {
  id: string;
  name: string;
  category: string;
  targetHex: string;
  targetRgb: [number, number, number];
  hint: string;
  idealRecipeNote: string;
}

export const CHALLENGE_LIBRARY: ColorChallengeItem[] = [
  {
    id: 'matcha',
    name: 'Matcha Gelato',
    category: 'Botanical Green',
    targetHex: '#65A30D',
    targetRgb: [101, 163, 13],
    hint: 'A vibrant vegetal green. Start with heavy yellow, add blue, and soften with white.',
    idealRecipeNote: 'Try approx. 3 Yellow + 1 Blue + 1 White'
  },
  {
    id: 'terracotta',
    name: 'Tuscan Terracotta',
    category: 'Warm Earth',
    targetHex: '#C2410C',
    targetRgb: [194, 65, 12],
    hint: 'Sunbaked Mediterranean clay. Heavy red with golden yellow and a hint of blue or black for warmth.',
    idealRecipeNote: 'Try approx. 3 Red + 2 Yellow + 1 Black'
  },
  {
    id: 'spruce',
    name: 'Spruce Forest',
    category: 'Deep Botanical',
    targetHex: '#14532D',
    targetRgb: [20, 83, 45],
    hint: 'Deep coniferous pine. Mix yellow and blue, then darken with charcoal black powder.',
    idealRecipeNote: 'Try approx. 2 Yellow + 2 Blue + 1 Black'
  },
  {
    id: 'mustard',
    name: 'Golden Dijon',
    category: 'Zesty Ochre',
    targetHex: '#CA8A04',
    targetRgb: [202, 138, 4],
    hint: 'Warm, pungent golden ochre. Dominant yellow tempered with a tiny touch of red and black.',
    idealRecipeNote: 'Try approx. 4 Yellow + 1 Red + 1 Black'
  },
  {
    id: 'midnight',
    name: 'Midnight Abyss',
    category: 'Cosmic Ocean',
    targetHex: '#1E3A8A',
    targetRgb: [30, 58, 138],
    hint: 'Deep oceanic blue. High primary blue combined with a pinch of charcoal black.',
    idealRecipeNote: 'Try approx. 4 Blue + 1 Black + 1 Red'
  },
  {
    id: 'plum',
    name: 'Royal Plum',
    category: 'Regal Velvet',
    targetHex: '#7E22CE',
    targetRgb: [126, 34, 206],
    hint: 'Aristocratic deep purple. Balanced primary red and blue with a touch of white powder.',
    idealRecipeNote: 'Try approx. 2 Red + 2 Blue + 1 White'
  },
  {
    id: 'coral',
    name: 'Sunset Coral',
    category: 'Vibrant Warm',
    targetHex: '#F97316',
    targetRgb: [249, 115, 22],
    hint: 'Luminous tropical citrus. Red cubes and yellow wedges in near equal proportion.',
    idealRecipeNote: 'Try approx. 2 Red + 3 Yellow'
  },
  {
    id: 'mocha',
    name: 'Mocha Espresso',
    category: 'Rich Earth',
    targetHex: '#78350F',
    targetRgb: [120, 53, 15],
    hint: 'Roasted coffee beans. The classic tertiary mix of all three primary colors: Red, Yellow, and Blue.',
    idealRecipeNote: 'Try approx. 2 Red + 2 Yellow + 1 Blue + 1 Black'
  },
  {
    id: 'sky',
    name: 'Azure Sky',
    category: 'Atmospheric Tint',
    targetHex: '#38BDF8',
    targetRgb: [56, 189, 248],
    hint: 'Clean summer atmosphere. Primary blue lightened significantly with white chalk powder.',
    idealRecipeNote: 'Try approx. 2 Blue + 3 White'
  },
  {
    id: 'rose',
    name: 'Wild Orchid Pink',
    category: 'Floral Tint',
    targetHex: '#F43F5E',
    targetRgb: [244, 63, 94],
    hint: 'Vivid blossom magenta. Primary red lifted with white powder and a drop of blue.',
    idealRecipeNote: 'Try approx. 3 Red + 2 White'
  },
  {
    id: 'slate',
    name: 'Graphite Slate',
    category: 'Neutral Shade',
    targetHex: '#334155',
    targetRgb: [51, 65, 85],
    hint: 'Cool architect slate. Charcoal black softened with white powder and a hint of blue.',
    idealRecipeNote: 'Try approx. 2 Black + 2 White + 1 Blue'
  },
  {
    id: 'pumpkin',
    name: 'Spiced Pumpkin',
    category: 'Autumn Glow',
    targetHex: '#EA580C',
    targetRgb: [234, 88, 12],
    hint: 'Rich harvest orange. Red and yellow with a tiny touch of black for baked depth.',
    idealRecipeNote: 'Try approx. 3 Red + 3 Yellow'
  }
];

// Color accuracy calculator (Redmean formula)
export function calculateColorMatch(c1Rgb: [number, number, number], c2Rgb: [number, number, number]): number {
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

export function SingleChallenge() {
  const [challengeIdx, setChallengeIdx] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  
  // Game state
  const [recipe, setRecipe] = useState<RecipeState>({
    red: 0,
    yellow: 0,
    blue: 0,
    white: 0,
    black: 0
  });
  const [placedItems, setPlacedItems] = useState<PlacedIngredient[]>([]);
  const [isBlending, setIsBlending] = useState(false);
  const [blendProgress, setBlendProgress] = useState(0);
  const [submissionResult, setSubmissionResult] = useState<{
    accuracy: number;
    playerHex: string;
    playerRgb: [number, number, number];
    playerName: string;
    submittedRecipe: RecipeState;
  } | null>(null);

  // Historical Session Stats
  const [roundsPlayed, setRoundsPlayed] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0); // count of consecutive scores >= 85%

  const currentChallenge = CHALLENGE_LIBRARY[challengeIdx % CHALLENGE_LIBRARY.length];
  const totalFruitCount = recipe.red + recipe.yellow + recipe.blue + recipe.white + recipe.black;
  const maxCapacity = 10;

  // Live calculation for preview
  const liveResult = useMemo<BlendedResult>(() => {
    return calculateSubtractiveMix(recipe);
  }, [recipe]);

  // Select a random challenge
  const handleRandomChallenge = useCallback(() => {
    sfx.playPop();
    let nextIdx = Math.floor(Math.random() * CHALLENGE_LIBRARY.length);
    if (nextIdx === challengeIdx) {
      nextIdx = (nextIdx + 1) % CHALLENGE_LIBRARY.length;
    }
    setChallengeIdx(nextIdx);
    setRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
    setSubmissionResult(null);
    setShowHint(false);
  }, [challengeIdx]);

  // Add an ingredient to pitcher
  const addIngredient = useCallback((type: IngredientType) => {
    if (totalFruitCount >= maxCapacity || isBlending) return;
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
    setRecipe(prev => ({ ...prev, [type]: prev[type] + 1 }));
  }, [totalFruitCount, maxCapacity, isBlending, placedItems.length]);

  // Clear pitcher
  const clearPitcher = useCallback(() => {
    if (isBlending) return;
    sfx.playSplash();
    setRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
  }, [isBlending]);

  // Submit and check match!
  const submitAndJudgeMatch = useCallback(() => {
    if (totalFruitCount === 0 || isBlending) return;

    setIsBlending(true);
    setBlendProgress(0);
    sfx.playBlenderWhir(0.9);

    const startTime = Date.now();
    const duration = 850;
    const computedResult = calculateSubtractiveMix(recipe);
    const submittedRecipe = { ...recipe };

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setBlendProgress(progress);

      if (progress >= 1) {
        clearInterval(interval);
        setIsBlending(false);

        const accuracy = calculateColorMatch(computedResult.rgb, currentChallenge.targetRgb);
        
        if (accuracy >= 90) {
          sfx.playSuccess();
        } else {
          sfx.playSplash();
          setTimeout(() => sfx.playChime(), 150);
        }

        setSubmissionResult({
          accuracy,
          playerHex: computedResult.hex,
          playerRgb: computedResult.rgb,
          playerName: computedResult.name,
          submittedRecipe
        });

        // Update stats
        setRoundsPlayed(prev => prev + 1);
        setBestScore(prev => Math.max(prev, accuracy));
        if (accuracy >= 85) {
          setCurrentStreak(prev => prev + 1);
        } else {
          setCurrentStreak(0);
        }
      }
    }, 20);
  }, [totalFruitCount, isBlending, recipe, currentChallenge.targetRgb]);

  // Try same challenge again
  const retrySameChallenge = useCallback(() => {
    sfx.playPop();
    setRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
    setSubmissionResult(null);
  }, []);

  // Diagnostic feedback calculations
  const diagnosticNotes = useMemo(() => {
    if (!submissionResult) return null;
    const targetRgb = currentChallenge.targetRgb;
    const playerRgb = submissionResult.playerRgb;

    // Luminance comparison
    const targetLum = 0.299 * targetRgb[0] + 0.587 * targetRgb[1] + 0.114 * targetRgb[2];
    const playerLum = 0.299 * playerRgb[0] + 0.587 * playerRgb[1] + 0.114 * playerRgb[2];
    const lumDiff = playerLum - targetLum;

    let lumNote = '';
    if (Math.abs(lumDiff) < 15) {
      lumNote = 'Brightness is spot-on!';
    } else if (lumDiff > 0) {
      lumNote = 'Your blend is slightly too light. Try reducing White or adding a shade.';
    } else {
      lumNote = 'Your blend is slightly too dark. Try adding White powder to tint.';
    }

    return {
      lumNote,
      accuracy: submissionResult.accuracy
    };
  }, [submissionResult, currentChallenge.targetRgb]);

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-0 select-none">
      
      {/* TOP TOOLBAR */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200/90">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            <h2 className="text-base font-black tracking-tight text-stone-900">
              Single Match Challenge
            </h2>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full border border-rose-200">
              Color Matcher
            </span>
          </div>

          <button
            onClick={handleRandomChallenge}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 transition-all shadow-2xs"
            title="Get a new target challenge"
          >
            <Shuffle className="w-3.5 h-3.5 text-stone-500" />
            <span>New Target</span>
          </button>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{currentStreak} Streak</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 bg-white border border-stone-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
            <span>Rounds: <strong className="text-stone-900">{roundsPlayed}</strong></span>
            {bestScore > 0 && (
              <>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  Best: <strong className="text-stone-900">{bestScore}%</strong>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MAIN SINGLE-SCREEN WORKSPACE: 3 PANELS */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 xl:gap-3 items-stretch">

        {/* PANEL 1: TARGET COLOR SPECIFICATION (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col justify-between min-h-0 bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-xs gap-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <Target className="w-3.5 h-3.5 text-rose-500" />
              Target Color
            </span>
            <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
              {currentChallenge.category}
            </span>
          </div>

          {/* Big Target Swatch */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 p-2">
            <div 
              className="w-full max-w-[200px] aspect-square rounded-2xl border-4 border-white shadow-md ring-2 ring-stone-200 flex items-center justify-center transition-all duration-300 relative group overflow-hidden"
              style={{ backgroundColor: currentChallenge.targetHex }}
            >
              {/* Gloss highlight */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-xl" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-stone-900 tracking-tight">
                {currentChallenge.name}
              </h3>
              <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                {currentChallenge.targetHex}
              </p>
            </div>
          </div>

          {/* Hint Drawer & Instructions */}
          <div className="shrink-0 p-2.5 bg-amber-50/90 rounded-xl border border-amber-200/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Colorist Clue
              </span>
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline"
              >
                {showHint ? 'Hide Hint' : 'Reveal Hint'}
              </button>
            </div>

            {showHint ? (
              <p className="text-[11px] text-amber-900 leading-relaxed animate-in fade-in duration-200">
                {currentChallenge.hint}
              </p>
            ) : (
              <p className="text-[11px] text-amber-800/80 leading-relaxed italic">
                Observe the target hue, saturation, and tone. Mix fruits in the blender to match!
              </p>
            )}
          </div>
        </div>

        {/* PANEL 2: COMPARISON & RESULTS DISPLAY (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col justify-between min-h-0 bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-xs gap-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Submission Analysis
            </span>
            <span className="text-[10px] font-semibold text-stone-400">
              {submissionResult ? 'Judged' : 'Waiting for Submit'}
            </span>
          </div>

          {/* Results Display when submitted */}
          {submissionResult ? (
            <div className="flex-1 min-h-0 flex flex-col justify-between items-center text-center gap-2 p-1 animate-in zoom-in-95 duration-200">
              
              {/* Score Badge */}
              <div className="flex flex-col items-center">
                <div className={`text-4xl font-black tracking-tight ${
                  submissionResult.accuracy >= 90 ? 'text-emerald-600' :
                  submissionResult.accuracy >= 75 ? 'text-amber-600' : 'text-stone-700'
                }`}>
                  {submissionResult.accuracy}%
                </div>
                <div className="text-xs font-bold text-stone-800 mt-0.5">
                  {submissionResult.accuracy >= 95 ? '🏆 Flawless Color Match!' :
                   submissionResult.accuracy >= 85 ? '🎯 Outstanding Accuracy!' :
                   submissionResult.accuracy >= 70 ? '✨ Great Approximation!' :
                   '🎨 Interesting Color Variant!'}
                </div>
              </div>

              {/* Side-by-Side Split View Comparison */}
              <div className="flex items-center justify-center gap-4 w-full my-auto">
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm ring-1 ring-stone-300"
                    style={{ backgroundColor: currentChallenge.targetHex }}
                  />
                  <span className="text-[10px] font-bold text-stone-500">Target</span>
                  <span className="text-[9px] font-mono text-stone-400">{currentChallenge.targetHex}</span>
                </div>

                {/* Split circle lens */}
                <div className="relative w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden ring-2 ring-amber-300 shrink-0">
                  <div 
                    className="absolute inset-0 w-1/2"
                    style={{ backgroundColor: currentChallenge.targetHex }}
                  />
                  <div 
                    className="absolute inset-0 left-1/2 w-1/2"
                    style={{ backgroundColor: submissionResult.playerHex }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/80 shadow-xs" />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm ring-1 ring-stone-300"
                    style={{ backgroundColor: submissionResult.playerHex }}
                  />
                  <span className="text-[10px] font-bold text-amber-800">Your Juice</span>
                  <span className="text-[9px] font-mono text-stone-400">{submissionResult.playerHex}</span>
                </div>
              </div>

              {/* Diagnostic notes & Ideal hint */}
              <div className="w-full text-left p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex flex-col gap-1">
                <div>
                  <strong className="text-stone-800">Analysis: </strong>
                  {diagnosticNotes?.lumNote}
                </div>
                {submissionResult.accuracy < 85 && (
                  <div className="text-stone-500 text-[10px] pt-1 border-t border-stone-200/60">
                    💡 <span className="font-semibold">Ideal blend:</span> {currentChallenge.idealRecipeNote}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  onClick={retrySameChallenge}
                  className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 shadow-2xs transition-all active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={handleRandomChallenge}
                  className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                >
                  <span>Next Challenge</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-4 text-stone-400 gap-2">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <HelpCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-stone-700 text-sm">Waiting for Your Blend</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-[220px] leading-relaxed">
                  Add fruit ingredients into the pitcher on the right, then hit <strong className="text-stone-700 font-semibold">Submit & Check Match</strong> to judge similarity!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PANEL 3: BLENDER MIXING STATION (lg:col-span-4) */}
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
                    : submissionResult 
                      ? `${Math.min(90, Math.max(20, totalFruitCount * 9))}%`
                      : '0%',
                  backgroundColor: liveResult.hex,
                  opacity: isBlending ? blendProgress * 0.95 : submissionResult ? 0.95 : 0
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

              {totalFruitCount === 0 && !submissionResult && (
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
                  Blending & Judging...
                </span>
              ) : totalFruitCount > 0 ? (
                <span className="font-bold text-stone-700">
                  {totalFruitCount} fruit{totalFruitCount > 1 ? 's' : ''} loaded
                </span>
              ) : (
                <span className="text-stone-400 font-medium text-[10px]">Add fruits to match target</span>
              )}
              <span className="text-[10px] font-semibold text-stone-400">
                Max 10
              </span>
            </div>
          </div>

          {/* INGREDIENT BUTTONS */}
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[11px] font-bold text-stone-700">Add Ingredients:</span>
            <div className="grid grid-cols-5 gap-1.5">
              {INGREDIENTS.map(ing => (
                <button
                  key={ing.id}
                  onClick={() => addIngredient(ing.id)}
                  disabled={totalFruitCount >= maxCapacity || isBlending}
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
                    +{recipe[ing.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS: Clear & Submit */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-stone-100 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={clearPitcher}
                disabled={totalFruitCount === 0 || isBlending}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl border border-stone-200 transition-colors disabled:opacity-40 shrink-0"
                title="Clear pitcher"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Submit & Judge Button */}
              <button
                onClick={submitAndJudgeMatch}
                disabled={totalFruitCount === 0 || isBlending}
                className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-xs active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Play className={`w-3.5 h-3.5 fill-white ${isBlending ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {isBlending ? 'Judging Color...' : 'Submit & Check Match'}
                </span>
                {!isBlending && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-stone-400 text-center leading-none">
              Blends ingredients and calculates exact optical similarity %
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
