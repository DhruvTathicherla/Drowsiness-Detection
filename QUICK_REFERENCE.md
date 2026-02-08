# Prajnachakshu: Quick Reference Guide

## 🎯 What Does This System Do?

**Real-time drowsiness and fatigue detection using your webcam** - no special hardware needed!

---

## 🔄 How It Works (Simple Version)

```
1. Webcam captures your face (30 frames/second)
   ↓
2. MediaPipe detects facial landmarks (468 points)
   ↓
3. System calculates:
   - Eye Aspect Ratio (EAR) → Are eyes open/closed?
   - Mouth Aspect Ratio (MAR) → Is mouth open (yawning)?
   - Blink count → How often are you blinking?
   ↓
4. rPPG extracts vital signs from skin color changes:
   - Heart rate (BPM)
   - Respiratory rate (breaths/min)
   - Stress level (from HRV)
   ↓
5. AI analyzes all metrics → Determines drowsiness level
   ↓
6. Fatigue Analytics Engine:
   - Calculates fatigue score
   - Detects micro-sleeps
   - Assesses risk level
   - Recommends breaks
   ↓
7. Alerts you if drowsy (visual + sound)
```

---

## 📊 Key Metrics Explained

### Eye Aspect Ratio (EAR)
- **Normal**: 0.25 - 0.30 (eyes open)
- **Closed**: < 0.23 (eye closed)
- **Formula**: `(vertical distances) / (2 × horizontal distance)`

### Mouth Aspect Ratio (MAR)
- **Normal**: < 0.5 (mouth closed)
- **Yawning**: > 0.7 (mouth open)
- **Formula**: `vertical opening / horizontal opening`

### Blink Detection
- **Normal rate**: ~15-20 blinks/minute
- **Too low**: < 10/min (fatigue)
- **Too high**: > 30/min (dry eyes, fatigue)

### Yawn Detection
- **Normal**: 0-2 yawns/hour
- **Fatigue**: 3+ yawns/hour

---

## 💓 rPPG (Remote Photoplethysmography)

### What is it?
Extracting heart rate from video by detecting tiny color changes in your skin caused by blood flow.

### How it works:
1. **Select ROI**: Forehead/cheeks region (good blood flow)
2. **Extract green channel**: Most sensitive to blood volume changes
3. **Collect 15 seconds** of data (450 samples at 30 FPS)
4. **Filter signal**: Remove noise, keep heart rate frequencies
5. **FFT analysis**: Find dominant frequency
6. **Convert to BPM**: Frequency × 60

### Why green channel?
- Hemoglobin absorbs green light
- More blood = darker green
- Less blood = brighter green
- Changes happen at heart rate frequency!

---

## 🧠 AI Analysis

### Input to AI:
- Blink rate (per minute)
- Yawn rate (per minute)
- Eye Aspect Ratio
- Mouth Aspect Ratio
- Confounding factors (coffee, allergies, etc.)

### AI Output:
- **Drowsiness Level**: Alert | Slightly Drowsy | Moderately Drowsy | Severely Drowsy
- **Confidence**: 0-1 (how sure is the AI?)
- **Rationale**: Why this level was assigned

### How often?
- Every 2 seconds
- Uses rolling 60-second window of data

---

## 📈 Fatigue Analytics

### Fatigue Score (0-100)
**Components**:
- Drowsiness: 40%
- Eye closure: 20%
- Blink pattern: 15%
- Yawn frequency: 15%
- HRV/Stress: 10%

**Levels**:
- 0-20: Alert ✅
- 20-40: Mild ⚠️
- 40-60: Moderate ⚠️⚠️
- 60-80: Severe 🚨
- 80-100: Critical 🚨🚨

### Micro-Sleep Detection
- **What**: Brief eye closures (500ms - 3 seconds)
- **Why important**: Strong indicator of severe fatigue
- **Action**: Immediate break recommended

### Risk Assessment
**Factors**:
- High fatigue score
- Micro-sleeps detected
- Eyes closing (EAR < 0.2)
- Long session duration

**Levels**: Safe → Caution → Warning → Danger → Critical

### Break Recommendations
- **Immediate**: 2+ micro-sleeps → 15 min break
- **Urgent**: High fatigue or 1 micro-sleep → 10 min break
- **Recommended**: Moderate fatigue → 5 min break
- **Suggested**: Mild fatigue → 3 min break

---

## 🚨 Alert System

### Visual Alerts
- **Moderate drowsiness**: Flashing red border
- **Severe drowsiness**: Continuous flashing

### Audible Alerts
- **Moderate**: Single beep (30s cooldown)
- **Severe**: Continuous alert sound
- Can be disabled in settings

---

## ⚙️ System Requirements

### Browser
- Chrome, Edge, Firefox, Safari (latest versions)
- Webcam access permission
- JavaScript enabled

### Hardware
- Webcam (built-in or external)
- Good lighting (for rPPG)
- Stable position (minimal movement)

### Performance
- Modern CPU (or GPU for MediaPipe)
- ~50-100 MB RAM
- Internet connection (for AI API)

---

## 🔒 Privacy

✅ **What stays local**:
- Video stream (never uploaded)
- Facial landmarks (processed locally)
- All video processing

✅ **What gets sent to AI**:
- Only numbers (blink rate, yawn rate, EAR, MAR)
- No video frames
- No images

---

## 📝 Workflow

### 1. Start Application
- Open in browser
- Grant camera permission

### 2. Calibration (Required)
- Sit normally
- Look at camera
- System captures baseline EAR/MAR
- Click "Calibrate"

### 3. Start Monitoring
- Click "Start Monitoring"
- System begins real-time analysis
- Metrics update every frame
- AI analysis every 2 seconds

### 4. View Results
- **Metrics Grid**: Current values (EAR, MAR, blinks, yawns)
- **rPPG Panel**: Heart rate, respiratory rate, stress
- **AI Analysis**: Drowsiness level, confidence, rationale
- **Fatigue Analytics**: Fatigue score, risk, wellness
- **Chart**: Drowsiness history over time

### 5. Alerts
- Visual flashing if drowsy
- Audible alerts (if enabled)
- Break recommendations

### 6. End Session
- Click "Stop Monitoring"
- View session summary
- Export data (CSV)
- AI-generated insights

---

## 🎓 Key Terms

| Term | Meaning |
|------|---------|
| **EAR** | Eye Aspect Ratio - measure of eye openness |
| **MAR** | Mouth Aspect Ratio - measure of mouth openness |
| **rPPG** | Remote Photoplethysmography - vital signs from video |
| **HRV** | Heart Rate Variability - measure of stress/recovery |
| **ROI** | Region of Interest - area analyzed in video |
| **FFT** | Fast Fourier Transform - frequency analysis |
| **SNR** | Signal-to-Noise Ratio - signal quality measure |
| **RMSSD** | HRV metric - short-term variability |
| **SDNN** | HRV metric - overall variability |
| **SpO2** | Blood oxygen saturation (estimated) |

---

## 🐛 Troubleshooting

### "Camera Not Found"
- Check camera permissions in browser
- Ensure no other app is using camera
- Try refreshing page

### "Heart Rate Not Detected"
- Ensure good lighting
- Stay still (minimal movement)
- Wait 15 seconds for initialization
- Check signal quality indicator

### "AI Analysis Failed"
- Check internet connection
- Verify API key is set
- Check browser console for errors

### Poor Signal Quality
- Improve lighting
- Reduce movement
- Move closer to camera
- Remove glasses/reflections if possible

---

## 💡 Tips for Best Results

1. **Lighting**: Bright, even lighting (avoid backlighting)
2. **Position**: Face camera directly, stay in frame
3. **Stability**: Minimize head movement
4. **Calibration**: Do this when alert and rested
5. **Session Length**: Take breaks every 45-60 minutes
6. **Confounding Factors**: Report if you had coffee, allergies, etc.

---

## 📚 File Structure

```
src/
├── app/
│   ├── page.tsx              # Main entry point
│   ├── actions.ts            # Server actions (AI calls)
│   └── layout.tsx            # App layout
├── components/
│   ├── dashboard.tsx         # Main orchestrator
│   ├── webcam-feed.tsx       # Video capture & facial analysis
│   ├── rppg-panel.tsx        # Vital signs extraction
│   ├── fatigue-analytics-panel.tsx  # Advanced analytics
│   └── ui/                   # UI components
├── lib/
│   ├── facial-metrics.ts    # EAR/MAR calculations
│   ├── rppg-processor.ts    # rPPG signal processing
│   └── fatigue-analytics.ts # Fatigue engine
└── ai/
    ├── flows/
    │   ├── drowsiness-analysis.ts  # AI analysis flow
    │   └── summarize-session.ts    # Session summary
    └── schemas.ts            # AI input/output schemas
```

---

## 🎯 Use Cases

1. **Driving Safety**: Monitor driver drowsiness
2. **Workplace Safety**: Alert workers in hazardous environments
3. **Study Sessions**: Remind students to take breaks
4. **Long-distance Driving**: Prevent accidents
5. **Healthcare**: Monitor patient alertness
6. **Research**: Collect drowsiness data

---

## ⚡ Performance Notes

- **Frame Rate**: ~30 FPS (webcam limited)
- **Latency**: < 100ms for facial metrics
- **AI Response**: ~1-2 seconds
- **rPPG Initialization**: 15 seconds
- **Memory**: ~50-100 MB
- **CPU**: Moderate (GPU accelerated if available)

---

This system represents a complete, production-ready drowsiness detection solution combining computer vision, signal processing, and AI for intelligent fatigue monitoring! 🚀

