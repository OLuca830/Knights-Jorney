import React, { useReducer, useEffect, useRef, useState, useMemo, useCallback, createContext, useContext, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, TextInput, Modal, FlatList,
  Image, Alert, Platform, KeyboardAvoidingView, useWindowDimensions, ActivityIndicator, AppState, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';

/* ====================================================================
   THEME
==================================================================== */
const C = {
  bg: '#14101c', stone: '#3b3846', stoneHi: '#5a566a', border: '#0b0810',
  parch: '#e8d5a3', parchHi: '#f6e8c3', ink: '#3a2614',
  gold: '#f5c542', goldDark: '#b8860b', red: '#c0392b', green: '#4caf50', blue: '#3b6fd1',
  orange: '#f08a24', text: '#f3e9d2', dim: '#9a94a8',
};
const FONT = { family: 'monospace' };
const KEY = 'pixel_knight_habit_quest_v1';
const BONUS = 25; // gold for finishing every quest of the day

/* ====================================================================
   UTILS
==================================================================== */
const pad = (n) => String(n).padStart(2, '0');
const dk = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dk(d); };
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const hr = (h) => `${((h + 11) % 12) + 1}${h % 24 < 12 ? 'AM' : 'PM'}`;
const fmtTime = (sec) => {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const levelInfo = (xp) => {
  let level = 1, need = 150, rem = xp;
  while (rem >= need) { rem -= need; level++; need = 100 + 50 * level; }
  return { level, cur: rem, need };
};
const TITLES = ['Peasant', 'Squire', 'Footman', 'Knight', 'Champion', 'Paladin', 'Warlord', 'Legend'];
const titleOf = (level) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))];

/* ====================================================================
   PIXEL SPRITES (text grids -> native Views)
==================================================================== */
const PAL = {
  K: '#14101a', g: '#f5c542', G: '#b8860b', s: '#cfd8e3', S: '#7b8794', r: '#c0392b', R: '#7a1f16',
  b: '#3b6fd1', B: '#1f3b82', w: '#ffffff', k: '#f1c9a0', n: '#7a4a21', N: '#4a2a12', y: '#ffe27a',
  o: '#f08a24', p: '#e86aa6', P: '#7b4bb7', m: '#d98cff', e: '#4caf50', E: '#2e7d32', c: '#6fd3f2',
  t: '#8d8d99', T: '#5a5a66', h: '#e8c36a', a: '#e8d5a3',
};
const rolePal = (role) =>
  role === 'maiden' ? { ...PAL, r: '#e86aa6', b: '#7b4bb7', B: '#4b2a87' }
  : role === 'adventurer' ? { ...PAL, r: '#4caf50', b: '#8a5a2b', B: '#5a3a1b', s: '#b58a5a', S: '#7a5a38' }
  : PAL;

const KNIGHT = ['....rr......','...ssssS....','..sssssSS...','..sKKwKKS...','..sssssSS...','..sssssSS...','...SSSSS....','.bbssssssbb.','.bbsggggsbb.','.kbsssssSbk.','.kbsgGGgSbk.','..nnnnnnnn..','..ssSSssSS..','..sss..sSS..','..sss..sSS..','.nnnn..nnnn.'];
const KNIGHT_SIT = [...KNIGHT.slice(0, 12), '.ssssssssss.', '.nnnnnnnnnn.'];
const PRINCESS = ['...gyggyg...','...gggggg...','..hhhhhhhh..','..hkkkkkkh..','..hkKkkKkh..','..hkkppkkh..','..hhkkkkhh..','...pppppp...','..ppwppwpp..','.pppppppppp.','.pppgggggppp','.pppppppppp.','pppppppppppp','pppppppppppp','pwppwppwppwp','pppppppppppp'];
const BF_A = ['......o.....','.....oo.o...','....ooyoo...','...ooyyyoo..','...oyyyyyo..','..ooyyyyyoo.','..RoyyyyoRR.','...RRooRR...','..nnnnnnnnn.','nNnNnNnNnNnN'];
const BF_B = ['.....o......','.....oo..o..','....oyoo.o..','...ooyyyoo..','..ooyyyyyo..','..oyyyyyyoo.','..RoyyyyoRR.','...RRooRR...','..nnnnnnnnn.','nNnNnNnNnNnN'];
const COLD = ['....T..t....','...RnnnnR...','..nnnnnnnnn.','nNnNnNnNnNnN'];
const COIN = ['.gggg.','gyyyyg','gyGGyg','gyGGyg','gyyyyg','.gggg.'];

const SWORD = ['...ws...','...sS...','...sS...','...sS...','...sS...','...sS...','...sS...','...sS...','.gggggg.','...nn...','...nn...','..gggg..'];
const BANNER = ['gggggggggg','.rrrrrrrr.','.rrrggrrr.','.rrggggrr.','.rrrggrrr.','.rrrggrrr.','.rrrrrrrr.','..rrrrrr..','...rrrr...','....rr....'];
const FOUNTAIN = ['......cc......','.....cwwc.....','..c...cc...c..','..tttttttttt..','.tcccccccccct.','..tttttttttt..','....tttttt....','.....tttt.....','....tttttt....','..tttttttttt..','.TTTTTTTTTTTT.'];
const ARMOR = ['...ssss...','..ssSSss..','..sKKKKs..','..ssSSss..','...ssss...','.ssssssss.','ssssssssSS','sssggggsSS','.sssggsSS.','..ssssSS..','..ss..SS..','..ss..SS..','..nn..nn..','.nnnnnnnn.'];
const TORCH = ['..yo..','.oyyo.','.oyyo.','..oo..','..SS..','..nn..','..nn..','..nn..','..nn..','.TTTT.'];
const TREE = ['....eeee....','..eeeEeeee..','.eeeeeeEeee.','.eEeeeeeeeE.','eeeeeEeeeeee','.eeeeeeeEee.','..eEeeeeee..','....eeee....','.....nn.....','.....nn.....','.....nN.....','....nnNn....'];
const CHEST = ['..nnnnnnnn..','.nnnnnnnnnn.','nnnnnnnnnnnn','GGGGGGGGGGGG','nnnnnggnnnnn','nnnnnggnnnnn','nnnnnnnnnnnn','NNNNNNNNNNNN'];
const EGG = ['..PPPP..','.PPmPPP.','PPPPPmPP','PmPPPPPP','PPPPmPPP','.PPPPPP.','..PPPP..'];

const ICON_CASTLE = ['t.t..t.t','tttttttt','.tttttt.','.tKttKt.','.ttnntt.','.ttnntt.','.tttttt.'];
const ICON_SCROLL = ['nnnnnnn.','naaaaan.','nannnan.','naaaaan.','nannnan.','naaaaan.','nnnnnnn.'];
const ICON_GLASS = ['gggggggg','.ssssss.','..ssss..','...ss...','...ss...','..yyyy..','.yyyyyy.','gggggggg'];
const ICON_QUILL = ['......ww','.....www','....wwws','...wwws.','..wwws..','.nws....','nn......','n.......'];
const ICON_SHIELD = ['ssssssss','sbbbbbbs','sbbggbbs','sbbggbbs','.sbggbs.','..sbbs..','...ss...'];

const makeCastle = (tier) => {
  const W = 32, H = 20;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const R = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < H && i >= 0 && i < W) g[j][i] = c; };
  const cren = (x, y, w) => { for (let i = 0; i < w; i += 2) R(x + i, y, 1, 1, 't'); };
  const roof = (x, w, y, c) => { for (let k = 0; k < Math.ceil(w / 2); k++) R(x + k, y - k, w - 2 * k, 1, c); };
  const brick = (x, y, w, h) => { for (let j = y + 1; j < y + h; j += 2) for (let i = x + (((j - y) % 4 === 1) ? 0 : 1); i < x + w; i += 3) if (g[j][i] === 't') g[j][i] = 'T'; };
  R(9, 9, 14, 11, 't'); cren(9, 8, 14); brick(9, 9, 14, 11);
  if (tier >= 3) R(9, 9, 14, 1, 'g');
  R(11, 11, 1, 3, 'y'); R(20, 11, 1, 3, 'y');
  if (tier >= 2) [3, 24].forEach((x) => { R(x, 5, 5, 15, 't'); brick(x, 5, 5, 15); R(x + 2, 8, 1, 3, 'y'); R(x + 2, 13, 1, 3, 'y'); if (tier < 3) cren(x, 4, 5); });
  if (tier >= 3) { [3, 24].forEach((x) => roof(x - 1, 7, 4, 'b')); R(13, 4, 6, 5, 't'); R(15, 6, 2, 2, 'y'); roof(12, 8, 3, 'g'); }
  if (tier < 3) { R(15, 3, 1, 5, 'n'); R(16, 3, 4, 2, 'r'); }
  if (tier === 2) { R(5, 0, 1, 4, 'n'); R(6, 0, 3, 2, 'r'); R(26, 0, 1, 4, 'n'); R(27, 0, 3, 2, 'r'); }
  R(14, 14, 4, 6, 'N'); R(15, 13, 2, 1, 'N'); R(17, 17, 1, 1, 'g');
  return g.map((r) => r.join(''));
};

const runs = (row) => {
  const out = []; let i = 0;
  while (i < row.length) { let j = i; while (j < row.length && row[j] === row[i]) j++; out.push([row[i], j - i]); i = j; }
  return out;
};
const Sprite = memo(({ rows, px = 4, pal = PAL, flip, style }) => (
  <View style={[{ width: rows[0].length * px, transform: flip ? [{ scaleX: -1 }] : undefined }, style]}>
    {rows.map((row, y) => (
      <View key={y} style={{ flexDirection: 'row', height: px }}>
        {runs(row).map(([c, n], i) => (
          <View key={i} style={{ width: n * px, height: px, backgroundColor: c === '.' ? 'transparent' : pal[c] || 'transparent' }} />
        ))}
      </View>
    ))}
  </View>
));

/* ====================================================================
   GAME DATA
==================================================================== */
const DECOR = [
  { id: 'torch', name: 'Wall Torch', price: 40, rows: TORCH },
  { id: 'banner', name: 'War Banner', price: 60, rows: BANNER },
  { id: 'sword', name: 'Hero Sword', price: 90, rows: SWORD },
  { id: 'tree', name: 'Ancient Oak', price: 120, rows: TREE },
  { id: 'armor', name: 'Armor Stand', price: 180, rows: ARMOR },
  { id: 'chest', name: 'Treasure Chest', price: 250, rows: CHEST },
  { id: 'fountain', name: 'Moon Fountain', price: 350, rows: FOUNTAIN },
  { id: 'egg', name: 'Dragon Egg', price: 500, rows: EGG },
];
const CASTLES = [
  { tier: 1, name: 'Humble Keep', price: 0 },
  { tier: 2, name: 'Stone Castle', price: 400 },
  { tier: 3, name: 'Royal Citadel', price: 1000 },
];
const GROUPS = [
  { id: 'morning', label: 'MORNING QUEST' },
  { id: 'day', label: 'DAILY QUEST' },
  { id: 'evening', label: 'EVENING QUEST' },
];
const ROLES = [
  { id: 'knight', label: 'KNIGHT', desc: 'Heavy armor, steady heart.' },
  { id: 'maiden', label: 'MAIDEN', desc: 'Swift blade, sharp mind.' },
  { id: 'adventurer', label: 'ADVENTURER', desc: 'Leather and lantern.' },
];
const AGES = ['13-17', '18-24', '25-34', '35-44', '45+'];
const GOALS = [
  { id: 'focus', label: 'DEEP FOCUS / STUDYING' },
  { id: 'workout', label: 'DAILY WORKOUTS' },
  { id: 'screen', label: 'LESS SCREEN TIME' },
  { id: 'mindful', label: 'MINDFUL HABITS' },
];
const DISTRACTIONS = [
  { id: 'social', label: 'SOCIAL MEDIA', apps: ['Instagram', 'X', 'Snapchat', 'Reddit'] },
  { id: 'video', label: 'SHORT VIDEOS', apps: ['TikTok', 'YouTube', 'Reels'] },
  { id: 'games', label: 'VIDEO GAMES', apps: ['Mobile Games', 'Steam'] },
  { id: 'notify', label: 'NOTIFICATIONS', apps: [] },
  { id: 'procrast', label: 'PROCRASTINATION', apps: [] },
  { id: 'latenight', label: 'LATE-NIGHT SCROLLING', apps: [] },
  { id: 'snack', label: 'JUNK SNACKING', apps: [] },
];
const APP_CHOICES = ['Instagram', 'TikTok', 'YouTube', 'X', 'Reddit', 'Snapchat', 'Games', 'Browser'];
const MOODS = [
  { id: 'brave', label: 'BRAVE', bg: '#e9b8a8' },
  { id: 'calm', label: 'CALM', bg: '#b8d8e8' },
  { id: 'tired', label: 'TIRED', bg: '#cfc3dd' },
  { id: 'fired', label: 'FIRED UP', bg: '#f2d38a' },
  { id: 'proud', label: 'PROUD', bg: '#bfe0b0' },
];
const PROMPTS = ['What quest did I conquer today?', 'What drained my energy?', 'One thing I am grateful for...', 'Tomorrow my brave act will be...'];

/* ====================================================================
   AUTOMATIC PLAN GENERATION (from onboarding answers)
==================================================================== */
const generatePlan = (p) => {
  const habits = [];
  const add = (group, title, gold = 10) => habits.push({ id: uid(), group, title, gold });
  const has = (list, id) => list.includes(id);
  add('morning', `Rise at ${hr(p.wake)} and make the bed`, 8);
  if (has(p.goals, 'focus')) {
    add('morning', "Plan today's 3 main quests (5 min)", 8);
    add('day', 'Deep Focus Siege: one 45 min focus session', 15);
    add('day', 'Study or read for 30 minutes', 12);
  }
  if (has(p.goals, 'workout')) {
    add('morning', 'Knight training: 20 min workout', 15);
    add('day', 'Drink 8 goblets of water', 8);
    add('evening', 'Stretch like a squire (10 min)', 8);
  }
  if (has(p.goals, 'screen')) {
    add('morning', 'No phone for 30 min after waking', 12);
    add('day', `Keep screen time under ${p.age === '13-17' ? 4 : 3} hours`, 15);
    add('evening', 'Phone sleeps in the armory (not in bed)', 10);
  }
  if (has(p.goals, 'mindful')) {
    add('morning', 'Meditate for 5 minutes', 10);
    add('day', 'Take a 10 minute mindful walk', 8);
    add('evening', "Write tonight's Knight's Note", 10);
  }
  if (has(p.distractions, 'procrast')) add('day', 'Eat the dragon: hardest task first', 15);
  if (has(p.distractions, 'notify')) add('day', 'Silence notifications during focus', 8);
  if (has(p.distractions, 'snack')) add('day', 'Swap one snack for fruit', 8);
  if (has(p.distractions, 'latenight')) add('evening', `Screens off by ${hr((p.sleep + 23) % 24)}`, 12);
  if (has(p.distractions, 'games')) add('day', 'No games until the quests are done', 10);
  add('evening', `Lights out by ${hr(p.sleep)}`, 10);

  const freeAvg = Math.max(1, awakeHrs(p) - avgBusy(p) - 3);
  let goal = Math.round((freeAvg * 60 * 0.35) / 15) * 15;
  if (has(p.goals, 'focus')) goal += 30;
  goal = Math.max(30, Math.min(goal, p.age === '13-17' ? 120 : 180));

  const blocks = DISTRACTIONS.filter((d) => has(p.distractions, d.id) && d.apps.length > 0).map((d) => ({
    id: uid(), name: `${d.label} LOCK`, apps: d.apps, active: true, from: p.wake, to: p.sleep, untilQuests: true,
  }));
  return { habits, focusGoal: goal, blocks };
};

/* ====================================================================
   STATE
==================================================================== */
const initial = {
  loaded: false, onboarded: false, profile: null, habits: [], completions: {}, perfect: {},
  xp: 0, gold: 0, focusGoal: 60, focusLog: {}, totalFocus: 0, timer: null, lastResult: null,
  notes: [], noteStreak: 0, lastNoteDate: null, owned: [], castle: 1, blocks: [],
  scrollWatch: true, cleanSince: null, bypasses: 0, pending: null,
};
const recalc = (s, habits, completions) => {
  const day = dk(); const d = new Set(completions[day] || []);
  const perfect = { ...s.perfect };
  if (habits.length > 0 && habits.every((h) => d.has(h.id))) perfect[day] = true; else delete perfect[day];
  return perfect;
};
const noteReward = (s) => {
  const first = s.lastNoteDate !== dk();
  const streak = first ? (s.lastNoteDate === daysAgo(1) ? s.noteStreak + 1 : 1) : s.noteStreak;
  return { first, streak, gold: first ? 10 + Math.min(streak, 10) * 2 : 2, xp: first ? 15 + Math.min(streak, 10) * 3 : 3 };
};

function reducer(s, a) {
  switch (a.type) {
    case 'LOAD': return { ...initial, ...a.data, loaded: true, lastResult: null };
    case 'FINISH_ONBOARD':
      return { ...s, onboarded: true, profile: a.profile, habits: a.plan.habits, blocks: a.plan.blocks, focusGoal: a.plan.focusGoal, completions: {}, perfect: {}, cleanSince: s.cleanSince || dk() };
    case 'REDO_ONBOARD': return { ...s, onboarded: false };
    case 'RESET': return { ...initial, loaded: true };
    case 'TOGGLE_HABIT': {
      const day = dk(); const done = new Set(s.completions[day] || []);
      const h = s.habits.find((x) => x.id === a.id); if (!h) return s;
      const allBefore = s.habits.every((x) => done.has(x.id));
      let gold = s.gold, xp = s.xp;
      if (done.has(h.id)) { done.delete(h.id); gold = Math.max(0, gold - h.gold); xp = Math.max(0, xp - 5); }
      else { done.add(h.id); gold += h.gold; xp += 5; }
      const allAfter = s.habits.every((x) => done.has(x.id));
      if (!allBefore && allAfter) gold += BONUS;
      if (allBefore && !allAfter) gold = Math.max(0, gold - BONUS);
      const completions = { ...s.completions, [day]: [...done] };
      return { ...s, gold, xp, completions, perfect: recalc(s, s.habits, completions) };
    }
    case 'ADD_HABIT': { const habits = [...s.habits, a.habit]; return { ...s, habits, perfect: recalc(s, habits, s.completions) }; }
    case 'DELETE_HABIT': { const habits = s.habits.filter((h) => h.id !== a.id); return { ...s, habits, perfect: recalc(s, habits, s.completions) }; }
    case 'SET_GOAL': return { ...s, focusGoal: a.value };
    case 'START_TIMER': return { ...s, lastResult: null, timer: { phase: 'focus', mode: a.mode, startTs: a.now, target: a.target } };
    case 'START_BREAK': return { ...s, lastResult: null, timer: { phase: 'break', mode: 'break', startTs: a.now, target: 300 } };
    case 'END_BREAK': return { ...s, timer: null };
    case 'CLEAR_RESULT': return { ...s, lastResult: null };
    case 'FINISH_TIMER': {
      const t = s.timer; if (!t || t.phase !== 'focus') return { ...s, timer: null };
      let el = (a.now - t.startTs) / 1000; if (t.mode === 'pomodoro') el = Math.min(el, t.target);
      const mins = Math.floor(el / 60); const bonus = a.completed && t.mode === 'pomodoro' ? 5 : 0; const day = dk();
      return {
        ...s, timer: null, xp: s.xp + mins, gold: s.gold + bonus, totalFocus: s.totalFocus + mins,
        focusLog: { ...s.focusLog, [day]: (s.focusLog[day] || 0) + mins },
        lastResult: { mins, gold: bonus, completed: a.completed, pomodoro: a.completed && t.mode === 'pomodoro' },
      };
    }
    case 'SAVE_NOTE': {
      const r = noteReward(s); const day = dk();
      const note = { id: a.id, text: a.text, mood: a.mood, hasPhoto: a.hasPhoto, ts: a.now, day };
      return { ...s, notes: [note, ...s.notes], noteStreak: r.streak, lastNoteDate: day, gold: s.gold + r.gold, xp: s.xp + r.xp };
    }
    case 'DELETE_NOTE': return { ...s, notes: s.notes.filter((n) => n.id !== a.id) };
    case 'BUY': return s.gold < a.price || s.owned.includes(a.id) ? s : { ...s, gold: s.gold - a.price, owned: [...s.owned, a.id] };
    case 'UPGRADE': return s.gold < a.price || a.tier !== s.castle + 1 ? s : { ...s, gold: s.gold - a.price, castle: a.tier };
    case 'ADD_BLOCK': return { ...s, blocks: [...s.blocks, a.block] };
    case 'TOGGLE_BLOCK': return { ...s, blocks: s.blocks.map((b) => (b.id === a.id ? { ...b, active: !b.active } : b)) };
    case 'DELETE_BLOCK': return { ...s, blocks: s.blocks.filter((b) => b.id !== a.id) };
    case 'SET_SCROLLWATCH': return { ...s, scrollWatch: a.value };
    case 'SHIELD_WAIT': return { ...s, pending: { url: a.url, until: a.until } };
    case 'SHIELD_CLEAR': return { ...s, pending: null };
    case 'SHIELD_BYPASS': return { ...s, bypasses: s.bypasses + 1, cleanSince: dk(), pending: null };
    default: return s;
  }
}

const todayDone = (s) => new Set(s.completions[dk()] || []);
const questStreak = (s) => { let n = 0, d = s.perfect[daysAgo(0)] ? 0 : 1; while (s.perfect[daysAgo(d)]) { n++; d++; } return n; };
const noteStreakNow = (s) => (s.lastNoteDate === dk() || s.lastNoteDate === daysAgo(1) ? s.noteStreak : 0);
const bonfireLevel = (s) => {
  const st = noteStreakNow(s); if (!st) return 0;
  if (s.lastNoteDate !== dk()) return 1;
  return st >= 14 ? 4 : st >= 7 ? 3 : st >= 3 ? 2 : 1;
};
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);
const useNow = (ms, active = true) => {
  const [n, setN] = useState(Date.now());
  useEffect(() => { if (!active) return undefined; const id = setInterval(() => setN(Date.now()), ms); return () => clearInterval(id); }, [ms, active]);
  return n;
};

/* ====================================================================
   SCHEDULE, IDEAS AND SHIELD HELPERS
==================================================================== */
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const dayIdx = (d = new Date()) => (d.getDay() + 6) % 7;
const awakeHrs = (p) => (p.sleep - p.wake + 24) % 24;
const isAwake = (p, h) => (p.wake <= p.sleep ? h >= p.wake && h < p.sleep : h >= p.wake || h < p.sleep);
const inRange = (r, h) => (r.from <= r.to ? h >= r.from && h < r.to : h >= r.from || h < r.to);
const freeMap = (p, day) => {
  const busy = (p.busy && p.busy[day]) || [];
  return Array.from({ length: 24 }, (_, h) => isAwake(p, h) && !busy.some((r) => inRange(r, h)));
};
const freeWindows = (free, wake) => {
  const out = []; let cur = null;
  for (let k = 0; k < 24; k++) {
    const h = (wake + k) % 24;
    if (free[h]) { if (!cur) cur = { start: h, len: 0 }; cur.len++; }
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
};
// Places each quest into the free time of the given weekday (0 = Monday).
const planDay = (p, habits, day) => {
  const wins = freeWindows(freeMap(p, day), p.wake);
  const slots = {};
  const freeHrs = wins.reduce((a, w) => a + w.len, 0);
  if (!wins.length) { habits.forEach((h) => { slots[h.id] = null; }); return { slots, freeHrs: 0 }; }
  const longest = wins.reduce((a, b) => (b.len > a.len ? b : a));
  const anchors = { morning: wins[0], day: longest, evening: wins[wins.length - 1] };
  const cnt = {}; habits.forEach((h) => { cnt[h.group] = (cnt[h.group] || 0) + 1; });
  const idx = {};
  habits.forEach((h) => {
    const i = idx[h.group] === undefined ? 0 : idx[h.group] + 1; idx[h.group] = i;
    const g = anchors[h.group] || longest;
    let off = i;
    if (h.group === 'evening') off = g.len - 1 - (cnt.evening - 1 - i);
    if (h.group === 'day') off = Math.floor(g.len / 3) + i;
    off = Math.max(0, Math.min(g.len - 1, off));
    slots[h.id] = (g.start + off) % 24;
  });
  return { slots, freeHrs };
};
const avgBusy = (p) => { let t = 0; for (let d = 0; d < 7; d++) t += awakeHrs(p) - planDay(p, [], d).freeHrs; return t / 7; };
const todayGoal = (s) => {
  if (!s.profile) return s.focusGoal;
  const { freeHrs } = planDay(s.profile, [], dayIdx());
  if (freeHrs <= 0) return 15;
  return Math.max(15, Math.min(s.focusGoal, Math.round((freeHrs * 60 * 0.35) / 15) * 15));
};

const GOAL_IDEAS = {
  focus: ['Do one 15 minute focus siege on the task you are avoiding.', 'Write your 3 most important tasks, then do the smallest one now.', 'Study or read for 10 minutes, then come back.'],
  workout: ['Do 15 push-ups and 20 squats right now.', 'Go for a 10 minute walk or jog outside.', 'Stretch your back and shoulders for 5 minutes.'],
  screen: ['Leave the phone in another room for 20 minutes.', 'Turn on grayscale mode so the screen gets boring.', 'Look out of a window for 2 minutes. Seriously.'],
  mindful: ['Breathe in for 4, hold 4, out for 6, for 3 minutes.', "Write one line in your Knight's Note about how you feel.", 'Name 5 things you see, 4 you hear and 3 you can touch.'],
};
const DIST_IDEAS = {
  social: ['Mute or unfollow the 3 accounts that waste the most of your time.', 'Message one real friend instead of scrolling feeds.'],
  video: ['Pick ONE video you really want to watch, then close the app.', 'Move the short-video app off your home screen for today.'],
  games: ['Finish your quests first, then you earn game time.', 'Set a 20 minute timer before you open any game.'],
  notify: ['Turn off notifications for your 3 noisiest apps.'],
  procrast: ['Do the dragon task for just 5 minutes. Starting is the hard part.'],
  latenight: ['Put the charger across the room so bed is only for sleeping.'],
  snack: ['Drink a glass of water and wait 10 minutes before snacking.'],
};
// Ideas are picked from what the user answered in the onboarding survey.
const ideasFor = (s, n = 3) => {
  const p = s.profile; const hour = new Date().getHours(); const out = [];
  if (!p) return ['Stand up, stretch and drink some water.'];
  if (!isAwake(p, hour)) out.push('It is past your bedtime. Charge the phone across the room and go to sleep.');
  else if (((p.busy && p.busy[dayIdx()]) || []).some((r) => inRange(r, hour))) out.push('You are in a busy block. Take a 2 minute breathing break, then get back to it.');
  const done = todayDone(s);
  const grp = hour < 12 ? 'morning' : hour < 18 ? 'day' : 'evening';
  const pending = s.habits.filter((h) => !done.has(h.id));
  const nextQ = pending.find((h) => h.group === grp) || pending[0];
  if (nextQ) out.push(`Quest waiting: ${nextQ.title} (+${nextQ.gold} gold).`);
  const pool = [];
  (p.goals || []).forEach((g) => pool.push(...(GOAL_IDEAS[g] || [])));
  (p.distractions || []).forEach((d) => pool.push(...(DIST_IDEAS[d] || [])));
  pool.sort(() => Math.random() - 0.5);
  pool.forEach((x) => { if (out.length < n) out.push(x); });
  if (!out.length) out.push('Stand up, stretch and drink some water.');
  return out.slice(0, n);
};

const ADULT_WORDS = ['porn', 'xxx', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'youporn', 'onlyfans', 'fansly', 'hentai', 'nsfw', 'chaturbate', 'stripchat', 'livejasmin', 'brazzers', 'rule34', 'camgirl', 'eporner', 'spankbang', 'erome'];
const isAdultUrl = (url) => { const u = String(url || '').toLowerCase(); return ADULT_WORDS.some((w) => u.includes(w)); };

const ensureNotif = async () => {
  try {
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.DEFAULT });
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
    return !!perm.granted;
  } catch (e) { return false; }
};

/* ====================================================================
   PIXEL UI KIT
==================================================================== */
const T = ({ children, style, size = 10, color = C.text, ...p }) => (
  <Text {...p} style={[{ fontFamily: FONT.family, fontSize: size, color, lineHeight: Math.round(size * 1.65) }, style]}>{children}</Text>
);
const Box = ({ children, style, tone = 'stone', pad: pd = 10 }) => {
  const parch = tone === 'parch';
  return (
    <View style={[{ backgroundColor: C.border, padding: 3 }, style]}>
      <View style={{ backgroundColor: parch ? C.parchHi : C.stoneHi, padding: 2 }}>
        <View style={{ backgroundColor: parch ? C.parch : C.stone, padding: pd }}>{children}</View>
      </View>
    </View>
  );
};
const Btn = ({ label, onPress, kind = 'gold', disabled, style, size = 10 }) => {
  const bg = kind === 'gold' ? C.gold : kind === 'red' ? C.red : kind === 'green' ? C.green : C.stoneHi;
  const sh = kind === 'gold' ? C.goldDark : kind === 'red' ? '#7a1f16' : kind === 'green' ? '#2e7d32' : C.stone;
  const dark = kind === 'gold' || kind === 'green';
  return (
    <TouchableOpacity activeOpacity={0.85} disabled={disabled} onPress={onPress} style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
      <View style={{ backgroundColor: C.border, padding: 3 }}>
        <View style={{ backgroundColor: bg, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 5, borderBottomColor: sh, alignItems: 'center' }}>
          <T size={size} color={dark ? C.border : '#fff'}>{label}</T>
        </View>
      </View>
    </TouchableOpacity>
  );
};
const Chip = ({ label, on, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 3, borderColor: C.border, backgroundColor: on ? C.gold : C.stone, marginRight: 6, marginBottom: 6 }, style]}>
    <T size={8} color={on ? C.border : C.text}>{label}</T>
  </TouchableOpacity>
);
const Bar = ({ pct, color = C.green, segs = 20, h = 14 }) => {
  const on = Math.round(Math.max(0, Math.min(1, pct)) * segs);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.border, padding: 2, height: h + 4 }}>
      {Array.from({ length: segs }, (_, i) => (
        <View key={i} style={{ flex: 1, marginRight: i < segs - 1 ? 1 : 0, backgroundColor: i < on ? color : '#2a2634' }} />
      ))}
    </View>
  );
};
const Title = ({ children, sub }) => (
  <View style={{ marginBottom: 10 }}>
    <T size={14} color={C.gold}>{children}</T>
    {sub ? <T size={8} color={C.dim} style={{ marginTop: 4 }}>{sub}</T> : null}
  </View>
);
const Stepper = ({ label, value, onChange, min = 0, max = 99, step = 1, wrap = false, fmt }) => {
  const dec = () => onChange(wrap ? (value - step + max + 1) % (max + 1) : Math.max(min, value - step));
  const inc = () => onChange(wrap ? (value + step) % (max + 1) : Math.min(max, value + step));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <T size={9} style={{ flex: 1 }}>{label}</T>
      <TouchableOpacity onPress={dec} style={st.sq}><T size={12} color={C.border}>-</T></TouchableOpacity>
      <T size={10} color={C.gold} style={{ minWidth: 70, textAlign: 'center' }}>{fmt ? fmt(value) : value}</T>
      <TouchableOpacity onPress={inc} style={st.sq}><T size={12} color={C.border}>+</T></TouchableOpacity>
    </View>
  );
};
const Bob = ({ children }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: -4, duration: 700, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [v]);
  return <Animated.View style={{ transform: [{ translateY: v }] }}>{children}</Animated.View>;
};
const Guide = ({ text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
    <Bob><Sprite rows={PRINCESS} px={4} /></Bob>
    <Box tone="parch" style={{ flex: 1, marginLeft: 8 }} pad={8}><T size={8} color={C.ink}>{text}</T></Box>
  </View>
);

/* ====================================================================
   BONFIRE + SCENE
==================================================================== */
const BF_PX = [4, 3, 4, 5, 6];
const Bonfire = ({ level }) => {
  const [f, setF] = useState(0);
  useEffect(() => { const id = setInterval(() => setF((x) => 1 - x), 380); return () => clearInterval(id); }, []);
  const px = BF_PX[level];
  let rows = level === 0 ? COLD : f ? BF_B : BF_A;
  if (level === 1) rows = rows.slice(2);
  const glow = 12 * px * 1.8;
  return (
    <View style={{ width: 12 * Math.max(px, 4), alignItems: 'center', justifyContent: 'flex-end' }}>
      {level > 0 && <View style={{ position: 'absolute', bottom: -glow * 0.2, width: glow, height: glow, borderRadius: glow / 2, backgroundColor: C.orange, opacity: 0.08 + level * 0.05 }} />}
      <Sprite rows={rows} px={px} />
    </View>
  );
};
const STARS = Array.from({ length: 24 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 42, big: i % 5 === 0 }));

const Scene = () => {
  const { s } = useApp();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 560) - 32;
  const cpx = Math.floor(inner / 32);
  const GH = 140;
  const castle = useMemo(() => makeCastle(s.castle), [s.castle]);
  const slotW = inner / 8;
  const dpx = Math.max(2, Math.floor(slotW / 14));
  const lvl = bonfireLevel(s);
  const role = s.profile?.role || 'knight';
  const focusing = s.timer?.phase === 'focus';
  return (
    <View style={{ width: inner + 8, alignSelf: 'center', height: 20 * cpx + GH - 8, backgroundColor: '#1b1640', borderWidth: 4, borderColor: C.border, overflow: 'hidden' }}>
      {STARS.map((o, i) => (
        <View key={i} style={{ position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, width: o.big ? 3 : 2, height: o.big ? 3 : 2, backgroundColor: '#f5eec0', opacity: o.big ? 1 : 0.6 }} />
      ))}
      <View style={{ position: 'absolute', right: 16, top: 14, width: 22, height: 22, borderRadius: 11, backgroundColor: '#f5eec0' }} />
      <View style={{ position: 'absolute', bottom: GH - 14, left: (inner - 32 * cpx) / 2 }}>
        <Sprite rows={castle} px={cpx} />
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: GH, backgroundColor: '#2f6b34' }}>
        <View style={{ height: 6, backgroundColor: '#3f8a45' }} />
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: inner / 2 - 2 * cpx, width: 4 * cpx, height: GH - 14, backgroundColor: '#9c8456' }} />
      {Array.from({ length: 8 }, (_, i) => {
        const d = DECOR.find((x) => x.id === s.owned[i]);
        return d ? (
          <View key={i} style={{ position: 'absolute', left: i * slotW, width: slotW, bottom: 70, alignItems: 'center' }}>
            <Sprite rows={d.rows} px={dpx} />
          </View>
        ) : null;
      })}
      <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' }}>
        <Sprite rows={focusing ? KNIGHT_SIT : KNIGHT} px={4} pal={rolePal(role)} />
        <Bonfire level={lvl} />
        <Bob><Sprite rows={PRINCESS} px={4} /></Bob>
      </View>
    </View>
  );
};

/* ====================================================================
   ONBOARDING
==================================================================== */
const Onboarding = () => {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [forging, setForging] = useState(false);
  const [p, setP] = useState({ name: '', role: null, age: null, wake: 7, sleep: 23, busy: {}, goals: [], distractions: [] });
  const [selDay, setSelDay] = useState(0);
  const [bFrom, setBFrom] = useState(9);
  const [bTo, setBTo] = useState(17);
  const insets = useSafeAreaInsets();
  const tog = (k, id) => setP((x) => ({ ...x, [k]: x[k].includes(id) ? x[k].filter((i) => i !== id) : [...x[k], id] }));
  const plan = useMemo(() => (step === 6 ? generatePlan(p) : null), [step]);
  useEffect(() => {
    if (step !== 6) return undefined;
    setForging(true); const id = setTimeout(() => setForging(false), 1600); return () => clearTimeout(id);
  }, [step]);
  const can = [true, !!p.role, !!p.age, true, p.goals.length > 0, p.distractions.length > 0, true][step];
  const finish = () => dispatch({ type: 'FINISH_ONBOARD', plan, profile: { ...p, name: p.name.trim() || 'Hero' } });
  const dayBusy = p.busy[selDay] || [];
  const setDay = (d, list) => setP((x) => ({ ...x, busy: { ...x.busy, [d]: list } }));
  const addBusy = () => { if (bFrom === bTo) return; setDay(selDay, [...dayBusy, { from: bFrom, to: bTo }]); };
  const copyTo = (days) => setP((x) => {
    const src = x.busy[selDay] || []; const busy = { ...x.busy };
    days.forEach((d) => { busy[d] = src.map((r) => ({ ...r })); });
    return { ...x, busy };
  });
  const freeToday = planDay(p, [], selDay).freeHrs;
  const guides = [
    'Hail, traveler! I am the Pixel Princess. Let me forge a quest list made just for you.',
    'First, who walks into my kingdom?',
    'Tell me about your days, so I can plan your quests around them.',
    'When are you busy? Add the times you cannot do quests (work, school, anything). I will plan around them, day by day.',
    'What do you wish to master? Choose all that apply.',
    'Which foes steal your focus? Name them, so we can fight them.',
    forging ? 'One moment, the blacksmith is hammering your quests...' : 'Your quests are forged and placed in your free time! Review them, brave one.',
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ flex: 1, height: 8, marginRight: 3, backgroundColor: i <= step ? C.gold : C.stone, borderWidth: 2, borderColor: C.border }} />
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Guide text={guides[step]} />
        {step === 0 && (
          <Box>
            <T size={14} color={C.gold} style={{ textAlign: 'center', marginBottom: 8 }}>PIXEL KNIGHT QUEST</T>
            <T size={8} color={C.dim} style={{ textAlign: 'center' }}>Turn focus and habits into XP, gold and a castle that grows with you. Free forever. No paywalls.</T>
          </Box>
        )}
        {step === 1 && (
          <View>
            <Box style={{ marginBottom: 10 }}>
              <T size={8} color={C.dim} style={{ marginBottom: 6 }}>HERO NAME</T>
              <TextInput value={p.name} onChangeText={(v) => setP({ ...p, name: v })} maxLength={14} placeholder="Sir Procrastinot" placeholderTextColor="#7a7488"
                style={[st.input, { backgroundColor: C.parchHi, color: C.ink }]} />
            </Box>
            {ROLES.map((r) => (
              <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => setP({ ...p, role: r.id })} style={{ marginBottom: 10 }}>
                <Box tone={p.role === r.id ? 'parch' : 'stone'}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Sprite rows={KNIGHT} px={3} pal={rolePal(r.id)} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <T size={11} color={p.role === r.id ? C.ink : C.gold}>{r.label}</T>
                      <T size={8} color={p.role === r.id ? C.ink : C.dim}>{r.desc}</T>
                    </View>
                  </View>
                </Box>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {step === 2 && (
          <View>
            <Box style={{ marginBottom: 10 }}>
              <T size={9} color={C.gold} style={{ marginBottom: 8 }}>YOUR AGE</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {AGES.map((a) => <Chip key={a} label={a} on={p.age === a} onPress={() => setP({ ...p, age: a })} />)}
              </View>
            </Box>
            <Box>
              <T size={9} color={C.gold} style={{ marginBottom: 8 }}>WAKE AND SLEEP</T>
              <Stepper label="WAKE UP" value={p.wake} onChange={(v) => setP({ ...p, wake: v })} max={23} wrap fmt={hr} />
              <Stepper label="BEDTIME" value={p.sleep} onChange={(v) => setP({ ...p, sleep: v })} max={23} wrap fmt={hr} />
            </Box>
          </View>
        )}
        {step === 3 && (
          <View>
            <Box style={{ marginBottom: 10 }}>
              <T size={8} color={C.dim} style={{ marginBottom: 8 }}>PICK A DAY, THEN ADD WHEN YOU ARE BUSY. A * MEANS THAT DAY HAS BUSY TIME.</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => <Chip key={d} label={d + ((p.busy[i] || []).length ? '*' : '')} on={selDay === i} onPress={() => setSelDay(i)} />)}
              </View>
            </Box>
            <Box tone="parch" style={{ marginBottom: 10 }}>
              <T size={9} color={C.ink} style={{ marginBottom: 6 }}>{DAYS[selDay]} BUSY TIMES</T>
              {dayBusy.length === 0 && <T size={8} color={C.ink}>Nothing yet: free all day.</T>}
              {dayBusy.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <T size={9} color={C.ink} style={{ flex: 1 }}>{hr(r.from)} - {hr(r.to)}</T>
                  <TouchableOpacity onPress={() => setDay(selDay, dayBusy.filter((_, j) => j !== i))} style={[st.sq, { backgroundColor: C.red }]}>
                    <T size={9} color="#fff">X</T>
                  </TouchableOpacity>
                </View>
              ))}
              <T size={8} color={C.ink} style={{ marginTop: 6 }}>FREE FOR QUESTS: {freeToday}H</T>
            </Box>
            <Box>
              <Stepper label="BUSY FROM" value={bFrom} onChange={setBFrom} max={23} wrap fmt={hr} />
              <Stepper label="BUSY UNTIL" value={bTo} onChange={setBTo} max={23} wrap fmt={hr} />
              <Btn label="+ ADD BUSY TIME" onPress={addBusy} disabled={bFrom === bTo} style={{ marginBottom: 8 }} />
              <View style={{ flexDirection: 'row' }}>
                <Btn label="COPY TO MON-FRI" kind="stone" size={7} style={{ flex: 1, marginRight: 6 }} onPress={() => copyTo([0, 1, 2, 3, 4])} />
                <Btn label="COPY TO ALL DAYS" kind="stone" size={7} style={{ flex: 1 }} onPress={() => copyTo([0, 1, 2, 3, 4, 5, 6])} />
              </View>
            </Box>
          </View>
        )}
        {step === 4 && GOALS.map((g) => (
          <TouchableOpacity key={g.id} activeOpacity={0.85} onPress={() => tog('goals', g.id)} style={{ marginBottom: 10 }}>
            <Box tone={p.goals.includes(g.id) ? 'parch' : 'stone'}><T size={10} color={p.goals.includes(g.id) ? C.ink : C.text}>{p.goals.includes(g.id) ? '[X] ' : '[ ] '}{g.label}</T></Box>
          </TouchableOpacity>
        ))}
        {step === 5 && DISTRACTIONS.map((d) => (
          <TouchableOpacity key={d.id} activeOpacity={0.85} onPress={() => tog('distractions', d.id)} style={{ marginBottom: 10 }}>
            <Box tone={p.distractions.includes(d.id) ? 'parch' : 'stone'}><T size={10} color={p.distractions.includes(d.id) ? C.ink : C.text}>{p.distractions.includes(d.id) ? '[X] ' : '[ ] '}{d.label}</T></Box>
          </TouchableOpacity>
        ))}
        {step === 6 && (forging ? (
          <View style={{ alignItems: 'center', padding: 30 }}><ActivityIndicator color={C.gold} size="large" /></View>
        ) : (
          <View>
            <Box style={{ marginBottom: 10 }}>
              <T size={9} color={C.gold}>{plan.habits.length} QUESTS FORGED</T>
              <T size={8} color={C.dim} style={{ marginTop: 6 }}>MAX DAILY FOCUS GOAL: {plan.focusGoal} MIN</T>
              <T size={8} color={C.dim}>FOCUS BLOCKS: {plan.blocks.length}</T>
              <T size={8} color={C.dim} style={{ marginTop: 6 }}>FREE HOURS: {DAYS.map((d, i) => `${d} ${planDay(p, [], i).freeHrs}H`).join('  ')}</T>
            </Box>
            {GROUPS.map((g) => {
              const list = plan.habits.filter((h) => h.group === g.id); if (!list.length) return null;
              return (
                <Box key={g.id} tone="parch" style={{ marginBottom: 10 }}>
                  <T size={9} color={C.ink} style={{ marginBottom: 6 }}>{g.label}</T>
                  {list.map((h) => <T key={h.id} size={8} color={C.ink}>- {h.title}</T>)}
                </Box>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', padding: 12, paddingBottom: insets.bottom + 12 }}>
        {step > 0 && <Btn label="BACK" kind="stone" onPress={() => setStep(step - 1)} style={{ flex: 1, marginRight: 8 }} />}
        {step < 6
          ? <Btn label={step === 0 ? 'BEGIN' : 'NEXT'} disabled={!can} onPress={() => setStep(step + 1)} style={{ flex: 2 }} />
          : <Btn label="ENTER THE KINGDOM" kind="green" disabled={forging} onPress={finish} style={{ flex: 2 }} />}
      </View>
    </View>
  );
};

/* ====================================================================
   CASTLE (HOME)
==================================================================== */
const HUD = () => {
  const { s } = useApp();
  const L = levelInfo(s.xp);
  return (
    <Box style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View>
          <T size={11} color={C.gold}>{s.profile?.name || 'Hero'}</T>
          <T size={8} color={C.dim}>LV {L.level} {titleOf(L.level).toUpperCase()}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Sprite rows={COIN} px={3} />
          <T size={12} color={C.gold} style={{ marginLeft: 6 }}>{s.gold}</T>
        </View>
      </View>
      <Bar pct={L.cur / L.need} color={C.blue} />
      <T size={7} color={C.dim} style={{ marginTop: 4 }}>{L.cur}/{L.need} XP</T>
    </Box>
  );
};

const CastleScreen = ({ go }) => {
  const { s, dispatch } = useApp();
  const title = s.profile ? { knight: 'Sir Knight', maiden: 'brave Maiden', adventurer: 'Adventurer' }[s.profile.role] : 'Hero';
  const done = todayDone(s).size, total = s.habits.length;
  const focusToday = s.focusLog[dk()] || 0;
  const goal = todayGoal(s);
  const hour = new Date().getHours();
  const say =
    total && done === total ? `All quests complete, ${title}! The kingdom sings your name!`
    : s.lastNoteDate !== dk() && hour >= 18 ? `Evening falls, ${title}. Write a Knight's Note to feed the bonfire!`
    : focusToday < goal / 2 ? `Your training mat awaits, ${title}. Today's focus goal is ${goal} minutes.`
    : done < total ? `${total - done} quests remain. Gold waits in the Quests tab!`
    : 'Spend your gold in the Shop to grow the castle!';
  const ns = noteStreakNow(s), qs = questStreak(s);
  const confirm = (msg, fn) => Alert.alert('Are you sure?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: fn }]);
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
      <HUD />
      <Scene />
      <View style={{ height: 12 }} />
      <Guide text={say} />
      <Box style={{ marginBottom: 10 }}>
        <T size={9} color={C.gold} style={{ marginBottom: 8 }}>TODAY'S DEEDS</T>
        <T size={8} style={{ marginBottom: 4 }}>QUESTS {done}/{total}</T>
        <Bar pct={total ? done / total : 0} color={C.green} segs={16} h={10} />
        <T size={8} style={{ marginTop: 10, marginBottom: 4 }}>FOCUS {focusToday}/{goal} MIN</T>
        <Bar pct={focusToday / goal} color={C.blue} segs={16} h={10} />
        <T size={8} style={{ marginTop: 10 }}>BONFIRE STREAK: {ns} DAY{ns === 1 ? '' : 'S'}</T>
        <T size={8}>QUEST STREAK: {qs} DAY{qs === 1 ? '' : 'S'}</T>
        <T size={8}>TOTAL FOCUS: {s.totalFocus} MIN</T>
      </Box>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <Btn label="QUESTS" onPress={() => go('quests')} style={{ flex: 1, marginRight: 6 }} size={8} />
        <Btn label="FOCUS" kind="green" onPress={() => go('focus')} style={{ flex: 1, marginRight: 6 }} size={8} />
        <Btn label="NOTE" kind="stone" onPress={() => go('notes')} style={{ flex: 1 }} size={8} />
      </View>
      <Box>
        <T size={9} color={C.dim} style={{ marginBottom: 8 }}>CASTLE KEEPER</T>
        <Btn label="RE-FORGE QUESTS (REDO SURVEY)" kind="stone" size={8} style={{ marginBottom: 8 }}
          onPress={() => confirm('You will redo the survey and get a fresh quest list. XP, gold and notes stay.', () => dispatch({ type: 'REDO_ONBOARD' }))} />
        <Btn label="RESET ALL PROGRESS" kind="red" size={8}
          onPress={() => confirm('This erases everything on this device.', () => dispatch({ type: 'RESET' }))} />
      </Box>
    </ScrollView>
  );
};

/* ====================================================================
   QUESTS + FOCUS BLOCKS
==================================================================== */
const blockState = (b, allDone, hour) => {
  if (!b.active) return 'OFF';
  if (b.untilQuests && allDone) return 'UNLOCKED';
  const inWin = b.from <= b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to;
  return inWin ? 'LOCKED' : 'IDLE';
};

const QuestsScreen = () => {
  const { s, dispatch, toast } = useApp();
  const done = todayDone(s);
  const total = s.habits.length;
  const allDone = total > 0 && s.habits.every((h) => done.has(h.id));
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState('day');
  const [showBlock, setShowBlock] = useState(false);
  const [bName, setBName] = useState('');
  const [bApps, setBApps] = useState([]);
  const [bFrom, setBFrom] = useState(8);
  const [bTo, setBTo] = useState(22);
  const hour = new Date().getHours();
  const dayPlan = s.profile ? planDay(s.profile, s.habits, dayIdx()) : { slots: {}, freeHrs: 0 };
  const slotKey = (h) => { const v = dayPlan.slots[h.id]; return v == null ? 99 : (v - (s.profile ? s.profile.wake : 0) + 24) % 24; };

  const toggle = (h) => {
    const was = done.has(h.id);
    const d = new Set(done); was ? d.delete(h.id) : d.add(h.id);
    const nowAll = s.habits.every((x) => d.has(x.id));
    dispatch({ type: 'TOGGLE_HABIT', id: h.id });
    if (!was) toast(`+${h.gold + (nowAll && !allDone ? BONUS : 0)} GOLD  +5 XP${nowAll && !allDone ? '  ALL QUESTS DONE!' : ''}`);
  };
  const addQuest = () => {
    if (!title.trim()) return;
    dispatch({ type: 'ADD_HABIT', habit: { id: uid(), title: title.trim(), group, gold: 10 } });
    setTitle('');
  };
  const addBlock = () => {
    if (!bName.trim() || !bApps.length) { Alert.alert('Almost there', 'Name the block and choose at least one app.'); return; }
    dispatch({ type: 'ADD_BLOCK', block: { id: uid(), name: bName.trim().toUpperCase(), apps: bApps, active: true, from: bFrom, to: bTo, untilQuests: true } });
    setBName(''); setBApps([]); setShowBlock(false);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <Title sub={`${DAYS[dayIdx()]}: ${dayPlan.freeHrs}H FREE. Tap to complete, hold to delete.`}>DAILY QUESTS</Title>
      <Box style={{ marginBottom: 12 }}>
        <T size={9} style={{ marginBottom: 6 }}>{done.size}/{total} COMPLETE {allDone ? '- BONUS CLAIMED' : `- FINISH ALL FOR +${BONUS} GOLD`}</T>
        <Bar pct={total ? done.size / total : 0} segs={20} />
      </Box>
      {GROUPS.map((g) => {
        const list = s.habits.filter((h) => h.group === g.id); if (!list.length) return null;
        return (
          <Box key={g.id} tone="parch" style={{ marginBottom: 12 }}>
            <T size={10} color={C.ink} style={{ marginBottom: 8 }}>{g.label}</T>
            {[...list].sort((a, b) => slotKey(a) - slotKey(b)).map((h) => {
              const d = done.has(h.id);
              const slot = dayPlan.slots[h.id];
              return (
                <TouchableOpacity key={h.id} activeOpacity={0.8} onPress={() => toggle(h)}
                  onLongPress={() => Alert.alert('Delete quest?', h.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_HABIT', id: h.id }) }])}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: '#c9b57f', opacity: d ? 0.55 : 1 }}>
                  <View style={[st.check, d && { backgroundColor: C.green }]}>{d && <T size={10} color={C.border}>X</T>}</View>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <T size={8} color={C.ink} style={d && { textDecorationLine: 'line-through' }}>{h.title}</T>
                    <T size={7} color="#7a5a38">{slot == null ? 'NO FREE TIME TODAY' : `AT ${hr(slot)}`}</T>
                  </View>
                  <Sprite rows={COIN} px={2} />
                  <T size={8} color={C.ink} style={{ marginLeft: 4 }}>{h.gold}</T>
                </TouchableOpacity>
              );
            })}
          </Box>
        );
      })}
      <Box style={{ marginBottom: 18 }}>
        <T size={9} color={C.gold} style={{ marginBottom: 8 }}>ADD A QUEST</T>
        <TextInput value={title} onChangeText={setTitle} placeholder="Slay a new habit..." placeholderTextColor="#7a7488" style={[st.input, { backgroundColor: C.parchHi, color: C.ink, marginBottom: 8 }]} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {GROUPS.map((g) => <Chip key={g.id} label={g.label.split(' ')[0]} on={group === g.id} onPress={() => setGroup(g.id)} />)}
        </View>
        <Btn label="ADD QUEST" onPress={addQuest} disabled={!title.trim()} />
      </Box>

      <Title sub="Mocked armory lock: apps stay sealed until quests are done.">FOCUS BLOCKS</Title>
      {s.blocks.length === 0 && <T size={8} color={C.dim} style={{ marginBottom: 10 }}>No blocks yet. Forge one below.</T>}
      {s.blocks.map((b) => {
        const stt = blockState(b, allDone, hour);
        const col = stt === 'LOCKED' ? C.red : stt === 'UNLOCKED' ? C.green : C.dim;
        return (
          <Box key={b.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={9} color={C.gold} style={{ flex: 1 }}>{b.name}</T>
              <T size={9} color={col}>[{stt}]</T>
            </View>
            <T size={7} color={C.dim} style={{ marginVertical: 4 }}>{b.apps.join(', ') || 'All distractions'}  {hr(b.from)}-{hr(b.to)}</T>
            <T size={7} color={C.dim}>{b.untilQuests ? 'Opens when all quests are done' : 'Always sealed in window'}</T>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Btn label={b.active ? 'DISABLE' : 'ENABLE'} kind="stone" size={7} style={{ flex: 1, marginRight: 6 }} onPress={() => dispatch({ type: 'TOGGLE_BLOCK', id: b.id })} />
              <Btn label="DELETE" kind="red" size={7} style={{ flex: 1 }} onPress={() => dispatch({ type: 'DELETE_BLOCK', id: b.id })} />
            </View>
          </Box>
        );
      })}
      {!showBlock ? <Btn label="+ NEW FOCUS BLOCK" kind="stone" onPress={() => setShowBlock(true)} /> : (
        <Box>
          <TextInput value={bName} onChangeText={setBName} placeholder="Block name" placeholderTextColor="#7a7488" style={[st.input, { backgroundColor: C.parchHi, color: C.ink, marginBottom: 8 }]} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {APP_CHOICES.map((a) => <Chip key={a} label={a.toUpperCase()} on={bApps.includes(a)} onPress={() => setBApps((x) => (x.includes(a) ? x.filter((i) => i !== a) : [...x, a]))} />)}
          </View>
          <Stepper label="LOCK FROM" value={bFrom} onChange={setBFrom} max={23} wrap fmt={hr} />
          <Stepper label="LOCK UNTIL" value={bTo} onChange={setBTo} max={23} wrap fmt={hr} />
          <View style={{ flexDirection: 'row' }}>
            <Btn label="CANCEL" kind="stone" onPress={() => setShowBlock(false)} style={{ flex: 1, marginRight: 6 }} />
            <Btn label="SAVE" onPress={addBlock} style={{ flex: 1 }} />
          </View>
        </Box>
      )}
    </ScrollView>
  );
};

/* ====================================================================
   FOCUS TIMER
==================================================================== */
const Mat = () => (
  <View style={{ width: 84, height: 10, backgroundColor: C.red, borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.gold, marginTop: -4 }} />
);

const FocusScreen = () => {
  const { s, dispatch } = useApp();
  const t = s.timer;
  const now = useNow(250, !!t);
  const [mode, setMode] = useState('pomodoro');
  const [len, setLen] = useState(25);
  const lvl = bonfireLevel(s);
  const role = s.profile?.role || 'knight';
  const el = t ? Math.max(0, (now - t.startTs) / 1000) : 0;
  const today = s.focusLog[dk()] || 0;
  const goal = todayGoal(s);
  const banked = t && t.phase === 'focus' ? Math.floor(t.mode === 'pomodoro' ? Math.min(el, t.target) / 60 : el / 60) : 0;
  const start = () => dispatch({ type: 'START_TIMER', now: Date.now(), mode, target: len * 60 });
  const stop = () => {
    if (t.mode === 'pomodoro') {
      Alert.alert('Retreat from training?', `You keep XP for ${banked} full minute${banked === 1 ? '' : 's'}.`, [
        { text: 'Keep fighting', style: 'cancel' },
        { text: 'Retreat', style: 'destructive', onPress: () => dispatch({ type: 'FINISH_TIMER', now: Date.now(), completed: false }) },
      ]);
    } else dispatch({ type: 'FINISH_TIMER', now: Date.now(), completed: false });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
      <Title sub="1 minute of focus = 1 XP">TRAINING MAT</Title>
      <View style={{ height: 180, backgroundColor: '#231a3d', borderWidth: 4, borderColor: C.border, overflow: 'hidden', marginBottom: 12 }}>
        {STARS.slice(0, 14).map((o, i) => <View key={i} style={{ position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, width: 2, height: 2, backgroundColor: '#f5eec0' }} />)}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, backgroundColor: '#2f6b34' }} />
        <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end' }}>
          <View style={{ alignItems: 'center' }}>
            <Bob><Sprite rows={KNIGHT_SIT} px={5} pal={rolePal(role)} /></Bob>
            <Mat />
          </View>
          <Bonfire level={t?.phase === 'focus' && lvl === 0 ? 1 : lvl} />
        </View>
      </View>

      {!t && (
        <View>
          {s.lastResult && (
            <Box tone="parch" style={{ marginBottom: 12 }}>
              <T size={10} color={C.ink}>{s.lastResult.completed ? 'QUEST COMPLETE!' : 'TRAINING ENDED'}</T>
              <T size={8} color={C.ink} style={{ marginTop: 4 }}>+{s.lastResult.mins} XP{s.lastResult.gold ? `  +${s.lastResult.gold} GOLD` : ''}</T>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                {s.lastResult.pomodoro && <Btn label="REST 5 MIN" kind="green" size={8} style={{ flex: 1, marginRight: 6 }} onPress={() => dispatch({ type: 'START_BREAK', now: Date.now() })} />}
                <Btn label="DISMISS" kind="stone" size={8} style={{ flex: 1 }} onPress={() => dispatch({ type: 'CLEAR_RESULT' })} />
              </View>
            </Box>
          )}
          <Box style={{ marginBottom: 12 }}>
            <T size={9} color={C.gold} style={{ marginBottom: 8 }}>MODE</T>
            <View style={{ flexDirection: 'row' }}>
              <Chip label="POMODORO" on={mode === 'pomodoro'} onPress={() => setMode('pomodoro')} />
              <Chip label="COUNT-UP" on={mode === 'countup'} onPress={() => setMode('countup')} />
            </View>
            {mode === 'pomodoro' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {[15, 25, 45, 60, 90].map((m) => <Chip key={m} label={`${m} MIN`} on={len === m} onPress={() => setLen(m)} />)}
              </View>
            )}
          </Box>
          <Box style={{ marginBottom: 12 }}>
            <Stepper label="MAX DAILY GOAL" value={s.focusGoal} onChange={(v) => dispatch({ type: 'SET_GOAL', value: v })} min={15} max={480} step={15} fmt={(v) => `${v}m`} />
            <T size={8} style={{ marginBottom: 4 }}>TODAY {today}/{goal} MIN (FROM YOUR FREE TIME)</T>
            <Bar pct={today / goal} color={C.blue} segs={16} h={10} />
          </Box>
          <Btn label="START TRAINING" kind="green" onPress={start} />
        </View>
      )}

      {t && t.phase === 'focus' && (
        <Box tone="parch">
          <T size={8} color={C.ink} style={{ textAlign: 'center' }}>{t.mode === 'pomodoro' ? 'REMAINING' : 'ELAPSED'}</T>
          <T size={30} color={C.ink} style={{ textAlign: 'center', marginVertical: 8 }}>{fmtTime(t.mode === 'pomodoro' ? t.target - el : el)}</T>
          {t.mode === 'pomodoro' && <Bar pct={el / t.target} color={C.green} segs={24} />}
          <T size={8} color={C.ink} style={{ textAlign: 'center', marginVertical: 10 }}>XP BANKED: {banked}</T>
          <Btn label={t.mode === 'pomodoro' ? 'RETREAT' : 'FINISH TRAINING'} kind={t.mode === 'pomodoro' ? 'red' : 'gold'} onPress={stop} />
        </Box>
      )}

      {t && t.phase === 'break' && (
        <Box tone="parch">
          <T size={9} color={C.ink} style={{ textAlign: 'center' }}>REST BY THE BONFIRE</T>
          <T size={30} color={C.ink} style={{ textAlign: 'center', marginVertical: 10 }}>{fmtTime(t.target - el)}</T>
          <Btn label="SKIP REST" kind="stone" onPress={() => dispatch({ type: 'END_BREAK' })} />
        </Box>
      )}
    </ScrollView>
  );
};

/* ====================================================================
   KNIGHT'S NOTES (TikTok-style feed)
==================================================================== */
const NotePhoto = ({ id, style }) => {
  const [uri, setUri] = useState(null);
  useEffect(() => { AsyncStorage.getItem('pk_photo_' + id).then(setUri).catch(() => {}); }, [id]);
  return uri ? <Image source={{ uri }} style={style} resizeMode="cover" /> : null;
};

const NoteCard = ({ n, h, onDelete }) => {
  const mood = MOODS.find((m) => m.id === n.mood);
  const photo = n.hasPhoto;
  const col = photo ? '#ffffff' : C.ink;
  const d = new Date(n.ts);
  return (
    <View style={{ height: h, backgroundColor: mood ? mood.bg : C.parch, justifyContent: 'flex-end' }}>
      {photo && <NotePhoto id={n.id} style={StyleSheet.absoluteFill} />}
      {photo && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,6,16,0.4)' }]} />}
      <View style={{ padding: 16, paddingRight: 76, paddingBottom: 28 }}>
        <T size={8} color={col} style={{ marginBottom: 6 }}>{d.toDateString().toUpperCase()}  {pad(d.getHours())}:{pad(d.getMinutes())}</T>
        {mood && <T size={8} color={col} style={{ marginBottom: 8 }}>#{mood.label.replace(' ', '')}</T>}
        <T size={11} color={col} style={{ lineHeight: 22 }}>{n.text}</T>
      </View>
      <View style={{ position: 'absolute', right: 10, bottom: 40, alignItems: 'center' }}>
        <Sprite rows={BF_A} px={3} />
        <TouchableOpacity onPress={onDelete} style={[st.sq, { marginTop: 14, backgroundColor: C.stoneHi, width: 40 }]}><T size={7} color="#fff">DEL</T></TouchableOpacity>
      </View>
    </View>
  );
};

const NotesScreen = () => {
  const { s, dispatch, toast } = useApp();
  const [h, setH] = useState(0);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const ns = noteStreakNow(s);

  const pick = async (cam) => {
    try {
      const perm = cam ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to attach a photo.'); return; }
      const opts = { mediaTypes: ['images'], quality: 0.35, base64: true, allowsEditing: true, aspect: [3, 4] };
      const r = cam ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!r.canceled && r.assets && r.assets[0] && r.assets[0].base64) setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
    } catch (e) { Alert.alert('The scribe tripped', String((e && e.message) || e)); }
  };
  const save = async () => {
    if (saving || (!text.trim() && !photo)) return;
    setSaving(true);
    const id = uid(); const r = noteReward(s);
    try { if (photo) await AsyncStorage.setItem('pk_photo_' + id, photo); } catch (e) {}
    dispatch({ type: 'SAVE_NOTE', id, text: text.trim() || '(a silent victory)', mood, hasPhoto: !!photo, now: Date.now() });
    toast(r.first ? `BONFIRE LIT! DAY ${r.streak}  +${r.gold} GOLD  +${r.xp} XP` : `+${r.gold} GOLD  +${r.xp} XP`);
    setText(''); setMood(null); setPhoto(null); setOpen(false); setSaving(false);
  };
  const del = (n) => Alert.alert('Burn this note?', 'It cannot be recovered.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Burn', style: 'destructive', onPress: () => { AsyncStorage.removeItem('pk_photo_' + n.id).catch(() => {}); dispatch({ type: 'DELETE_NOTE', id: n.id }); } },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <View style={{ flex: 1 }}>
          <T size={12} color={C.gold}>KNIGHT'S NOTES</T>
          <T size={7} color={C.dim}>BONFIRE STREAK: {ns} DAY{ns === 1 ? '' : 'S'}{s.lastNoteDate === dk() ? ' (LIT TODAY)' : ''}</T>
        </View>
        <Btn label="+ WRITE" size={9} onPress={() => setOpen(true)} />
      </View>
      <View style={{ flex: 1, backgroundColor: C.border }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
        {s.notes.length === 0 || h === 0 ? (
          <View style={{ padding: 16 }}><Guide text="No notes yet! Write one to light the Pixel Bonfire in the courtyard. Daily notes keep it roaring and earn bonus XP and gold." /></View>
        ) : (
          <FlatList data={s.notes} keyExtractor={(n) => n.id} pagingEnabled snapToInterval={h} decelerationRate="fast" showsVerticalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })}
            renderItem={({ item }) => <NoteCard n={item} h={h} onDelete={() => del(item)} />} />
        )}
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 48 }} keyboardShouldPersistTaps="handled">
            <Title sub="First note of the day lights the bonfire.">NEW KNIGHT'S NOTE</Title>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {PROMPTS.map((p) => <Chip key={p} label={p} on={false} onPress={() => setText((x) => (x ? x : p + ' '))} />)}
            </View>
            <TextInput value={text} onChangeText={setText} multiline maxLength={500} placeholder="Dear diary of the realm..." placeholderTextColor="#7a7488"
              style={[st.input, { backgroundColor: C.parchHi, color: C.ink, height: 160, textAlignVertical: 'top', marginBottom: 10 }]} />
            <T size={8} color={C.dim} style={{ marginBottom: 6 }}>MOOD</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {MOODS.map((m) => <Chip key={m.id} label={m.label} on={mood === m.id} onPress={() => setMood(mood === m.id ? null : m.id)} />)}
            </View>
            {photo && <Image source={{ uri: photo }} style={{ width: '100%', height: 220, marginVertical: 8, borderWidth: 3, borderColor: C.border }} resizeMode="cover" />}
            <View style={{ flexDirection: 'row', marginVertical: 8 }}>
              <Btn label={photo ? 'CHANGE PHOTO' : 'GALLERY'} kind="stone" size={8} style={{ flex: 1, marginRight: 6 }} onPress={() => pick(false)} />
              <Btn label="CAMERA" kind="stone" size={8} style={{ flex: 1 }} onPress={() => pick(true)} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Btn label="CANCEL" kind="stone" style={{ flex: 1, marginRight: 6 }} onPress={() => setOpen(false)} />
              <Btn label="BURN NOTE" kind="green" disabled={!text.trim() && !photo} style={{ flex: 2 }} onPress={save} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

/* ====================================================================
   SHOP / KINGDOM BUILDING
==================================================================== */
const ShopScreen = () => {
  const { s, dispatch, toast } = useApp();
  const [tab, setTab] = useState('decor');
  const buy = (d) => {
    if (s.gold < d.price) { toast('NOT ENOUGH GOLD'); return; }
    if (s.owned.length >= 8) { toast('COURTYARD IS FULL'); return; }
    dispatch({ type: 'BUY', id: d.id, price: d.price }); toast(`${d.name.toUpperCase()} PLACED!`);
  };
  const up = (c) => {
    if (s.gold < c.price) { toast('NOT ENOUGH GOLD'); return; }
    dispatch({ type: 'UPGRADE', tier: c.tier, price: c.price }); toast(`${c.name.toUpperCase()} BUILT!`);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title sub="Spend gold to grow the kingdom.">ROYAL SHOP</Title>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><Sprite rows={COIN} px={3} /><T size={12} color={C.gold} style={{ marginLeft: 6 }}>{s.gold}</T></View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        <Chip label="DECORATIONS" on={tab === 'decor'} onPress={() => setTab('decor')} />
        <Chip label="CASTLE" on={tab === 'castle'} onPress={() => setTab('castle')} />
      </View>
      {tab === 'decor' && DECOR.map((d) => {
        const owned = s.owned.includes(d.id);
        return (
          <Box key={d.id} tone={owned ? 'stone' : 'parch'} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 70, alignItems: 'center', justifyContent: 'center' }}><Sprite rows={d.rows} px={3} /></View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <T size={9} color={owned ? C.gold : C.ink}>{d.name.toUpperCase()}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}><Sprite rows={COIN} px={2} /><T size={8} color={owned ? C.dim : C.ink} style={{ marginLeft: 4 }}>{d.price}</T></View>
              </View>
              {owned ? <T size={8} color={C.green}>PLACED</T> : <Btn label="BUY" size={8} onPress={() => buy(d)} />}
            </View>
          </Box>
        );
      })}
      {tab === 'castle' && CASTLES.map((c) => {
        const has = s.castle >= c.tier, next = s.castle + 1 === c.tier;
        return (
          <Box key={c.tier} tone={has ? 'stone' : 'parch'} style={{ marginBottom: 10 }}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}><Sprite rows={makeCastle(c.tier)} px={5} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <T size={9} color={has ? C.gold : C.ink}>{c.name.toUpperCase()}</T>
                {c.price > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}><Sprite rows={COIN} px={2} /><T size={8} color={has ? C.dim : C.ink} style={{ marginLeft: 4 }}>{c.price}</T></View>}
              </View>
              {has ? <T size={8} color={C.green}>BUILT</T> : next ? <Btn label="BUILD" size={8} onPress={() => up(c)} /> : <T size={7} color={C.dim}>BUILD PREVIOUS</T>}
            </View>
          </Box>
        );
      })}
    </ScrollView>
  );
};

/* ====================================================================
   SHIELD (18+ guard), SHIELD BROWSER, 15 MINUTE NUDGE
==================================================================== */
const WAIT_MS = 10 * 60 * 1000;
const ShieldBrowser = ({ visible, onClose }) => {
  const { s, dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const START = 'https://duckduckgo.com/?kp=1';
  const [uri, setUri] = useState(START);
  const [key, setKey] = useState(0);
  const [input, setInput] = useState('');
  const [tip, setTip] = useState('');
  const allowed = useRef(new Set());
  const pending = s.pending;
  const now = useNow(500, visible && !!pending);
  useEffect(() => { if (pending) setTip(ideasFor(s, 1)[0]); }, [pending && pending.until]);
  const hostOf = (u) => (String(u).split('/')[2] || String(u)).toLowerCase();
  const load = (u) => { setUri(u); setKey((k) => k + 1); };
  const blocked = (u) => isAdultUrl(u) && !allowed.current.has(hostOf(u));
  // 18+ content: start a 10 minute wait first. The wait is saved, so closing the browser does not skip it.
  const ask = (u) => { if (!s.pending) dispatch({ type: 'SHIELD_WAIT', url: u, until: Date.now() + WAIT_MS }); };
  const goBack = () => { dispatch({ type: 'SHIELD_CLEAR' }); load(START); };
  const confirmYes = () => { const u = pending.url; allowed.current.add(hostOf(u)); dispatch({ type: 'SHIELD_BYPASS' }); load(u); };
  const submit = () => {
    const q = input.trim(); if (!q || pending) return;
    const isUrl = /^[^\s]+\.[^\s]{2,}$/.test(q);
    const u = isUrl ? (/^https?:\/\//i.test(q) ? q : 'https://' + q) : 'https://duckduckgo.com/?kp=1&q=' + encodeURIComponent(q);
    if (blocked(u)) ask(u); else load(u);
  };
  const left = pending ? Math.max(0, pending.until - now) : 0;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
          <TextInput value={input} onChangeText={setInput} onSubmitEditing={submit} autoCapitalize="none" autoCorrect={false} returnKeyType="go"
            placeholder="Search or type a site" placeholderTextColor="#7a7488" style={[st.input, { flex: 1, backgroundColor: C.parchHi, color: C.ink, marginRight: 6 }]} />
          <TouchableOpacity onPress={onClose} style={[st.sq, { width: 48 }]}><T size={8} color={C.border}>EXIT</T></TouchableOpacity>
        </View>
        <WebView key={key} source={{ uri }} style={{ flex: 1 }}
          onShouldStartLoadWithRequest={(r) => {
            if (r.isTopFrame === false) return true;
            if (blocked(r.url)) { ask(r.url); return false; }
            return true;
          }} />
        {pending && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, padding: 16, paddingTop: insets.top + 16, justifyContent: 'center' }}>
            {left > 0 ? (
              <View>
                <Guide text="Hold on, brave one. That looks like 18+ content. Breathe. You can decide when the timer ends." />
                <Box style={{ marginBottom: 12 }}>
                  <T size={9} color={C.gold} style={{ textAlign: 'center' }}>WAIT BEFORE YOU DECIDE</T>
                  <T size={30} color={C.text} style={{ textAlign: 'center', marginVertical: 10 }}>{fmtTime(left / 1000)}</T>
                  <Bar pct={1 - left / WAIT_MS} color={C.blue} segs={24} />
                </Box>
                <Box tone="parch" style={{ marginBottom: 12 }}>
                  <T size={8} color={C.ink}>Try this instead: {tip}</T>
                </Box>
                <Btn label="TAKE ME BACK" kind="green" onPress={goBack} style={{ marginBottom: 8 }} />
                <Btn label="LEAVE THE BROWSER" kind="stone" onPress={onClose} />
              </View>
            ) : (
              <View>
                <Guide text="The wait is over. Think it through: is this what you want right now?" />
                <Box tone="parch" style={{ marginBottom: 12 }}>
                  <T size={11} color={C.ink} style={{ textAlign: 'center', marginBottom: 8 }}>ARE YOU SURE?</T>
                  <T size={8} color={C.ink} style={{ textAlign: 'center' }}>If you continue, your clean streak resets.</T>
                </Box>
                <Btn label="TAKE ME BACK" kind="green" onPress={goBack} style={{ marginBottom: 8 }} />
                <Btn label="YES, CONTINUE" kind="red" onPress={confirmYes} />
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const ShieldScreen = () => {
  const { s, dispatch, toast } = useApp();
  const [browser, setBrowser] = useState(false);
  const clean = s.cleanSince ? Math.max(0, Math.round((new Date(dk()) - new Date(s.cleanSince)) / 86400000)) : 0;
  const openNet = async () => {
    try {
      if (Platform.OS === 'android') await Linking.sendIntent('android.settings.WIRELESS_SETTINGS'); else await Linking.openSettings();
    } catch (e) { Linking.openSettings().catch(() => {}); }
  };
  const toggleWatch = async () => {
    if (!s.scrollWatch) { const ok = await ensureNotif(); if (!ok) toast('ALLOW NOTIFICATIONS FOR SCROLL WATCH'); }
    dispatch({ type: 'SET_SCROLLWATCH', value: !s.scrollWatch });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
      <Title sub="Guard your mind from 18+ and endless scrolling.">THE SHIELD</Title>
      <Box style={{ marginBottom: 12 }}>
        <T size={10} color={C.gold}>CLEAN STREAK: {clean} DAY{clean === 1 ? '' : 'S'}</T>
        <T size={8} color={C.dim} style={{ marginTop: 4 }}>TIMES YOU CHOSE TO CONTINUE: {s.bypasses}</T>
        <T size={7} color={C.dim} style={{ marginTop: 4 }}>Choosing "Yes, continue" in the Shield Browser resets the streak. Taking a different path does not.</T>
      </Box>

      <Box tone="parch" style={{ marginBottom: 12 }}>
        <T size={9} color={C.ink} style={{ marginBottom: 6 }}>1. BLOCK 18+ SITES IN EVERY APP</T>
        <T size={8} color={C.ink}>Android can filter adult sites system-wide with a safe DNS. Set it once:</T>
        <T size={8} color={C.ink} style={{ marginTop: 6 }}>Settings / Network and internet / Private DNS / "Private DNS provider hostname", then enter:</T>
        <T size={9} color={C.ink} selectable style={{ marginVertical: 6 }}>adult-filter-dns.cleanbrowsing.org</T>
        <T size={7} color={C.ink} style={{ marginBottom: 8 }}>This one has no "are you sure" button. To lift it, you must go back into that setting yourself. Check the hostname at cleanbrowsing.org if it stops working.</T>
        <Btn label="OPEN NETWORK SETTINGS" onPress={openNet} size={8} />
      </Box>

      <Box style={{ marginBottom: 12 }}>
        <T size={9} color={C.gold} style={{ marginBottom: 6 }}>2. SHIELD BROWSER</T>
        <T size={8}>A browser inside this app. When you open 18+ content it makes you wait 10 minutes. After that it asks "Are you sure?". If you say yes, it lets you through.</T>
        <T size={7} color={C.dim} style={{ marginVertical: 6 }}>Uses strict safe search and a keyword and site list. It is a best effort filter, not perfect.</T>
        <Btn label="OPEN SHIELD BROWSER" kind="green" onPress={() => setBrowser(true)} size={8} />
      </Box>

      <Box tone="parch" style={{ marginBottom: 12 }}>
        <T size={9} color={C.ink} style={{ marginBottom: 6 }}>3. 18+ AND ADDICTIVE APPS</T>
        <T size={8} color={C.ink}>This app cannot see or close other apps. Android has real tools for that:</T>
        <T size={8} color={C.ink} style={{ marginTop: 6 }}>- Play Store / profile icon / Settings / Family / Parental controls / Apps and games: pick a maximum rating. Mature apps are then blocked from installing.</T>
        <T size={8} color={C.ink} style={{ marginTop: 6 }}>- Settings / Digital Wellbeing / Dashboard / tap the hourglass next to an app to set a daily timer. It locks the app when time runs out.</T>
      </Box>

      <Box style={{ marginBottom: 12 }}>
        <T size={9} color={C.gold} style={{ marginBottom: 6 }}>4. SCROLL WATCH (15 MINUTES)</T>
        <T size={8}>After 15 minutes the Princess asks if you are doomscrolling and suggests things to do instead, based on your survey answers.</T>
        <T size={7} color={C.dim} style={{ marginVertical: 6 }}>It counts time inside this app, and when you leave the app it sends a notification 15 minutes later. It cannot see which apps you use.</T>
        <Btn label={s.scrollWatch ? 'SCROLL WATCH: ON' : 'SCROLL WATCH: OFF'} kind={s.scrollWatch ? 'green' : 'stone'} onPress={toggleWatch} size={8} style={{ marginBottom: 8 }} />
        <Btn label="TRY THE NUDGE NOW" kind="stone" size={8} onPress={() => toast(ideasFor(s, 1)[0].slice(0, 70))} />
      </Box>
      <ShieldBrowser visible={browser} onClose={() => setBrowser(false)} />
    </ScrollView>
  );
};

const NudgeModal = ({ visible, onClose, go }) => {
  const { s, dispatch } = useApp();
  const [ideas, setIdeas] = useState([]);
  useEffect(() => { if (visible) setIdeas(ideasFor(s, 3)); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,5,14,0.88)', justifyContent: 'center', padding: 16 }}>
        <Box tone="parch">
          <T size={11} color={C.ink} style={{ textAlign: 'center', marginBottom: 8 }}>15 MINUTES ON YOUR PHONE!</T>
          <Guide text="Brave one, you have been scrolling a while. Try one of these instead:" />
          {ideas.map((x, i) => <T key={i} size={8} color={C.ink} style={{ marginBottom: 8 }}>{i + 1}. {x}</T>)}
          <Btn label="START 15 MIN FOCUS" kind="green" size={8} style={{ marginTop: 6, marginBottom: 8 }}
            onPress={() => { dispatch({ type: 'START_TIMER', now: Date.now(), mode: 'pomodoro', target: 900 }); onClose(); go('focus'); }} />
          <Btn label="DO A QUEST" size={8} style={{ marginBottom: 8 }} onPress={() => { onClose(); go('quests'); }} />
          <View style={{ flexDirection: 'row' }}>
            <Btn label="NEW IDEAS" kind="stone" size={7} style={{ flex: 1, marginRight: 6 }} onPress={() => setIdeas(ideasFor(s, 3))} />
            <Btn label="NOT NOW" kind="stone" size={7} style={{ flex: 1 }} onPress={onClose} />
          </View>
        </Box>
      </View>
    </Modal>
  );
};

/* ====================================================================
   ROOT
==================================================================== */
const TABS = [
  { id: 'castle', label: 'CASTLE', icon: ICON_CASTLE },
  { id: 'quests', label: 'QUESTS', icon: ICON_SCROLL },
  { id: 'focus', label: 'FOCUS', icon: ICON_GLASS },
  { id: 'notes', label: 'NOTES', icon: ICON_QUILL },
  { id: 'shield', label: 'SHIELD', icon: ICON_SHIELD },
  { id: 'shop', label: 'SHOP', icon: COIN },
];

const Splash = () => (
  <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
    <Sprite rows={PRINCESS} px={6} />
    <Text style={{ color: C.gold, marginTop: 20, fontFamily: FONT.family, fontSize: 12 }}>LOADING KINGDOM...</Text>
  </View>
);

function Root() {
  const [s, dispatch] = useReducer(reducer, initial);
  const [tab, setTab] = useState('castle');
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');
  const [nudge, setNudge] = useState(false);
  const sRef = useRef(s);
  sRef.current = s;
  const notifId = useRef(null);
  const fgStart = useRef(Date.now());

  const toast = useCallback((m) => {
    setMsg(m); anim.stopAnimation(); anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [anim]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => dispatch({ type: 'LOAD', data: raw ? JSON.parse(raw) : {} })).catch(() => dispatch({ type: 'LOAD', data: {} }));
  }, []);
  useEffect(() => {
    if (!s.loaded) return;
    const { loaded, lastResult, ...rest } = s;
    AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
  }, [s]);
  useEffect(() => {
    const t = s.timer; if (!t) return undefined;
    const check = () => {
      const el = (Date.now() - t.startTs) / 1000;
      if (t.phase === 'focus' && t.mode === 'pomodoro' && el >= t.target) dispatch({ type: 'FINISH_TIMER', now: Date.now(), completed: true });
      if (t.phase === 'break' && el >= t.target) dispatch({ type: 'END_BREAK' });
    };
    check(); const id = setInterval(check, 1000); return () => clearInterval(id);
  }, [s.timer]);
  useEffect(() => {
    if (s.lastResult) toast(`TRAINING DONE: +${s.lastResult.mins} XP${s.lastResult.gold ? `  +${s.lastResult.gold} GOLD` : ''}`);
  }, [s.lastResult]);

  useEffect(() => {
    try { Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }) }); } catch (e) {}
    let sub = null;
    try { sub = Notifications.addNotificationResponseReceivedListener(() => setNudge(true)); } catch (e) {}
    return () => { try { if (sub) sub.remove(); } catch (e) {} };
  }, []);
  useEffect(() => { if (s.loaded && s.onboarded && s.scrollWatch) ensureNotif(); }, [s.loaded, s.onboarded, s.scrollWatch]);
  useEffect(() => {
    const cancel = async () => {
      if (notifId.current) { try { await Notifications.cancelScheduledNotificationAsync(notifId.current); } catch (e) {} notifId.current = null; }
    };
    const sub = AppState.addEventListener('change', async (state) => {
      const cur = sRef.current;
      if (state === 'active') { await cancel(); fgStart.current = Date.now(); return; }
      if (state === 'background' && cur.scrollWatch && cur.onboarded && !(cur.timer && cur.timer.phase === 'focus')) {
        try {
          const perm = await Notifications.getPermissionsAsync();
          if (!perm.granted) return;
          const trigger = { seconds: 15 * 60 };
          if (Notifications.SchedulableTriggerInputTypes) trigger.type = Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL;
          notifId.current = await Notifications.scheduleNotificationAsync({
            content: { title: '15 minutes on your phone?', body: ideasFor(cur, 1)[0] },
            trigger,
          });
        } catch (e) {}
      }
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const cur = sRef.current;
      if (AppState.currentState !== 'active' || !cur.scrollWatch || !cur.onboarded) return;
      if (cur.timer && cur.timer.phase === 'focus') { fgStart.current = Date.now(); return; }
      if (Date.now() - fgStart.current >= 15 * 60 * 1000) { fgStart.current = Date.now(); setNudge(true); }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const ctx = useMemo(() => ({ s, dispatch, toast }), [s, toast]);
  if (!s.loaded) return <Splash />;

  return (
    <Ctx.Provider value={ctx}>
      {!s.onboarded ? <Onboarding /> : (
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
          <View style={{ flex: 1 }}>
            {tab === 'castle' && <CastleScreen go={setTab} />}
            {tab === 'quests' && <QuestsScreen />}
            {tab === 'focus' && <FocusScreen />}
            {tab === 'notes' && <NotesScreen />}
            {tab === 'shield' && <ShieldScreen />}
            {tab === 'shop' && <ShopScreen />}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: C.stone, borderTopWidth: 4, borderTopColor: C.border, paddingBottom: insets.bottom }}>
            {TABS.map((tb) => (
              <TouchableOpacity key={tb.id} activeOpacity={0.8} onPress={() => setTab(tb.id)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: tab === tb.id ? C.stoneHi : 'transparent' }}>
                <View style={{ opacity: tab === tb.id ? 1 : 0.55, height: 24, justifyContent: 'center' }}><Sprite rows={tb.icon} px={3} /></View>
                <T size={7} color={tab === tb.id ? C.gold : C.dim} style={{ marginTop: 4 }}>{tb.label}</T>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <NudgeModal visible={nudge} onClose={() => setNudge(false)} go={setTab} />
      <Animated.View pointerEvents="none"
        style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
        <Box tone="parch" pad={8}><T size={9} color={C.ink} style={{ textAlign: 'center' }}>{msg}</T></Box>
      </Animated.View>
    </Ctx.Provider>
  );
}

export default function App() {
  const [loaded, error] = useFonts({ PressStart2P_400Regular });
  const ready = loaded || !!error;
  FONT.family = loaded ? 'PressStart2P_400Regular' : Platform.OS === 'ios' ? 'Courier' : 'monospace';
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? <Root /> : <Splash />}
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  sq: { width: 30, height: 30, backgroundColor: C.gold, borderWidth: 3, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderWidth: 3, borderColor: C.border, backgroundColor: C.parchHi, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 3, borderColor: C.border, padding: 10, fontSize: 11, fontFamily: undefined },
});
