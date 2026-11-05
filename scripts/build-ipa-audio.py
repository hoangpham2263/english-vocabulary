# Builds the IPA chart audio offline from the built-in macOS voices.
#
#   python3 scripts/build-ipa-audio.py <work-dir> public/audio/ipa
#
# Each sound is said inside a key word (data/ipa/audio-words.tsv) by Samantha
# (US) and Daniel (UK), then cut out: vowels and diphthongs are said on their
# own; a vowel before a stop is cut at the stop; fricatives and nasals are
# taken at the end of a word, after the vowel's formants fade (and, for
# voiceless ones, its voicing); plosives, affricates, glides and /h/ keep the
# release with a brief vowel. Everything is levelled to the same loudness.
# Needs macOS `say`, ffmpeg and numpy. No network.
import subprocess, sys, os, re, wave, struct, math, json
import numpy as np
T = sys.argv[1]; OUT = sys.argv[2]
WORDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "ipa", "audio-words.tsv")
rows = [l.rstrip("\n").split("\t") for l in open(WORDS) if l.strip()]
for accent in ("us", "uk"): os.makedirs(f"{T}/{accent}", exist_ok=True)
VOICES = {"us": "Samantha", "uk": "Daniel"}

def run(*a): return subprocess.run(a, capture_output=True, text=True, check=True)

def to_wav(src, dst):
    run("ffmpeg", "-loglevel", "error", "-y", "-i", src, "-af",
        "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
        "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", dst)

def frames(path, hop=0.01):
    """Per-10ms (total dB, low-band dB): low band = energy a 1st-order low-pass keeps, a cheap voicing cue."""
    w = wave.open(path); n = w.getnframes(); sr = w.getframerate()
    data = struct.unpack(f"<{n}h", w.readframes(n)); size = int(sr * hop)
    out = []; lp = 0.0
    for i in range(0, n - size, size):
        chunk = data[i:i + size]; tot = low = 0.0
        for x in chunk:
            lp = lp + 0.08 * (x - lp)   # ~200 Hz low-pass at 16 kHz
            tot += x * x; low += lp * lp
        db = lambda e: 10 * math.log10(e / size + 1e-9)
        out.append((db(tot), db(low)))
    return out, hop

def vowel_onset(path):
    """First frame where low-band energy reaches within 8 dB of its peak."""
    f, hop = frames(path); peak = max(l for _, l in f)
    for i, (_, l) in enumerate(f):
        if l > peak - 8: return i * hop
    return 0.0

def vowel_end_before_stop(path):
    """End of the first voiced stretch (the vowel before a final stop)."""
    f, hop = frames(path); peak = max(l for _, l in f); started = False
    for i, (_, l) in enumerate(f):
        if l > peak - 10: started = True
        elif started and l < peak - 22: return i * hop
    return len(f) * hop

def tail_after_vowel(path):
    """Last stretch after the vowel's loud part (the final nasal of 'sing')."""
    f, hop = frames(path); peak = max(t for t, _ in f)
    last_loud = max(i for i, (t, _) in enumerate(f) if t > peak - 6)
    return (last_loud + 1) * hop

def bands(path, hop=0.01):
    """Per-10ms energy in dB for low (100-900 Hz), mid (900-3000 Hz, vowel formants) and high (3-8 kHz, frication)."""
    w = wave.open(path); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float)
    size = int(sr * hop); win = np.hanning(2 * size); freqs = np.fft.rfftfreq(2 * size, 1 / sr)
    out = []
    for i in range(0, len(x) - 2 * size, size):
        spec = np.abs(np.fft.rfft(x[i:i + 2 * size] * win)) ** 2
        e = lambda lo, hi: 10 * np.log10(spec[(freqs >= lo) & (freqs < hi)].sum() + 1e-9)
        out.append((e(100, 900), e(900, 3000), e(3000, 8000)))
    return np.array(out), hop

VOICELESS = {"f", "θ", "s", "ʃ"}

def after_vowel(path, voiceless=False):
    """Start of a final consonant: the first frame after the vowel's formant peak
    where the 0.9-3 kHz band has fallen 15 dB (the vowel is over). For a
    voiceless fricative the 100-900 Hz band must also have fallen 15 dB, so the
    vowel's fading voice is left out; voiced ones keep their voicing."""
    b, hop = bands(path); low, mid = b[:, 0], b[:, 1]; top = int(np.argmax(mid))
    for i in range(top, len(mid)):
        if mid[i] < mid[top] - 15 and (not voiceless or low[i] < low[top] - 15):
            return i * hop
    return len(mid) * hop * 0.6

def dur(p): return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p).stdout)

WHOLE = {"iː","e","ɑː","ɔː","uː","ɜːr","eɪ","aɪ","ɔɪ","aʊ","oʊ","ɪr","er","ʃ"}      # the word is the sound
BEFORE_STOP = {"ɪ","æ","ʌ"}                                                       # it, at, up
AFTER_ONSET_VOWEL = {"ʊ","ʊr","ər"}                                               # put, poor, her: vowel after the onset
SHORT_VOWEL = {"ɪ","e","æ","ʊ","ʌ","ə"}
RELEASED = {"p","b","t","d","k","ɡ","tʃ","dʒ","r","w","j","l","h"}
ASPIRATED = {"p","t","k","tʃ"}
FINAL = {"ŋ","f","v","θ","ð","s","z","ʒ","m","n"}

def span(sym, wav):
    d = dur(wav)
    if sym in WHOLE: a, b = 0.0, d
    elif sym in BEFORE_STOP: a, b = 0.0, vowel_end_before_stop(wav)
    elif sym in AFTER_ONSET_VOWEL: a, b = max(0.0, vowel_onset(wav) - 0.01), d
    elif sym == "ə": a, b = 0.0, d
    elif sym in RELEASED: a, b = 0.0, min(d, 0.18 if sym in ASPIRATED else 0.14)
    elif sym in FINAL: a, b = after_vowel(wav, sym in VOICELESS), d
    else: a, b = 0.0, max(0.05, vowel_onset(wav) - 0.01)     # initial consonant
    if sym in SHORT_VOWEL: b = min(b, a + 0.24)
    return a, b

def level(src, dst, hold=None):
    """Same average loudness as before (-18 dB mean, peaks limited), short fades;
    held consonants are stretched to `hold` seconds without changing pitch."""
    filters = []
    if hold:
        d = dur(src)
        if d < hold:
            # Stretch at most 2x: further than that the voice turns metallic.
            t = max(0.5, d / hold)
            filters.append(f"atempo={t:.3f}")
    tmp = dst + ".wav"
    run("ffmpeg", "-loglevel", "error", "-y", "-i", src, *(["-af", ",".join(filters)] if filters else []), "-ac", "1", "-ar", "44100", tmp)
    mean = lambda p: float(re.search(r"mean_volume: (-?[0-9.]+)", subprocess.run(["ffmpeg","-hide_banner","-i",p,"-af","volumedetect","-f","null","-"],capture_output=True,text=True).stderr).group(1))
    d = dur(tmp); gain = -18 - mean(tmp)
    for _ in range(4):
        run("ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-af",
            f"volume={gain}dB,alimiter=limit=0.89:level=false,afade=t=in:d=0.01,afade=t=out:st={max(0,d-0.03)}:d=0.03",
            "-ac", "1", "-ar", "44100", "-b:a", "64k", dst)
        miss = -18 - mean(dst)
        if abs(miss) < 0.5: break
        gain += miss
    os.remove(tmp)

HELD = {"f","v","θ","ð","s","z","ʃ","ʒ","m","n","ŋ"}
report = {}
for accent, voice in VOICES.items():
    os.makedirs(f"{OUT}/{accent}", exist_ok=True)
    for i, (sym, word) in enumerate(rows):
        n = f"{i+1:02d}"
        raw = f"{T}/{accent}/{i:02d}.aiff"
        run("say", "-v", voice, "-o", raw, word)
        wav = f"{T}/{accent}/{i:02d}.wav"; to_wav(raw, wav)
        a, b = span(sym, wav)
        cut = f"{T}/{accent}/{i:02d}-cut.wav"
        run("ffmpeg", "-loglevel", "error", "-y", "-ss", f"{a}", "-t", f"{max(0.04, b-a)}", "-i", wav, cut)
        level(cut, f"{OUT}/{accent}/{n}.mp3", hold=0.4 if sym in HELD else None)
        report.setdefault(sym, {})[accent] = {"file": f"{accent}/{n}.mp3", "word": word, "span": [round(a,2), round(b,2)]}
for sym, r in report.items():
    print(f"/{sym}/ {r['us']['word']:6} us {r['us']['span']}  uk {r['uk']['span']}")
