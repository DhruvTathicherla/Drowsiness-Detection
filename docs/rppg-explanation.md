# How rPPG (Remote Photoplethysmography) Calculates Heart Rate from Webcam

## Overview

Remote Photoplethysmography (rPPG) is a technique that detects subtle color changes in your skin caused by blood flow. When your heart beats, it pumps blood through your arteries, causing tiny changes in the color and brightness of your skin. These changes are too small to see with the naked eye, but a webcam can detect them!

## The Complete Process (Step-by-Step)

### Step 1: Video Capture
**Location:** `rppg-panel.tsx` - `processFrame()` function

```javascript
// Get video stream from webcam (30 frames per second)
video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
```

**What happens:**
- The webcam captures video at 30 frames per second (FPS)
- Each frame is a snapshot of your face
- The video is drawn to a hidden canvas for processing

---

### Step 2: Region of Interest (ROI) Selection
**Location:** `rppg-processor.ts` - `initializeROI()` or `initializeSimpleROI()`

**Why ROI?**
- We don't need the entire face - just a stable region with good blood flow
- Forehead and cheeks are ideal because they have good blood supply and minimal movement

**How it works:**
1. **Option A (with face detection):** Uses MediaPipe to detect your face, then selects the upper 40% (forehead/cheeks region)
2. **Option B (fallback):** Uses center-upper 30% of the video frame

```javascript
// Example: ROI on forehead region
roiWidth = faceWidth * 0.6;      // 60% of face width
roiHeight = faceHeight * 0.4;    // Upper 40% of face
roiX = center of face horizontally
roiY = 10% down from top of face (forehead area)
```

**Visual representation:**
```
┌─────────────────────────┐
│                         │
│    ┌─────────────┐      │  ← ROI (forehead/cheeks)
│    │             │      │
│    │   ROI Area  │      │
│    │             │      │
│    └─────────────┘      │
│         Face            │
│                         │
└─────────────────────────┘
```

---

### Step 3: Green Channel Extraction
**Location:** `rppg-processor.ts` - `extractGreenChannelIntensity()`

**Why the green channel?**
- The green channel is most sensitive to blood volume changes
- Hemoglobin (in blood) absorbs green light differently as blood volume changes
- Green channel shows the strongest rPPG signal compared to red/blue

**How it works:**
```javascript
// For each pixel in the ROI:
for (each pixel in ROI) {
    greenValue = pixel[green_channel_index];  // Get green value (0-255)
    greenSum += greenValue;
}
averageGreen = greenSum / totalPixels;
```

**Example:**
- Frame 1: Average green = 125.34
- Frame 2: Average green = 125.67  (slightly brighter - more blood)
- Frame 3: Average green = 125.12  (slightly darker - less blood)
- Frame 4: Average green = 125.89  (brighter again - next heartbeat)

**The key insight:** These tiny changes (0.1-0.5 units) happen at the same frequency as your heart rate!

---

### Step 4: Signal Collection (Time Series)
**Location:** `rppg-processor.ts` - `addSample()`

**What happens:**
- Every frame (30 times per second), we store the average green intensity
- This creates a time series: `[125.34, 125.67, 125.12, 125.89, ...]`
- We collect at least 15 seconds of data (450 samples at 30 FPS)

**Why 15 seconds?**
- Need enough data for accurate frequency analysis
- Longer window = better frequency resolution
- Frequency resolution = SampleRate / FFT_Size
- With 450 samples: resolution ≈ 0.067 Hz (4 BPM accuracy)

**Visual representation of the signal:**
```
Green Intensity
     │
130  │     ●
     │    ╱ ╲    ╱ ╲    ╱
125  │   ╱   ╲  ╱   ╲  ╱
     │  ╱     ╲╱     ╲╱
120  │ ●               ●
     └─────────────────────→ Time
     0s    5s    10s   15s
     
Each peak = one heartbeat
```

---

### Step 5: Signal Preprocessing
**Location:** `rppg-processor.ts` - `detrend()`

**Problem:** The signal has slow baseline drift (lighting changes, movement)

**Solution:** Remove the trend (linear detrending)
```javascript
// Fit a line through the data, then subtract it
trend = slope * time + intercept
detrendedSignal = originalSignal - trend
```

**Before detrending:**
```
Intensity
  │
  │    ╱╲  ╱╲  ╱╲
  │   ╱  ╲╱  ╲╱  ╲
  │  ╱         ╱
  │ ╱         ╱
  └──────────────→ Time
   (baseline drifting upward)
```

**After detrending:**
```
Intensity
  │
  │  ╱╲  ╱╲  ╱╲  ╱╲
  │ ╱  ╲╱  ╲╱  ╲╱  ╲
  │
  └──────────────→ Time
   (centered around zero)
```

---

### Step 6: Band-Pass Filtering
**Location:** `rppg-processor.ts` - `bandPassFilter()`

**Why filter?**
- Remove noise (high frequencies: camera noise, motion)
- Remove slow changes (low frequencies: breathing, lighting)
- Keep only heart rate frequencies (1.0-3.5 Hz = 60-210 BPM)

**How it works:**

**6a. High-Pass Filter (removes low frequencies):**
```javascript
// First-order IIR high-pass filter
// Removes frequencies below 1.0 Hz (breathing, lighting changes)
alpha = RC / (RC + dt)
filtered[i] = alpha * (filtered[i-1] + signal[i] - signal[i-1])
```

**6b. Low-Pass Filter (removes high frequencies):**
```javascript
// Moving average filter
// Removes frequencies above 3.5 Hz (noise, motion artifacts)
windowSize = sampleRate / (2 * highCutoff)
smoothed[i] = average of signal[i-window/2 to i+window/2]
```

**Frequency response:**
```
Amplitude
  │
  │     ╱─────╲
  │    ╱       ╲
  │   ╱         ╲
  │  ╱           ╲
  │ ╱             ╲
  └──────────────────→ Frequency (Hz)
   0  1.0        3.5  10
      ↑           ↑
   Heart Rate Band
```

---

### Step 7: Frequency Analysis (FFT)
**Location:** `rppg-processor.ts` - `fft()`

**What is FFT?**
- Fast Fourier Transform converts time-domain signal → frequency-domain
- Shows which frequencies are present in the signal
- Like a musical spectrum analyzer showing which notes are playing

**How it works:**
```javascript
// For each frequency bin:
for (freq = 0 to maxFreq) {
    magnitude = 0
    for (each sample in time) {
        magnitude += sample * cos(2π * freq * time)
        magnitude += sample * sin(2π * freq * time)
    }
    magnitude = sqrt(real² + imag²)
}
```

**Visual representation:**
```
Time Domain (what we collected):
Intensity
  │  ╱╲  ╱╲  ╱╲  ╱╲
  │ ╱  ╲╱  ╲╱  ╲╱  ╲
  └──────────────────→ Time
```

```
Frequency Domain (after FFT):
Magnitude
  │     ●
  │    ╱ ╲
  │   ╱   ╲
  │  ╱     ╲
  │ ╱       ╲
  └──────────────→ Frequency (Hz)
   0  1.2  2.4  3.6
      ↑
   Peak at 1.2 Hz = 72 BPM!
```

**Example output:**
```
Frequency (Hz) | Magnitude
---------------|----------
0.5            | 0.12
1.0            | 0.45
1.2            | 2.34  ← Strongest peak!
1.5            | 0.67
2.0            | 0.23
```

---

### Step 8: Peak Detection
**Location:** `rppg-processor.ts` - `findDominantPeak()`

**Goal:** Find the strongest frequency in the heart rate band (1.0-3.5 Hz)

**How it works:**
1. Find all local maxima (peaks) in the frequency spectrum
2. Filter peaks within heart rate band (1.0-3.5 Hz)
3. Check for harmonics (2x frequency) to find true fundamental
4. Calculate Signal-to-Noise Ratio (SNR)

**SNR Calculation:**
```javascript
SNR = peakMagnitude / averageNoiseMagnitude

// Example:
peakMagnitude = 2.34
averageNoise = 0.15
SNR = 2.34 / 0.15 = 15.6  (good signal!)
```

**Validation:**
- Only accept peaks with SNR > 1.5 (signal must be stronger than noise)
- Reject if peak is at subharmonic (half the true frequency)

---

### Step 9: Convert Frequency to BPM
**Location:** `rppg-processor.ts` - `calculateHeartRate()`

**Simple conversion:**
```javascript
// Frequency is in Hz (cycles per second)
// Heart rate is in BPM (beats per minute)

BPM = frequency (Hz) × 60 seconds/minute

// Example:
peakFrequency = 1.2 Hz
heartRate = 1.2 × 60 = 72 BPM
```

**Final validation:**
```javascript
// Sanity checks:
if (BPM < 50 || BPM > 200) {
    return null;  // Reject unrealistic values
}

if (BPM < 60 && hasStrongerHarmonic) {
    return null;  // Reject subharmonics
}
```

---

## Complete Flow Diagram

```
Webcam Video (30 FPS)
    ↓
[Frame 1] [Frame 2] [Frame 3] ... [Frame 450]
    ↓
Select ROI (forehead/cheeks)
    ↓
Extract Green Channel Average
    ↓
Time Series: [125.34, 125.67, 125.12, ...]
    ↓
Detrend (remove baseline drift)
    ↓
Band-Pass Filter (1.0-3.5 Hz)
    ↓
FFT (Frequency Analysis)
    ↓
Find Peak in Heart Rate Band
    ↓
Calculate SNR
    ↓
Convert Hz → BPM
    ↓
Validate (50-200 BPM, SNR > 1.5)
    ↓
Display: 72 BPM ✓
```

---

## Why It Works: The Science

### The Physiological Basis

1. **Blood Volume Changes:**
   - Each heartbeat pumps ~70ml of blood
   - This causes tiny changes in blood volume in facial capillaries
   - More blood = slightly darker/redder appearance

2. **Light Absorption:**
   - Hemoglobin in blood absorbs green light
   - More blood volume = more absorption = darker green channel
   - Less blood volume = less absorption = brighter green channel

3. **Signal Amplitude:**
   - The changes are TINY: 0.1-0.5% of total intensity
   - But they're consistent and periodic
   - FFT can extract this weak signal from noise

### Why Green Channel?

- **Red channel:** Too saturated, less sensitive to small changes
- **Blue channel:** Weak signal, more noise
- **Green channel:** Optimal balance - sensitive but not saturated

---

## Challenges & Solutions

### Challenge 1: Motion Artifacts
**Problem:** Head movement creates large signal changes
**Solution:** 
- Use stable ROI (forehead)
- Band-pass filter removes high-frequency motion
- Detrending removes slow movement

### Challenge 2: Lighting Changes
**Problem:** Room lighting changes create baseline drift
**Solution:**
- Detrending removes slow lighting changes
- High-pass filter removes frequencies < 1.0 Hz

### Challenge 3: Weak Signal
**Problem:** rPPG signal is very weak (0.1-0.5% of total)
**Solution:**
- Collect 15+ seconds of data
- Use FFT for frequency analysis (very sensitive)
- SNR validation ensures signal is stronger than noise

### Challenge 4: Multiple Frequencies
**Problem:** Breathing, motion, and heart rate all present
**Solution:**
- Band-pass filter isolates heart rate band (1.0-3.5 Hz)
- Peak detection finds strongest signal in that band

---

## Accuracy & Limitations

### Expected Accuracy:
- **Best case:** ±2-5 BPM (good lighting, stable position)
- **Typical:** ±5-10 BPM (normal conditions)
- **Worst case:** Cannot detect (poor lighting, too much movement)

### Limitations:
1. Requires good, stable lighting
2. Subject must remain relatively still
3. Works best on light skin tones (more challenging on darker skin)
4. Needs 15+ seconds of data for accurate measurement
5. Can be affected by makeup, glasses, facial hair

### When It Won't Work:
- Very dark lighting
- Excessive head movement
- Face not visible or too far from camera
- Strong ambient light flicker (fluorescent lights at 50/60 Hz)

---

## Summary

rPPG works by:
1. ✅ Capturing video of your face
2. ✅ Extracting green channel intensity from a stable ROI
3. ✅ Building a time series of these values
4. ✅ Filtering to isolate heart rate frequencies
5. ✅ Using FFT to find the dominant frequency
6. ✅ Converting frequency to BPM

The magic is that your heartbeat causes tiny, periodic changes in skin color that are invisible to the eye but detectable by a webcam with proper signal processing!

