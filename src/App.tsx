import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Play, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Info, 
  Layers, 
  Droplet, 
  Plus, 
  Minus, 
  BookOpen, 
  Palette,
  ExternalLink,
  ChevronRight,
  Flame
} from 'lucide-react';

// --- TYPES ---
export type IngredientType = 'red' | 'yellow' | 'blue' | 'white' | 'black';

export interface IngredientMeta {
  id: IngredientType;
  name: string;
  role: string;
  subTitle: string;
  colorHex: string;
  theoryRole: 'Primary' | 'Tint' | 'Shade';
  desc: string;
}

export interface PlacedIngredient {
  id: string;
  type: IngredientType;
  x: number; // percentage in pitcher
  y: number; // percentage in pitcher
  rotation: number;
  scale: number;
}

export interface RecipeState {
  red: number;
  yellow: number;
  blue: number;
  white: number;
  black: number;
}

export interface BlendedResult {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  name: string;
  category: string;
  designNote: string;
  rRatio: number;
  yRatio: number;
  bRatio: number;
  tintLevel: number;
  shadeLevel: number;
}

// --- SOUND SYNTHESIS VIA WEB AUDIO API ---
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playPop() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // AudioContext policy safe guard
    }
  }

  playBlenderWhir(durationSec = 1.5) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      
      // Motor drone oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.4);
      osc.frequency.setValueAtTime(260, now + durationSec - 0.3);
      osc.frequency.exponentialRampToValueAtTime(80, now + durationSec);

      // Filter for muffled blender jar sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(1200, now + 0.5);
      filter.frequency.exponentialRampToValueAtTime(300, now + durationSec);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.2);
      gain.gain.setValueAtTime(0.18, now + durationSec - 0.2);
      gain.gain.linearRampToValueAtTime(0.001, now + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // Safe fallback
    }
  }

  playChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.6);
      });
    } catch {
      // Safe fallback
    }
  }

  playSplash() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Safe fallback
    }
  }
}

const sfx = new SoundEffects();

// --- INGREDIENTS CONFIGURATION ---
export const INGREDIENTS: IngredientMeta[] = [
  {
    id: 'red',
    name: 'Watermelon Cube',
    subTitle: 'Geometric Cube',
    role: 'Primary Red',
    colorHex: '#ef4444',
    theoryRole: 'Primary',
    desc: 'Absorbs blue & green light; reflects warm vibrant red wavelengths.'
  },
  {
    id: 'yellow',
    name: 'Pineapple Slice',
    subTitle: 'Sector Wedge',
    role: 'Primary Yellow',
    colorHex: '#eab308',
    theoryRole: 'Primary',
    desc: 'Absorbs blue light; reflects red and green to form brilliant yellow.'
  },
  {
    id: 'blue',
    name: 'Blueberry Sphere',
    subTitle: 'Smooth Sphere',
    role: 'Primary Blue',
    colorHex: '#2563eb',
    theoryRole: 'Primary',
    desc: 'Absorbs red & yellow light; reflects deep indigo-blue wavelengths.'
  },
  {
    id: 'white',
    name: 'White Powder Pinch',
    subTitle: 'Powder Pinch',
    role: 'Lightener / Tint',
    colorHex: '#f8fafc',
    theoryRole: 'Tint',
    desc: 'Scatters all light wavelengths; increases value and creates pastel tints.'
  },
  {
    id: 'black',
    name: 'Charcoal Powder Pinch',
    subTitle: 'Charcoal Pinch',
    role: 'Darkener / Shade',
    colorHex: '#1e293b',
    theoryRole: 'Shade',
    desc: 'Uniformly absorbs light across the spectrum; lowers value to create deep shades.'
  },
];

// --- COLOR THEORY CONSTANTS & RYB SUBTRACTIVE BLENDING ---
// The 8 key anchor colors in artist RYB color mixing space:
const RYB_ANCHORS = {
  white: [250, 248, 245],
  red: [238, 45, 62],         // Pure Watermelon Ruby
  yellow: [252, 215, 20],     // Pure Pineapple Gold
  blue: [26, 92, 218],        // Pure Blueberry Indigo
  orange: [248, 122, 18],     // Red + Yellow = Citrus Orange
  green: [34, 180, 68],       // Yellow + Blue = Vivid Kiwi Green
  purple: [142, 38, 172],     // Red + Blue = Velvet Boysenberry
  brown: [92, 58, 42],        // Red + Yellow + Blue = Earthy Cocoa
  black: [24, 26, 30]         // Charcoal Obsidian
};

// Helper: RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (c: number) => clamp(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Helper: RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

// Curated library of 80+ authentic juice, smoothie, and color theory names
interface NamedColorRef {
  name: string;
  category: string;
  rgb: [number, number, number];
}

const COLOR_LIBRARY: NamedColorRef[] = [
  // Reds & Pinks
  { name: 'Watermelon Sorbet', category: 'Warm Primary', rgb: [238, 45, 62] },
  { name: 'Strawberry Milkshake', category: 'Pastel Tint', rgb: [248, 162, 178] },
  { name: 'Velvet Bordeaux', category: 'Deep Shade', rgb: [108, 20, 32] },
  { name: 'Ruby Pomegranate', category: 'Warm Primary', rgb: [195, 30, 52] },
  { name: 'Dusty Rose', category: 'Muted Tone', rgb: [186, 122, 134] },
  { name: 'Raspberry Blush', category: 'Pastel Tint', rgb: [236, 128, 150] },

  // Oranges & Peaches
  { name: 'Sunset Tangerine', category: 'Secondary Vibrant', rgb: [248, 122, 18] },
  { name: 'Sweet Papaya Nectar', category: 'Secondary Warm', rgb: [250, 145, 60] },
  { name: 'Creamsicle Peach', category: 'Pastel Tint', rgb: [252, 192, 150] },
  { name: 'Burnt Amber Ochre', category: 'Deep Shade', rgb: [168, 76, 16] },
  { name: 'Spiced Apricot', category: 'Warm Secondary', rgb: [230, 110, 42] },
  { name: 'Coral Sunrise', category: 'Warm Secondary', rgb: [244, 100, 75] },

  // Yellows & Golds
  { name: 'Sunlit Pineapple', category: 'Bright Primary', rgb: [252, 215, 20] },
  { name: 'Golden Honey Mango', category: 'Warm Primary', rgb: [248, 192, 24] },
  { name: 'Banana Custard', category: 'Pastel Tint', rgb: [252, 238, 150] },
  { name: 'Dijon Mustard Ochre', category: 'Deep Shade', rgb: [142, 118, 16] },
  { name: 'Lemon Chiffon', category: 'Pastel Tint', rgb: [253, 245, 175] },
  { name: 'Amber Gold', category: 'Warm Tone', rgb: [214, 156, 20] },

  // Greens & Limes
  { name: 'Crisp Kiwi Splash', category: 'Vibrant Secondary', rgb: [34, 180, 68] },
  { name: 'Electric Lime Juice', category: 'Bright Secondary', rgb: [102, 204, 51] },
  { name: 'Matcha Green Tea', category: 'Earthy Green', rgb: [95, 152, 60] },
  { name: 'Fresh Mint Smoothie', category: 'Pastel Tint', rgb: [152, 224, 172] },
  { name: 'Forest Evergreen', category: 'Deep Shade', rgb: [18, 92, 40] },
  { name: 'Celery Cucumber Cooler', category: 'Pastel Tint', rgb: [180, 228, 184] },
  { name: 'Deep Moss Olive', category: 'Deep Shade', rgb: [70, 96, 42] },
  { name: 'Pistachio Gelato', category: 'Pastel Tint', rgb: [168, 216, 172] },

  // Blues & Teals
  { name: 'Wild Indigo Blueberry', category: 'Cool Primary', rgb: [26, 92, 218] },
  { name: 'Tropical Ocean Lagoon', category: 'Cool Secondary', rgb: [20, 155, 190] },
  { name: 'Glacial Sky Blue', category: 'Pastel Tint', rgb: [160, 204, 248] },
  { name: 'Midnight Berry Navy', category: 'Deep Shade', rgb: [14, 38, 102] },
  { name: 'Smoky Denim', category: 'Muted Tone', rgb: [85, 115, 160] },
  { name: 'Seafoam Fizz', category: 'Pastel Tint', rgb: [140, 210, 200] },

  // Purples & Violets
  { name: 'Velvet Boysenberry', category: 'Vibrant Secondary', rgb: [142, 38, 172] },
  { name: 'Blackberry Jam', category: 'Deep Secondary', rgb: [92, 22, 116] },
  { name: 'Muted Lavender Mist', category: 'Pastel Tint', rgb: [188, 158, 214] },
  { name: 'Aubergine Velvet', category: 'Deep Shade', rgb: [56, 18, 72] },
  { name: 'Plum Cordial', category: 'Rich Secondary', rgb: [122, 32, 120] },
  { name: 'Lilac Frost', category: 'Pastel Tint', rgb: [208, 185, 230] },

  // Earth Tones & Neutrals
  { name: 'Warm Cocoa Earth', category: 'Tertiary Earth', rgb: [92, 58, 42] },
  { name: 'Toasted Hazelnut', category: 'Tertiary Earth', rgb: [136, 88, 60] },
  { name: 'Chai Spice Latte', category: 'Toned Earth', rgb: [180, 138, 105] },
  { name: 'Cinnamon Bark', category: 'Deep Earth', rgb: [110, 48, 28] },
  { name: 'Creamy Alabaster', category: 'Pure Tint', rgb: [250, 248, 245] },
  { name: 'Smoky Slate Gray', category: 'Neutral Tone', rgb: [120, 124, 132] },
  { name: 'Activated Charcoal', category: 'Pure Shade', rgb: [24, 26, 30] }
];

// Perceptual distance to find nearest color name
function findClosestColorName(rgb: [number, number, number]): { name: string; category: string } {
  let closest = COLOR_LIBRARY[0];
  let minDistance = Infinity;

  for (const item of COLOR_LIBRARY) {
    // Redmean perceptual formula for RGB color distance
    const rMean = (rgb[0] + item.rgb[0]) / 2;
    const dR = rgb[0] - item.rgb[0];
    const dG = rgb[1] - item.rgb[1];
    const dB = rgb[2] - item.rgb[2];

    const dist = Math.sqrt(
      (2 + rMean / 256) * dR * dR +
      4 * dG * dG +
      (2 + (255 - rMean) / 256) * dB * dB
    );

    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  return { name: closest.name, category: closest.category };
}

// Subtractive mixing calculation (RYB + Tint/Shade)
export function calculateSubtractiveMix(recipe: RecipeState): BlendedResult {
  const { red: rCount, yellow: yCount, blue: bCount, white: wCount, black: kCount } = recipe;
  const colorTotal = rCount + yCount + bCount;
  const grandTotal = colorTotal + wCount + kCount;

  // Empty state
  if (grandTotal === 0) {
    return {
      hex: '#e2e8f0',
      rgb: [226, 232, 240],
      hsl: [210, 24, 91],
      name: 'Clear Spring Water',
      category: 'Empty State',
      designNote: 'The blender pitcher is empty. Add fruit and powders to start exploring subtractive color mixing!',
      rRatio: 0,
      yRatio: 0,
      bRatio: 0,
      tintLevel: 0,
      shadeLevel: 0
    };
  }

  // Handle achromatic recipes (only white and/or black)
  if (colorTotal === 0) {
    let r = 250, g = 248, b = 245;
    let name = 'Creamy Alabaster';
    let note = '';
    let category = 'Achromatic';

    if (wCount > 0 && kCount === 0) {
      r = 250; g = 248; b = 245;
      name = 'Creamy Coconut Milk';
      category = 'Pure Tint';
      note = 'Pure white powder scatters all visible wavelengths equally, maximizing lightness (value) into an opaque white tint.';
    } else if (kCount > 0 && wCount === 0) {
      r = 24; g = 26; b = 30;
      name = 'Activated Charcoal';
      category = 'Pure Shade';
      note = 'Charcoal powder absorbs nearly 100% of incident light across the entire spectrum, yielding an ultra-deep black shade.';
    } else {
      const whiteRatio = wCount / (wCount + kCount);
      r = Math.round(24 + (250 - 24) * whiteRatio);
      g = Math.round(26 + (248 - 26) * whiteRatio);
      b = Math.round(30 + (245 - 30) * whiteRatio);
      name = whiteRatio > 0.6 ? 'Silver Ash Silk' : 'Smoky Mineral Gray';
      category = 'Neutral Gray';
      note = `Mixing white and charcoal powders balances reflection and absorption, forming a neutral gray tone with ${Math.round(whiteRatio * 100)}% lightness value.`;
    }

    const hex = rgbToHex(r, g, b);
    return {
      hex,
      rgb: [r, g, b],
      hsl: rgbToHsl(r, g, b),
      name,
      category,
      designNote: note,
      rRatio: 0,
      yRatio: 0,
      bRatio: 0,
      tintLevel: wCount / grandTotal,
      shadeLevel: kCount / grandTotal
    };
  }

  // Chromatic subtractive mixing via RYB quadratic barycentric interpolation
  const r = rCount / colorTotal;
  const y = yCount / colorTotal;
  const b = bCount / colorTotal;

  // Bernstein quadratic basis for the 3 primaries and secondaries + tertiary center
  const wR = r * r;
  const wY = y * y;
  const wB = b * b;
  const wO = 2 * r * y; // Red + Yellow = Orange
  const wG = 2 * y * b; // Yellow + Blue = Green (Subtractive!)
  const wP = 2 * r * b; // Red + Blue = Purple
  const wBrown = 6 * r * y * b; // Red + Yellow + Blue = Brown

  const totalWeight = wR + wY + wB + wO + wG + wP + wBrown;

  // Base chromatic RGB
  const baseR = (
    wR * RYB_ANCHORS.red[0] +
    wY * RYB_ANCHORS.yellow[0] +
    wB * RYB_ANCHORS.blue[0] +
    wO * RYB_ANCHORS.orange[0] +
    wG * RYB_ANCHORS.green[0] +
    wP * RYB_ANCHORS.purple[0] +
    wBrown * RYB_ANCHORS.brown[0]
  ) / totalWeight;

  const baseG = (
    wR * RYB_ANCHORS.red[1] +
    wY * RYB_ANCHORS.yellow[1] +
    wB * RYB_ANCHORS.blue[1] +
    wO * RYB_ANCHORS.orange[1] +
    wG * RYB_ANCHORS.green[1] +
    wP * RYB_ANCHORS.purple[1] +
    wBrown * RYB_ANCHORS.brown[1]
  ) / totalWeight;

  const baseB = (
    wR * RYB_ANCHORS.red[2] +
    wY * RYB_ANCHORS.yellow[2] +
    wB * RYB_ANCHORS.blue[2] +
    wO * RYB_ANCHORS.orange[2] +
    wG * RYB_ANCHORS.green[2] +
    wP * RYB_ANCHORS.purple[2] +
    wBrown * RYB_ANCHORS.brown[2]
  ) / totalWeight;

  // Apply White (Tint: dilution, scattering, increases value, softens chroma)
  const tintFactor = wCount > 0 ? (wCount / (colorTotal * 0.75 + wCount)) * 0.82 : 0;
  const tintedR = baseR * (1 - tintFactor) + RYB_ANCHORS.white[0] * tintFactor;
  const tintedG = baseG * (1 - tintFactor) + RYB_ANCHORS.white[1] * tintFactor;
  const tintedB = baseB * (1 - tintFactor) + RYB_ANCHORS.white[2] * tintFactor;

  // Apply Black (Shade: broad absorption, lowers value, deepens tone)
  const shadeFactor = kCount > 0 ? (kCount / (colorTotal * 0.8 + kCount)) * 0.84 : 0;
  const finalR = Math.round(tintedR * (1 - shadeFactor) + RYB_ANCHORS.black[0] * shadeFactor);
  const finalG = Math.round(tintedG * (1 - shadeFactor) + RYB_ANCHORS.black[1] * shadeFactor);
  const finalB = Math.round(tintedB * (1 - shadeFactor) + RYB_ANCHORS.black[2] * shadeFactor);

  const hex = rgbToHex(finalR, finalG, finalB);
  const hsl = rgbToHsl(finalR, finalG, finalB);

  // Generate scientific, educational design note based on actual optical physics
  let primaryPhrase = '';
  if (rCount > 0 && yCount > 0 && bCount > 0) {
    primaryPhrase = 'mixing all three primary fruits subtracts light across the entire spectrum, forming an earthy tertiary brown';
  } else if (yCount > 0 && bCount > 0) {
    if (yCount === bCount) {
      primaryPhrase = 'equal parts yellow pineapple wedges and blue blueberries subtract blue and red wavelengths, isolating pure vibrant green';
    } else if (yCount > bCount) {
      primaryPhrase = 'dominant pineapple wedges with blueberry spheres produced a sunny, warm chartreuse lime';
    } else {
      primaryPhrase = 'dominant blueberry spheres paired with pineapple wedges created a deep tropical teal';
    }
  } else if (rCount > 0 && yCount > 0) {
    if (rCount === yCount) {
      primaryPhrase = 'equal parts red watermelon cubes and yellow pineapple wedges absorb blue light to create juicy orange';
    } else if (rCount > yCount) {
      primaryPhrase = 'red watermelon cubes heavily tilted the citrus mix into a warm vermilion coral';
    } else {
      primaryPhrase = 'yellow pineapple wedges boosted green reflection to yield a golden tangerine';
    }
  } else if (rCount > 0 && bCount > 0) {
    if (rCount === bCount) {
      primaryPhrase = 'red cubes and blue spheres absorb middle-band green wavelengths, reflecting a rich berry purple';
    } else if (rCount > bCount) {
      primaryPhrase = 'extra watermelon cubes shifted the purple into a warm crimson magenta';
    } else {
      primaryPhrase = 'extra blueberries intensified the cool indigo tones into deep blackberry violet';
    }
  } else if (rCount > 0) {
    primaryPhrase = 'pure watermelon cubes reflect vibrant red light while absorbing green and blue wavelengths';
  } else if (yCount > 0) {
    primaryPhrase = 'pure pineapple wedges absorb blue wavelengths, reflecting red and green light as luminous yellow';
  } else if (bCount > 0) {
    primaryPhrase = 'pure blueberry spheres absorb red and yellow light, reflecting rich indigo-blue wavelengths';
  }

  // Modifiers (tints & shades)
  let modifierPhrase = '';
  if (wCount > 0 && kCount > 0) {
    modifierPhrase = 'Adding both white and charcoal powders desaturated the mixture into a refined, muted tone.';
  } else if (wCount > 0) {
    modifierPhrase = 'Adding white powder scattered light and increased value, creating a smooth pastel tint.';
  } else if (kCount > 0) {
    modifierPhrase = 'Adding charcoal powder increased light absorption and lowered value, producing a rich deep shade.';
  }

  let finalDesignNote = '';
  if (modifierPhrase) {
    finalDesignNote = `${modifierPhrase} Meanwhile, ${primaryPhrase}.`;
  } else {
    // Capitalize first letter of primary phrase
    finalDesignNote = primaryPhrase.charAt(0).toUpperCase() + primaryPhrase.slice(1) + '.';
  }

  const { name, category } = findClosestColorName([finalR, finalG, finalB]);

  return {
    hex,
    rgb: [finalR, finalG, finalB],
    hsl,
    name,
    category,
    designNote: finalDesignNote,
    rRatio: r,
    yRatio: y,
    bRatio: b,
    tintLevel: wCount / grandTotal,
    shadeLevel: kCount / grandTotal
  };
}

// Preset classic recipes for exploration
const RECIPE_PRESETS: { name: string; tag: string; recipe: RecipeState }[] = [
  {
    name: 'Emerald Kiwi',
    tag: 'Yellow + Blue = Green',
    recipe: { red: 0, yellow: 2, blue: 2, white: 0, black: 0 }
  },
  {
    name: 'Sunset Tangerine',
    tag: 'Red + Yellow = Orange',
    recipe: { red: 2, yellow: 2, blue: 0, white: 0, black: 0 }
  },
  {
    name: 'Royal Boysenberry',
    tag: 'Red + Blue = Purple',
    recipe: { red: 2, yellow: 0, blue: 2, white: 0, black: 0 }
  },
  {
    name: 'Strawberry Milkshake',
    tag: 'Red + White = Tint (Pink)',
    recipe: { red: 2, yellow: 0, blue: 0, white: 2, black: 0 }
  },
  {
    name: 'Forest Evergreen',
    tag: 'Green + Charcoal = Shade',
    recipe: { red: 0, yellow: 2, blue: 2, white: 0, black: 1 }
  },
  {
    name: 'Muted Lavender',
    tag: 'Purple + White = Tint',
    recipe: { red: 1, yellow: 0, blue: 2, white: 2, black: 0 }
  },
  {
    name: 'Warm Ochre',
    tag: 'Orange + Charcoal = Shade',
    recipe: { red: 1, yellow: 2, blue: 0, white: 0, black: 1 }
  },
  {
    name: 'Cocoa Chai',
    tag: 'All 3 Primaries = Brown',
    recipe: { red: 1, yellow: 1, blue: 1, white: 1, black: 0 }
  }
];

// --- MAIN APP COMPONENT ---
export default function App() {
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
  const [hasBlended, setHasBlended] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'studio' | 'presets'>('studio');

  const blendTimerRef = useRef<number | null>(null);

  // Total count of ingredients inside pitcher
  const totalCount = recipe.red + recipe.yellow + recipe.blue + recipe.white + recipe.black;
  const maxCapacity = 10;

  // Calculate live result (computed on recipe changes or after blend)
  const blendedResult = useMemo(() => calculateSubtractiveMix(recipe), [recipe]);

  // Handle sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sfx.enabled = next;
  };

  // Add an ingredient with coordinate simulation inside glass pitcher
  const addIngredient = useCallback((type: IngredientType) => {
    if (totalCount >= maxCapacity || isBlending) return;

    sfx.playPop();

    // Natural stacking resting spot in bottom portion of blender pitcher
    const currentCount = placedItems.length;
    const stackLayer = Math.min(7, currentCount);
    const baseY = 78 - stackLayer * 5.2;
    const randomY = Math.max(30, baseY + (Math.random() * 8 - 4));
    const randomX = 28 + Math.random() * 44; // between 28% and 72% width
    const randomRotation = -20 + Math.random() * 40; // -20deg to +20deg
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
    setHasBlended(false);
  }, [totalCount, maxCapacity, isBlending, placedItems.length]);

  // Remove single ingredient
  const removeIngredient = useCallback((type: IngredientType) => {
    if (recipe[type] <= 0 || isBlending) return;

    sfx.playPop();
    setRecipe(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    setPlacedItems(prev => {
      const idx = prev.findIndex(item => item.type === type);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });
    setHasBlended(false);
  }, [recipe, isBlending]);

  // Reset entire blender pitcher
  const handleReset = useCallback(() => {
    if (isBlending) return;
    sfx.playSplash();
    setRecipe({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 });
    setPlacedItems([]);
    setHasBlended(false);
    setIsBlending(false);
    if (blendTimerRef.current) {
      window.clearTimeout(blendTimerRef.current);
    }
  }, [isBlending]);

  // Load a preset recipe
  const loadPreset = useCallback((presetRecipe: RecipeState) => {
    if (isBlending) return;
    sfx.playPop();
    setRecipe(presetRecipe);
    
    // Regenerate placed items for visual feedback
    const items: PlacedIngredient[] = [];
    let countIdx = 0;
    (Object.keys(presetRecipe) as IngredientType[]).forEach(type => {
      const count = presetRecipe[type];
      for (let i = 0; i < count; i++) {
        const stackLayer = Math.min(7, countIdx);
        const baseY = 78 - stackLayer * 5.2;
        items.push({
          id: `${type}-${i}-${Math.random()}`,
          type,
          x: 28 + Math.random() * 44,
          y: Math.max(30, baseY + (Math.random() * 8 - 4)),
          rotation: -20 + Math.random() * 40,
          scale: 0.95 + Math.random() * 0.15
        });
        countIdx++;
      }
    });

    setPlacedItems(items);
    setHasBlended(false);
    setActiveTab('studio');
  }, [isBlending]);

  // Trigger 1.5s Blend Animation
  const handleBlend = useCallback(() => {
    if (totalCount === 0 || isBlending) return;

    setIsBlending(true);
    setHasBlended(false);
    setBlendProgress(0);

    sfx.playBlenderWhir(1.5);

    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds exact requirement

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setBlendProgress(progress);

      if (progress >= 1) {
        window.clearInterval(interval);
        setIsBlending(false);
        setHasBlended(true);
        sfx.playChime();
      }
    }, 30);

    blendTimerRef.current = interval;
  }, [totalCount, isBlending]);

  // Drag and Drop Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const ingredientType = e.dataTransfer.getData('text/plain') as IngredientType;
    if (ingredientType && ['red', 'yellow', 'blue', 'white', 'black'].includes(ingredientType)) {
      addIngredient(ingredientType);
    }
  };

  // 1-Click Copy Hex Code
  const copyHex = () => {
    if (!hasBlended) return;
    navigator.clipboard.writeText(blendedResult.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (blendTimerRef.current) window.clearTimeout(blendTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-stone-900">Juice Blender Studio</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Subtractive Lab
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                Tactile RYB physical color mixing & pigment physics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-medium">
              <button
                onClick={() => setActiveTab('studio')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'studio' 
                    ? 'bg-white text-stone-900 shadow-xs font-semibold' 
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Studio
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'presets' 
                    ? 'bg-white text-stone-900 shadow-xs font-semibold' 
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Recipes</span>
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'border-stone-200 text-stone-700 hover:bg-stone-100' 
                  : 'border-stone-200 text-stone-400 bg-stone-100'
              }`}
              title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Preset Drawer when selected */}
        {activeTab === 'presets' && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  Classic Subtractive Color Recipes
                </h2>
                <p className="text-sm text-stone-500">
                  Tap any classic recipe to automatically load its fruit & powder ingredients into the pitcher.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('studio')}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium px-2.5 py-1 bg-stone-100 rounded-md"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {RECIPE_PRESETS.map((p, i) => {
                const previewMix = calculateSubtractiveMix(p.recipe);
                return (
                  <button
                    key={i}
                    onClick={() => loadPreset(p.recipe)}
                    className="p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition-all group flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-7 h-7 rounded-lg shadow-xs border border-black/10 shrink-0"
                        style={{ backgroundColor: previewMix.hex }}
                      />
                      <div className="overflow-hidden">
                        <div className="text-sm font-semibold text-stone-900 truncate group-hover:text-amber-700">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {p.tag}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-50 p-1.5 rounded-md border border-stone-100">
                      <span className="font-mono text-stone-700 font-medium">{previewMix.hex}</span>
                      <span className="text-stone-300">•</span>
                      <span className="truncate">{previewMix.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Studio Primary Workspace: Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* LEFT / CENTER: The Sleek Glass Blender Stage */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs relative overflow-hidden">
            
            {/* Subtle background stage glow based on liquid color */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-700 blur-3xl"
              style={{
                background: hasBlended 
                  ? `radial-gradient(circle at 50% 50%, ${blendedResult.hex} 0%, transparent 70%)` 
                  : 'radial-gradient(circle at 50% 50%, #fed7aa 0%, transparent 60%)'
              }}
            />

            {/* Stage Title & Capacity Meter */}
            <div className="w-full flex items-center justify-between mb-4 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Blending Chamber
                </span>
              </div>
              <div className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200 flex items-center gap-1.5">
                <span>Capacity:</span>
                <span className={`font-semibold ${totalCount >= maxCapacity ? 'text-rose-600' : 'text-stone-800'}`}>
                  {totalCount} / {maxCapacity} items
                </span>
              </div>
            </div>

            {/* THE GLASS BLENDER ASSEMBLY */}
            <div 
              className={`relative flex flex-col items-center select-none ${isBlending ? 'animate-blender-rumble' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Blender Lid Handle / Stopper */}
              <div className="w-12 h-4 bg-stone-700 rounded-t-md border-t border-stone-600 shadow-xs z-20 flex items-center justify-center">
                <div className="w-4 h-1.5 bg-stone-500 rounded-full" />
              </div>

              {/* Blender Lid */}
              <div className="w-48 sm:w-56 h-6 bg-gradient-to-r from-stone-800 via-stone-700 to-stone-800 rounded-t-xl shadow-md z-20 border-b-2 border-stone-900 flex items-center justify-center relative">
                <div className="w-36 h-1 bg-stone-600/60 rounded-full" />
                <div className="absolute -left-1 bottom-1 w-2.5 h-3 bg-stone-800 rounded-l-md" title="Pouring Spout Lip" />
              </div>

              {/* GLASS BLENDER PITCHER */}
              <div 
                id="blender-pitcher"
                className={`relative w-44 sm:w-52 h-72 sm:h-80 transition-all duration-300 rounded-b-xl border-x-4 border-b-4 ${
                  isDragOver 
                    ? 'border-amber-400 bg-amber-50/40 shadow-lg shadow-amber-300/30' 
                    : 'border-stone-300/80 bg-gradient-to-b from-white/30 via-sky-50/10 to-stone-100/30'
                } backdrop-blur-xs overflow-hidden flex flex-col justify-end shadow-inner z-10`}
              >
                {/* Glass Reflection Highlight Gradient on Left */}
                <div className="absolute left-2 top-0 bottom-0 w-2.5 bg-gradient-to-r from-white/70 to-transparent pointer-events-none z-20" />
                <div className="absolute right-3 top-0 bottom-0 w-1 bg-gradient-to-l from-white/40 to-transparent pointer-events-none z-20" />

                {/* Measurement Tick Marks (ml) */}
                <div className="absolute right-2 top-6 bottom-14 flex flex-col justify-between text-[9px] font-mono text-stone-400 pointer-events-none select-none z-20">
                  <div className="flex items-center gap-1">
                    <span>800ml</span>
                    <div className="w-3 h-0.5 bg-stone-400/60" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>600ml</span>
                    <div className="w-2 h-0.5 bg-stone-400/50" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>400ml</span>
                    <div className="w-3 h-0.5 bg-stone-400/60" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>200ml</span>
                    <div className="w-2 h-0.5 bg-stone-400/50" />
                  </div>
                </div>

                {/* Glass Handle on the Right Side */}
                <div className="absolute -right-7 sm:-right-8 top-16 w-8 h-36 rounded-r-3xl border-4 border-l-0 border-stone-300/80 pointer-events-none shadow-xs z-0" />

                {/* Drag Over Overlay Cue */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-amber-500/10 border-2 border-dashed border-amber-500 flex flex-col items-center justify-center text-amber-900 font-semibold text-xs z-30 backdrop-blur-xs animate-pulse">
                    <Droplet className="w-6 h-6 text-amber-600 mb-1" />
                    <span>Drop to Add!</span>
                  </div>
                )}

                {/* BLENDED LIQUID (Rises when blended or blending) */}
                <div 
                  className="absolute bottom-0 left-0 right-0 transition-all duration-700 z-10 overflow-hidden"
                  style={{
                    height: hasBlended 
                      ? `${Math.min(88, Math.max(12, totalCount * 8.8))}%` 
                      : isBlending 
                        ? `${Math.min(88, blendProgress * Math.max(12, totalCount * 8.8))}%` 
                        : '0%',
                    backgroundColor: blendedResult.hex,
                    opacity: hasBlended ? 0.95 : isBlending ? blendProgress * 0.9 : 0
                  }}
                >
                  {/* Liquid Surface Wave & Swirl */}
                  <div className="w-full h-3 bg-white/20 animate-liquid-wave border-b border-black/5" />
                  
                  {/* Surface specular reflection */}
                  <div className="absolute top-1 left-4 right-4 h-1.5 bg-white/40 rounded-full blur-[1px]" />

                  {/* Rising effervescent juice bubbles */}
                  {hasBlended && (
                    <>
                      <div className="absolute left-[20%] bottom-3 w-2 h-2 rounded-full bg-white/40 animate-bubble-1" />
                      <div className="absolute left-[45%] bottom-2 w-2.5 h-2.5 rounded-full bg-white/30 animate-bubble-2" />
                      <div className="absolute left-[70%] bottom-4 w-1.5 h-1.5 rounded-full bg-white/50 animate-bubble-3" />
                      <div className="absolute left-[82%] bottom-6 w-2 h-2 rounded-full bg-white/35 animate-bubble-1" />
                    </>
                  )}

                  {/* Centrifugal whirlpool vortex during 1.5s blending */}
                  {isBlending && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-60">
                      <div className="w-28 h-28 rounded-full border-4 border-dashed border-white/70 animate-vortex" />
                    </div>
                  )}
                </div>

                {/* UNBLENDED PHYSICAL INGREDIENTS INSIDE PITCHER (Completely removed after blending) */}
                {!hasBlended && (
                  <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
                    {placedItems.map((item) => (
                      <div
                        key={item.id}
                        className="absolute transition-all duration-500 ease-out"
                        style={{
                          left: `${item.x}%`,
                          top: isBlending ? '75%' : `${item.y}%`,
                          transform: `translate(-50%, -50%) rotate(${
                            isBlending ? item.rotation + blendProgress * 720 : item.rotation
                          }deg) scale(${isBlending ? Math.max(0, (1 - blendProgress) * item.scale) : item.scale})`,
                          opacity: isBlending ? Math.max(0, 1 - blendProgress * 1.3) : 1
                        }}
                      >
                        <IngredientGraphic type={item.type} size="pitcher" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State Prompt if nothing in blender */}
                {totalCount === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none z-10">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2 border border-stone-200">
                      <Droplet className="w-5 h-5 text-stone-400" />
                    </div>
                    <span className="text-xs font-medium text-stone-400">
                      Pitcher is Empty
                    </span>
                    <span className="text-[10px] text-stone-400/80 mt-0.5">
                      Drag or click ingredients below
                    </span>
                  </div>
                )}

                {/* 4-BLADE ROTATING CUTTER AT BASE */}
                <div className="relative w-full h-8 bg-gradient-to-t from-stone-400/40 to-transparent flex items-center justify-center z-15">
                  {/* Central Blade Nut */}
                  <div className="w-3.5 h-3.5 rounded-full bg-stone-700 border border-stone-500 z-20 shadow-xs" />
                  
                  {/* 4 Stainless Steel Blades */}
                  <div 
                    className={`absolute w-16 h-2.5 flex items-center justify-center ${
                      isBlending ? 'animate-spin-ultra' : ''
                    }`}
                  >
                    <div className="w-7 h-1.5 bg-gradient-to-r from-stone-200 to-stone-400 rounded-sm shadow-xs border border-stone-400" />
                    <div className="w-7 h-1.5 bg-gradient-to-l from-stone-200 to-stone-400 rounded-sm shadow-xs border border-stone-400" />
                  </div>
                  <div 
                    className={`absolute w-2.5 h-16 flex flex-col items-center justify-center ${
                      isBlending ? 'animate-spin-ultra' : ''
                    }`}
                  >
                    <div className="w-1.5 h-7 bg-gradient-to-b from-stone-200 to-stone-400 rounded-sm shadow-xs border border-stone-400" />
                    <div className="w-1.5 h-7 bg-gradient-to-t from-stone-200 to-stone-400 rounded-sm shadow-xs border border-stone-400" />
                  </div>
                </div>
              </div>

              {/* HEAVY MOTOR BASE */}
              <div className="w-52 sm:w-60 h-24 bg-gradient-to-b from-stone-300 via-stone-200 to-stone-300 rounded-b-2xl border-t-2 border-stone-400 shadow-md relative flex flex-col items-center justify-between p-3 z-20">
                {/* Metallic collar ring */}
                <div className="w-40 h-2 bg-stone-400/80 rounded-full mb-1" />

                {/* Motor Rotary Dial & Status Indicator */}
                <div className="flex items-center gap-6">
                  {/* Status LED */}
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className={`w-2.5 h-2.5 rounded-full border border-black/20 ${
                        isBlending 
                          ? 'bg-amber-500 shadow-xs shadow-amber-500 animate-ping' 
                          : hasBlended 
                            ? 'bg-emerald-500 shadow-xs shadow-emerald-500' 
                            : totalCount > 0 
                              ? 'bg-amber-400' 
                              : 'bg-stone-400'
                      }`}
                    />
                    <span className="text-[8px] font-mono uppercase text-stone-500 font-semibold">
                      {isBlending ? 'Blend' : hasBlended ? 'Ready' : 'Idle'}
                    </span>
                  </div>

                  {/* Rotary Dial */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-b from-stone-100 to-stone-300 border-2 border-stone-400 shadow-inner flex items-center justify-center relative">
                    <div 
                      className={`w-1 h-3.5 bg-stone-700 rounded-full transition-transform duration-300 ${
                        isBlending ? 'rotate-90' : 'rotate-0'
                      }`} 
                    />
                  </div>

                  {/* Speed Markings */}
                  <div className="text-[8px] font-mono text-stone-500 flex flex-col gap-0.5">
                    <span>PULSE</span>
                    <span>1 • 2</span>
                  </div>
                </div>

                {/* Base Rubber Feet */}
                <div className="w-full flex justify-between px-4 -mb-1">
                  <div className="w-5 h-1.5 bg-stone-700 rounded-b-sm" />
                  <div className="w-5 h-1.5 bg-stone-700 rounded-b-sm" />
                </div>
              </div>
            </div>

            {/* CONTROLS: "Blend!" & "Reset" BUTTONS (Below Blender) */}
            <div className="w-full max-w-sm mt-6 flex items-center gap-3 z-10">
              <button
                onClick={handleBlend}
                disabled={totalCount === 0 || isBlending}
                className={`flex-1 py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${
                  totalCount === 0 || isBlending
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-200'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/25 hover:shadow-md'
                }`}
                id="blend-button"
              >
                <Play className={`w-4 h-4 fill-current ${isBlending ? 'animate-spin' : ''}`} />
                <span>{isBlending ? 'Spinning Blades (1.5s)...' : 'Blend!'}</span>
              </button>

              <button
                onClick={handleReset}
                disabled={isBlending || (totalCount === 0 && !hasBlended)}
                className="py-3.5 px-4 rounded-xl font-semibold text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                id="reset-button"
                title="Reset Pitcher"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* RIGHT: INGREDIENT TRAY & RECIPE / STATUS PANEL */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* INGREDIENT TRAY (Draggable & Click-to-Add) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-500" />
                    Ingredient Tray
                  </h2>
                  <p className="text-xs text-stone-500">
                    Click <span className="font-semibold text-stone-700">+ Add</span> or drag directly into the blender pitcher
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                  5 Materials
                </span>
              </div>

              {/* List of 5 Ingredients */}
              <div className="flex flex-col gap-2.5">
                {INGREDIENTS.map((item) => {
                  const currentQty = recipe[item.id];
                  return (
                    <div
                      key={item.id}
                      draggable={!isBlending && totalCount < maxCapacity}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="p-3 rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-stone-50/70 transition-all flex items-center justify-between gap-3 group cursor-grab active:cursor-grabbing bg-white select-none"
                    >
                      {/* Left: Graphic + Names */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <IngredientGraphic type={item.id} size="md" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-stone-900 leading-tight">
                              {item.name}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-sm border ${
                              item.theoryRole === 'Primary' 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : item.theoryRole === 'Tint'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}>
                              {item.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5 leading-snug line-clamp-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      {/* Right: Counter & Add Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {currentQty > 0 && (
                          <button
                            onClick={() => removeIngredient(item.id)}
                            disabled={isBlending}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-rose-100 hover:text-rose-700 text-stone-600 flex items-center justify-center transition-colors text-xs"
                            title="Remove 1"
                            aria-label={`Remove 1 ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className={`w-6 text-center text-xs font-bold ${currentQty > 0 ? 'text-stone-900' : 'text-stone-300'}`}>
                          {currentQty}
                        </span>

                        <button
                          onClick={() => addIngredient(item.id)}
                          disabled={isBlending || totalCount >= maxCapacity}
                          className="h-8 px-2.5 rounded-lg bg-stone-900 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                          aria-label={`Add ${item.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RECIPE & STATUS PANEL */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Recipe & Pitcher Contents
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  {totalCount} item{totalCount !== 1 ? 's' : ''}
                </span>
              </div>

              {totalCount === 0 ? (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-400">
                  No ingredients added yet. Add red cubes, blue spheres, yellow slices, or powder pinches above!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recipe.red > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                      <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                      <span>{recipe.red} Red Cube{recipe.red > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {recipe.yellow > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                      <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                      <span>{recipe.yellow} Yellow Wedge{recipe.yellow > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {recipe.blue > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      <span>{recipe.blue} Blue Sphere{recipe.blue > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {recipe.white > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium">
                      <div className="w-2.5 h-2.5 rounded-sm bg-white border border-stone-300" />
                      <span>{recipe.white} White Pinch{recipe.white > 1 ? 'es' : ''}</span>
                    </div>
                  )}
                  {recipe.black > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-100 text-xs font-medium">
                      <div className="w-2.5 h-2.5 rounded-sm bg-stone-950 border border-stone-700" />
                      <span>{recipe.black} Charcoal Pinch{recipe.black > 1 ? 'es' : ''}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Subtractive mixing formula indicator */}
              {totalCount > 0 && !hasBlended && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Ready to mix! Click <strong>Blend!</strong> to simulate 1.5s subtractive pigment absorption.
                  </span>
                </div>
              )}
            </div>

            {/* RESULT SCREEN / CARD (Shown once blended) */}
            {hasBlended && (
              <div 
                id="result-screen"
                className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-300 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Visual Swatch & Color Name */}
                <div className="flex items-start gap-4">
                  {/* Big Color Swatch */}
                  <div 
                    className="w-16 h-16 rounded-2xl shadow-md border-2 border-black/10 shrink-0 relative flex items-center justify-center"
                    style={{ backgroundColor: blendedResult.hex }}
                  >
                    <Droplet className="w-7 h-7 text-white/80 drop-shadow-sm" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                        {blendedResult.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-stone-900 mt-1 leading-tight">
                      {blendedResult.name}
                    </h3>
                    
                    {/* Hex Code with 1-click Copy */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={copyHex}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono font-bold transition-all active:scale-95 border border-stone-200"
                        title="Click to copy HEX"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                        <span>{blendedResult.hex.toUpperCase()}</span>
                        {copied && <span className="text-[10px] font-sans text-emerald-600 font-bold ml-1">Copied!</span>}
                      </button>

                      <span className="text-[11px] font-mono text-stone-400">
                        RGB({blendedResult.rgb.join(', ')})
                      </span>
                    </div>
                  </div>
                </div>

                {/* The 1-Sentence Design Note (Educational color theory explanation) */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 mb-1">
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    <span>Color Theory Note</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-serif italic">
                    "{blendedResult.designNote}"
                  </p>
                </div>

                {/* Subtractive Pigment breakdown bar */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-[11px] text-stone-400 font-medium">
                    <span>Pigment Ratio</span>
                    <span>H: {blendedResult.hsl[0]}° S: {blendedResult.hsl[1]}% L: {blendedResult.hsl[2]}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden flex border border-stone-200">
                    {recipe.red > 0 && (
                      <div 
                        style={{ width: `${(recipe.red / totalCount) * 100}%` }} 
                        className="h-full bg-rose-500" 
                        title={`Red: ${recipe.red}`}
                      />
                    )}
                    {recipe.yellow > 0 && (
                      <div 
                        style={{ width: `${(recipe.yellow / totalCount) * 100}%` }} 
                        className="h-full bg-amber-400" 
                        title={`Yellow: ${recipe.yellow}`}
                      />
                    )}
                    {recipe.blue > 0 && (
                      <div 
                        style={{ width: `${(recipe.blue / totalCount) * 100}%` }} 
                        className="h-full bg-blue-500" 
                        title={`Blue: ${recipe.blue}`}
                      />
                    )}
                    {recipe.white > 0 && (
                      <div 
                        style={{ width: `${(recipe.white / totalCount) * 100}%` }} 
                        className="h-full bg-stone-200 border-x border-stone-300" 
                        title={`White (Tint): ${recipe.white}`}
                      />
                    )}
                    {recipe.black > 0 && (
                      <div 
                        style={{ width: `${(recipe.black / totalCount) * 100}%` }} 
                        className="h-full bg-stone-900" 
                        title={`Black (Shade): ${recipe.black}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EDUCATIONAL FOOTER: Subtractive Color Mixing Guide */}
        <section className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            How Subtractive Mixing Works in Juice Blender Studio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col gap-1.5">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Subtractive vs. Additive
              </span>
              <p className="leading-relaxed text-stone-500">
                Unlike computer screens that add light (RGB averaging), physical juices and pigments <strong>absorb</strong> (subtract) specific wavelengths. That's why <strong>Yellow + Blue yields Green</strong>, rather than murky gray!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col gap-1.5">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Tints (White Powder)
              </span>
              <p className="leading-relaxed text-stone-500">
                White powder introduces diffuse light scattering and dilutes pigment concentration. It increases <strong>value (lightness)</strong> and softens saturation into delicate pastels and smoothies.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col gap-1.5">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-800" />
                Shades (Charcoal Powder)
              </span>
              <p className="leading-relaxed text-stone-500">
                Charcoal powder uniformly absorbs light across the spectrum. It decreases <strong>value (darkness)</strong> without changing the underlying hue, creating deep tones like navy, bordeaux, and olive.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- SUB-COMPONENT: TACTILE SVG GRAPHICS FOR INGREDIENTS ---
function IngredientGraphic({ type, size = 'md' }: { type: IngredientType; size?: 'sm' | 'md' | 'lg' | 'pitcher' }) {
  const dim = size === 'sm' ? 28 : size === 'md' ? 36 : size === 'lg' ? 48 : 66;

  switch (type) {
    case 'red': {
      // Geometric Cube (Watermelon block)
      const w = size === 'pitcher' ? 68 : dim;
      const h = size === 'pitcher' ? 68 : dim;
      return (
        <svg width={w} height={h} viewBox="0 0 40 40" fill="none" className="drop-shadow-md">
          {/* Top Face */}
          <polygon points="20,4 34,12 20,20 6,12" fill="#ff536a" />
          {/* Front Left Face */}
          <polygon points="6,12 20,20 20,36 6,28" fill="#e62644" />
          {/* Front Right Face */}
          <polygon points="20,20 34,12 34,28 20,36" fill="#bf1732" />
          {/* Tiny Watermelon Seed Specks */}
          <ellipse cx="14" cy="22" rx="0.8" ry="1.4" fill="#3a0008" />
          <ellipse cx="26" cy="24" rx="0.8" ry="1.4" fill="#3a0008" />
          <ellipse cx="20" cy="11" rx="1.2" ry="0.7" fill="#ffe4e8" opacity="0.6" />
        </svg>
      );
    }

    case 'blue': {
      // Smooth Sphere (Blueberry)
      const w = size === 'pitcher' ? 56 : dim;
      const h = size === 'pitcher' ? 56 : dim;
      return (
        <svg width={w} height={h} viewBox="0 0 40 40" fill="none" className="drop-shadow-md">
          <defs>
            <radialGradient id="berryGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="35%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#172554" />
            </radialGradient>
          </defs>
          <circle cx="20" cy="20" r="16" fill="url(#berryGrad)" />
          {/* Top Calyx crown dimple */}
          <ellipse cx="19" cy="11" rx="4" ry="2" fill="#172554" />
          <path d="M16 11 L19 8 L22 11 L20 13 Z" fill="#1e1b4b" />
          {/* Gloss highlight */}
          <ellipse cx="15" cy="14" rx="3.5" ry="2" fill="#ffffff" opacity="0.45" transform="rotate(-30 15 14)" />
        </svg>
      );
    }

    case 'yellow': {
      // Sector / Wedge Shape (Pineapple Slice)
      const w = size === 'pitcher' ? 72 : dim;
      const h = size === 'pitcher' ? 72 : dim;
      return (
        <svg width={w} height={h} viewBox="0 0 40 40" fill="none" className="drop-shadow-md">
          {/* 60-degree sector wedge */}
          <path
            d="M20 34 L7 12 A18 18 0 0 1 33 12 Z"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner Pineapple core arc */}
          <path d="M12 17 A12 12 0 0 1 28 17" stroke="#eab308" strokeWidth="2.5" fill="none" strokeDasharray="2 2" />
          {/* Radial juice grain lines */}
          <line x1="20" y1="34" x2="20" y2="10" stroke="#ca8a04" strokeWidth="1" opacity="0.6" />
          <line x1="20" y1="34" x2="14" y2="13" stroke="#ca8a04" strokeWidth="1" opacity="0.6" />
          <line x1="20" y1="34" x2="26" y2="13" stroke="#ca8a04" strokeWidth="1" opacity="0.6" />
          {/* Outer rind */}
          <path d="M7 12 A18 18 0 0 1 33 12" stroke="#854d0e" strokeWidth="2.5" fill="none" />
        </svg>
      );
    }

    case 'white': {
      // Fine White Powder Pinch
      const w = size === 'pitcher' ? 68 : dim;
      const h = size === 'pitcher' ? 44 : dim;
      return (
        <svg width={w} height={h} viewBox="0 0 40 40" fill="none" className="drop-shadow-md">
          {/* Delicate powder hill with sparkles */}
          <ellipse cx="20" cy="26" rx="14" ry="7" fill="#e2e8f0" />
          <ellipse cx="20" cy="24" rx="12" ry="5.5" fill="#f8fafc" />
          {/* Individual granule specks */}
          <circle cx="15" cy="18" r="1.5" fill="#ffffff" />
          <circle cx="20" cy="15" r="1.8" fill="#ffffff" />
          <circle cx="25" cy="19" r="1.5" fill="#ffffff" />
          <circle cx="18" cy="22" r="1.2" fill="#ffffff" />
          <circle cx="23" cy="22" r="1.2" fill="#ffffff" />
          {/* Sparkle star */}
          <path d="M20 8 L21.5 12 L25.5 13.5 L21.5 15 L20 19 L18.5 15 L14.5 13.5 L18.5 12 Z" fill="#93c5fd" opacity="0.8" />
        </svg>
      );
    }

    case 'black': {
      // Fine Charcoal Powder Pinch
      const w = size === 'pitcher' ? 68 : dim;
      const h = size === 'pitcher' ? 44 : dim;
      return (
        <svg width={w} height={h} viewBox="0 0 40 40" fill="none" className="drop-shadow-md">
          {/* Crystalline dark charcoal cluster */}
          <ellipse cx="20" cy="26" rx="14" ry="6.5" fill="#0f172a" />
          <ellipse cx="20" cy="24" rx="11" ry="5" fill="#1e293b" />
          {/* Charcoal grains */}
          <polygon points="14,19 17,17 18,21 15,22" fill="#334155" />
          <polygon points="21,15 24,14 25,18 22,19" fill="#475569" />
          <polygon points="24,20 27,19 28,23 25,23" fill="#334155" />
          {/* Specular sheen grain */}
          <circle cx="20" cy="22" r="1" fill="#94a3b8" />
        </svg>
      );
    }

    default:
      return null;
  }
}
