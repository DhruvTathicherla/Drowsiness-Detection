# Prajnachakshu: Complete Project Explanation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [System Architecture Flow](#system-architecture-flow)
4. [Core Components Deep Dive](#core-components-deep-dive)
5. [Data Processing Pipeline](#data-processing-pipeline)
6. [AI Integration](#ai-integration)
7. [Real-time Monitoring System](#real-time-monitoring-system)
8. [Key Algorithms Explained](#key-algorithms-explained)

---

## 🎯 Project Overview

**Prajnachakshu** (Sanskrit: "Wisdom Eye") is a real-time drowsiness and fatigue detection system that uses:
- **Computer Vision** for facial feature analysis
- **Remote Photoplethysmography (rPPG)** for vital signs measurement
- **AI/ML** for intelligent drowsiness assessment
- **Real-time Analytics** for fatigue prediction and wellness monitoring

The system operates entirely in the browser using webcam input, processing everything locally with no video data uploaded to servers.

---

## 🏗️ Architecture & Technology Stack

### Frontend Framework
- **Next.js 15** (React framework with App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Radix UI** components for UI elements

### Core Technologies
1. **MediaPipe Face Landmarker** - Facial landmark detection
2. **Custom rPPG Processor** - Heart rate extraction from video
3. **Google Genkit AI** - AI-powered drowsiness analysis
4. **Web APIs** - Webcam access, Canvas API for image processing

### Key Libraries
- `@mediapipe/tasks-vision` - Face detection and landmark tracking
- `genkit` - AI flow orchestration
- `@genkit-ai/googleai` - Gemini AI integration
- `recharts` - Data visualization

---

## 🔄 System Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S WEBCAM                            │
│              (1280x720 @ 30 FPS)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   WebcamFeed Component        │
        │   - Captures video stream     │
        │   - MediaPipe face detection  │
        │   - EAR/MAR calculation       │
        │   - Blink/Yawn detection      │
        └──────────┬───────────────────┘
                   │
        ┌──────────┴───────────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐            ┌──────────────────┐
│ Facial Metrics│            │  rPPG Panel      │
│ - EAR         │            │  - ROI selection │
│ - MAR         │            │  - Green channel │
│ - Blink count │            │  - Signal proc.  │
│ - Yawn count  │            │  - FFT analysis  │
└───────┬───────┘            └────────┬─────────┘
        │                              │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │    Dashboard Component        │
        │    - Metrics aggregation      │
        │    - State management         │
        │    - Alert system             │
        └──────────┬───────────────────┘
                   │
        ┌──────────┴───────────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐        ┌──────────────────────┐
│ AI Analysis Flow  │        │ Fatigue Analytics    │
│ (Gemini AI)       │        │ Engine               │
│ - Drowsiness      │        │ - Fatigue score      │
│   assessment      │        │ - Micro-sleep detect │
│ - Confidence      │        │ - Risk assessment    │
│ - Rationale       │        │ - Wellness score     │
└───────────────────┘        └──────────────────────┘
```

---

## 🔍 Core Components Deep Dive

### 1. **WebcamFeed Component** (`webcam-feed.tsx`)

**Purpose**: Captures webcam video and performs real-time facial analysis.

**How it works**:

1. **Initialization**:
   ```typescript
   - Requests webcam access (1280x720 resolution)
   - Loads MediaPipe Face Landmarker model
   - Sets up video element and canvas for processing
   ```

2. **Frame Processing Loop** (runs at ~30 FPS):
   ```typescript
   predictLoop() {
     - Captures current video frame
     - Runs MediaPipe face detection
     - Extracts 468 facial landmarks
     - Calculates EAR (Eye Aspect Ratio)
     - Calculates MAR (Mouth Aspect Ratio)
     - Detects blinks and yawns
     - Updates metrics via callback
   }
   ```

3. **Eye Aspect Ratio (EAR) Calculation**:
   ```
   EAR = (vertical_dist1 + vertical_dist2) / (2 × horizontal_dist)
   
   Where:
   - vertical_dist1 = distance between top and bottom eye points
   - vertical_dist2 = distance between another top/bottom pair
   - horizontal_dist = distance between eye corners
   
   Normal EAR: ~0.25-0.30
   Closed eye: <0.23
   ```

4. **Blink Detection**:
   ```typescript
   - EAR < 0.23 for 2+ consecutive frames = blink detected
   - Tracks blink count and duration
   - Stores timestamps for rate calculation
   ```

5. **Yawn Detection**:
   ```typescript
   - MAR > 0.7 for 15+ consecutive frames = yawn detected
   - Tracks yawn count and duration
   ```

**Key Features**:
- Real-time overlay visualization of facial landmarks
- Local processing (no data leaves browser)
- GPU acceleration via MediaPipe

---

### 2. **rPPG Panel Component** (`rppg-panel.tsx`)

**Purpose**: Extracts vital signs (heart rate, respiratory rate) from video using remote photoplethysmography.

**How rPPG Works**:

rPPG detects subtle color changes in skin caused by blood flow. When the heart beats, blood volume changes cause tiny variations in skin color that are invisible to the naked eye but detectable by a webcam.

**Processing Pipeline**:

1. **ROI (Region of Interest) Selection**:
   ```typescript
   - Uses face detection to find face bounding box
   - Selects upper 40% of face (forehead/cheeks region)
   - Falls back to center-upper 30% if face detection fails
   - ROI is stable and has good blood flow
   ```

2. **Green Channel Extraction** (30 times per second):
   ```typescript
   - Extracts RGB values from ROI pixels
   - Calculates average green channel intensity
   - Green channel is most sensitive to blood volume changes
   - Stores: [125.34, 125.67, 125.12, 125.89, ...]
   ```

3. **Signal Collection**:
   ```typescript
   - Collects 15 seconds of data (450 samples at 30 FPS)
   - Creates time series of green intensity values
   - Minimum samples needed for accurate frequency analysis
   ```

4. **Signal Preprocessing**:
   ```typescript
   a) Detrending:
      - Removes slow baseline drift (lighting changes, movement)
      - Fits linear trend and subtracts it
   
   b) Band-Pass Filtering:
      - High-pass: Removes frequencies < 1.0 Hz (breathing, lighting)
      - Low-pass: Removes frequencies > 3.5 Hz (noise, motion)
      - Keeps: 1.0-3.5 Hz (60-210 BPM heart rate band)
   ```

5. **Frequency Analysis (FFT)**:
   ```typescript
   - Converts time-domain signal → frequency-domain
   - Uses Fast Fourier Transform
   - Finds dominant frequency in heart rate band
   - Example: Peak at 1.2 Hz = 72 BPM
   ```

6. **Peak Detection & Validation**:
   ```typescript
   - Finds local maxima in frequency spectrum
   - Calculates Signal-to-Noise Ratio (SNR)
   - Validates: SNR > 1.5, BPM in 50-200 range
   - Checks for harmonics/subharmonics
   ```

**Additional Features**:

- **Heart Rate Variability (HRV)**:
  - Detects R-R intervals from signal peaks
  - Calculates RMSSD, SDNN, pNN50 metrics
  - Lower HRV = higher stress/fatigue

- **Stress Level Estimation**:
  - Based on HRV metrics
  - Low HRV (RMSSD < 20ms) = High stress
  - High HRV (RMSSD > 40ms) = Low stress
  - Stress index: 0-100 scale

- **SpO2 Estimation** (experimental):
  - Uses red/blue channel ratio
  - Estimates blood oxygen saturation
  - Note: Less accurate than medical pulse oximeters

- **Signal Quality Assessment**:
  - Evaluates variance and stability
  - Levels: poor, fair, good, excellent
  - Affects reliability of measurements

---

### 3. **Dashboard Component** (`dashboard.tsx`)

**Purpose**: Central orchestrator that coordinates all components and manages state.

**Key Responsibilities**:

1. **State Management**:
   ```typescript
   - Metrics aggregation (EAR, MAR, blinks, yawns)
   - Drowsiness history tracking
   - Session management
   - Alert state management
   ```

2. **Calibration System**:
   ```typescript
   - Captures baseline EAR and MAR values
   - Accounts for individual facial differences
   - Required before monitoring starts
   ```

3. **AI Analysis Integration**:
   ```typescript
   - Calls AI analysis every 2 seconds
   - Sends rolling 60-second window of metrics
   - Receives drowsiness level, confidence, rationale
   ```

4. **Alert System**:
   ```typescript
   - Visual flashing alerts for moderate/severe drowsiness
   - Audible alerts (optional)
   - Continuous alerting for severe drowsiness
   - 30-second cooldown for moderate alerts
   ```

5. **Session Management**:
   ```typescript
   - Tracks session start/end times
   - Records drowsiness history (60 data points)
   - Generates session summary via AI
   - CSV export functionality
   ```

6. **Rolling Window Analysis**:
   ```typescript
   - Maintains 60-second rolling window
   - Calculates blink/yawn rates per minute
   - Filters out old events automatically
   ```

---

### 4. **Fatigue Analytics Engine** (`fatigue-analytics.ts`)

**Purpose**: Advanced fatigue prediction and wellness monitoring.

**Key Features**:

1. **Fatigue Score Calculation** (0-100):
   ```typescript
   Components:
   - Drowsiness score: 40% weight
   - EAR component: 20% weight (lower EAR = more fatigue)
   - Blink pattern: 15% weight (deviation from normal)
   - Yawn frequency: 15% weight
   - HRV/Stress: 10% weight (low HRV = fatigue)
   ```

2. **Micro-Sleep Detection**:
   ```typescript
   - Detects eye closures between 500ms - 3 seconds
   - Distinguishes from normal blinks (<500ms)
   - Tracks count and total duration
   - Critical indicator of severe fatigue
   ```

3. **Cognitive Load Estimation**:
   ```typescript
   Factors:
   - Stress level: 40% weight
   - Heart rate elevation: 30% weight
   - Blink suppression: 30% weight
   
   Levels: low, moderate, high, overload
   ```

4. **Risk Assessment**:
   ```typescript
   Risk Factors:
   - High fatigue score (>60)
   - Recent micro-sleeps
   - Eye closure (EAR < 0.2)
   - Extended session duration (>2 hours)
   
   Levels: safe, caution, warning, danger, critical
   ```

5. **Wellness Score**:
   ```typescript
   - Inverse of fatigue score
   - Adjusted by stress level
   - Optimal heart rate bonus (60-80 BPM)
   - Good HRV bonus (RMSSD > 40ms)
   
   Status: excellent, good, fair, poor, critical
   ```

6. **Break Recommendations**:
   ```typescript
   Urgency Levels:
   - Immediate: 2+ micro-sleeps detected
   - Urgent: High fatigue (>70) or 1 micro-sleep
   - Recommended: Moderate fatigue (>50) or 45+ min session
   - Suggested: Mild fatigue (>30) or approaching break time
   ```

---

### 5. **AI Integration** (`drowsiness-analysis.ts`)

**Purpose**: Uses Google Gemini AI to provide intelligent drowsiness assessment.

**How it works**:

1. **Input Schema**:
   ```typescript
   {
     blinkRate: number,        // blinks per minute
     yawnRate: number,         // yawns per minute
     eyeAspectRatio: number,   // EAR value
     mouthAspectRatio: number, // MAR value
     confoundingFactors?: string // e.g., "Had Coffee, Allergies"
   }
   ```

2. **AI Prompt**:
   ```
   The AI receives:
   - Current metrics (blink rate, yawn rate, EAR, MAR)
   - Confounding factors (if any)
   - Guidelines for drowsiness levels
   
   The AI outputs:
   - Drowsiness level: Alert | Slightly Drowsy | Moderately Drowsy | Severely Drowsy
   - Confidence: 0-1 score
   - Rationale: Explanation of the assessment
   ```

3. **Retry Logic**:
   ```typescript
   - 3 retry attempts with exponential backoff
   - Falls back to "Alert" state if all retries fail
   - Prevents false alarms from network issues
   ```

4. **Session Summary**:
   ```typescript
   - Analyzes entire session data
   - Generates headline, trends, insights
   - Provides personalized recommendations
   ```

---

## 📊 Data Processing Pipeline

### Real-time Processing Flow

```
Frame 1 (t=0ms)
├─ MediaPipe detects face
├─ Extracts 468 landmarks
├─ Calculates EAR = 0.28 (normal)
├─ Calculates MAR = 0.45 (normal)
├─ No blink/yawn detected
└─ Updates metrics

Frame 2 (t=33ms)
├─ EAR = 0.27
├─ MAR = 0.46
└─ Metrics updated

... (continues at 30 FPS)

Frame 60 (t=2000ms) - AI Analysis Trigger
├─ Collects last 60 seconds of data
├─ Calculates blink rate: 12/min
├─ Calculates yawn rate: 1/min
├─ Sends to AI: {blinkRate: 12, yawnRate: 1, EAR: 0.26, MAR: 0.48}
├─ AI responds: {level: "Alert", confidence: 0.92, rationale: "..."}
└─ Updates drowsiness score

Frame 90 (t=3000ms) - rPPG Update
├─ Collected 90 samples (3 seconds)
├─ Status: "collecting" (needs 450 samples = 15 seconds)
└─ No heart rate yet

Frame 450 (t=15000ms) - rPPG Ready
├─ Collected 450 samples
├─ Signal processing:
│  ├─ Detrending
│  ├─ Band-pass filtering
│  ├─ FFT analysis
│  └─ Peak detection
├─ Heart rate: 72 BPM
├─ Respiratory rate: 16 br/min
├─ HRV calculated: {rmssd: 35ms, sdnn: 52ms}
├─ Stress level: "moderate"
└─ Updates rPPG result

Frame 600 (t=20000ms) - Fatigue Analytics
├─ Fatigue score: 25 (mild)
├─ Micro-sleeps: 0
├─ Risk level: "safe"
├─ Wellness: "good"
└─ No break recommended
```

---

## 🧮 Key Algorithms Explained

### 1. Eye Aspect Ratio (EAR)

**Formula**:
```
EAR = (||p2 - p6|| + ||p3 - p5||) / (2 × ||p1 - p4||)

Where:
- p1, p4: Eye corners (horizontal)
- p2, p3: Top eye points
- p5, p6: Bottom eye points
```

**Implementation**:
```typescript
function calculateEAR(eyeLandmarks: Point[]): number {
  const verticalDist1 = distance(p2, p6);
  const verticalDist2 = distance(p3, p5);
  const horizontalDist = distance(p1, p4);
  
  if (horizontalDist === 0) return 0;
  
  return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
}
```

**Why it works**:
- When eyes are open, vertical distances are large relative to horizontal
- When eyes close, vertical distances approach zero
- Ratio normalizes for face size and distance from camera

---

### 2. rPPG Signal Processing

**Step-by-step**:

1. **Green Channel Extraction**:
   ```typescript
   for each pixel in ROI:
     greenSum += pixel[green_channel]
   averageGreen = greenSum / pixelCount
   ```

2. **Detrending** (Linear):
   ```typescript
   // Fit line: y = slope * x + intercept
   trend = slope * time + intercept
   detrended = original - trend
   ```

3. **High-Pass Filter** (IIR):
   ```typescript
   alpha = RC / (RC + dt)
   filtered[i] = alpha * (filtered[i-1] + signal[i] - signal[i-1])
   ```

4. **Low-Pass Filter** (Moving Average):
   ```typescript
   windowSize = sampleRate / (2 * highCutoff)
   smoothed[i] = average(signal[i-window/2 to i+window/2])
   ```

5. **FFT** (Frequency Analysis):
   ```typescript
   for each frequency k:
     real = sum(signal[n] * cos(2π * k * n / N))
     imag = sum(signal[n] * sin(2π * k * n / N))
     magnitude = sqrt(real² + imag²)
   ```

6. **Peak Detection**:
   ```typescript
   - Find local maxima in frequency spectrum
   - Filter peaks in heart rate band (1.0-3.5 Hz)
   - Calculate SNR = peakMagnitude / averageNoise
   - Validate: SNR > 1.5, frequency in valid range
   ```

---

### 3. Heart Rate Variability (HRV) Calculation

**R-R Interval Detection**:
```typescript
- Detect peaks in filtered signal
- Calculate time between consecutive peaks
- Filter: 300-1500ms (40-200 BPM)
```

**RMSSD** (Root Mean Square of Successive Differences):
```typescript
RMSSD = sqrt(mean((RR[i] - RR[i-1])²))
```
- Measures short-term variability
- Higher = better (more relaxed)

**SDNN** (Standard Deviation of NN intervals):
```typescript
SDNN = sqrt(mean((RR[i] - meanRR)²))
```
- Measures overall variability
- Higher = better

**pNN50** (Percentage of differences > 50ms):
```typescript
pNN50 = (count of |RR[i] - RR[i-1]| > 50ms) / total * 100
```
- Percentage of significant variations
- Higher = better

---

## 🎯 Real-time Monitoring System

### Alert System

**Visual Alerts**:
- Flashing red border for moderate/severe drowsiness
- Continuous flashing for severe drowsiness
- Color-coded risk indicators

**Audible Alerts**:
- Single beep for moderate drowsiness (30s cooldown)
- Continuous alert sound for severe drowsiness
- Can be disabled in settings

**Alert Levels**:
```
Alert → No alert
Slightly Drowsy → No alert (monitoring)
Moderately Drowsy → Visual + Audible (single)
Severely Drowsy → Visual + Audible (continuous)
```

---

### Session Management

**Session Lifecycle**:
1. **Calibration** (required):
   - User sits normally
   - System captures baseline EAR/MAR
   - Accounts for individual differences

2. **Monitoring**:
   - Real-time metrics collection
   - AI analysis every 2 seconds
   - Alert system active
   - History tracking

3. **Summary**:
   - AI-generated session summary
   - Trends and insights
   - CSV export available

---

## 🔐 Privacy & Security

**Local Processing**:
- All video processing happens in browser
- No video data uploaded to servers
- Only metrics sent to AI (not video frames)
- Webcam stream never leaves device

**Data Flow**:
```
Webcam → Browser (local) → Metrics → AI API → Results → Browser
         (video stays here)              (only numbers)
```

---

## 📈 Performance Characteristics

**Frame Rate**: ~30 FPS (limited by webcam)
**AI Analysis**: Every 2 seconds
**rPPG Update**: Every 2.5 seconds (after 15s initialization)
**Fatigue Analytics**: Real-time (every frame)
**Memory Usage**: ~50-100 MB (browser)
**CPU Usage**: Moderate (MediaPipe uses GPU when available)

---

## 🎓 Key Concepts Summary

1. **EAR (Eye Aspect Ratio)**: Mathematical measure of eye openness
2. **MAR (Mouth Aspect Ratio)**: Mathematical measure of mouth openness
3. **rPPG**: Remote photoplethysmography - extracting vital signs from video
4. **HRV**: Heart rate variability - measure of autonomic nervous system
5. **FFT**: Fast Fourier Transform - converts time signal to frequency domain
6. **SNR**: Signal-to-Noise Ratio - quality measure of detected signal
7. **ROI**: Region of Interest - specific area analyzed in video frame

---

## 🚀 Future Enhancements

Potential improvements:
- Multi-face detection
- Historical data storage
- Machine learning model training
- Mobile app version
- Integration with wearable devices
- Advanced sleep stage detection

---

## 📝 Conclusion

Prajnachakshu is a sophisticated real-time drowsiness detection system that combines:
- **Computer Vision** for facial analysis
- **Signal Processing** for vital signs extraction
- **AI** for intelligent assessment
- **Analytics** for fatigue prediction

All processing happens locally in the browser, ensuring privacy while providing accurate, real-time monitoring of drowsiness and fatigue levels.

