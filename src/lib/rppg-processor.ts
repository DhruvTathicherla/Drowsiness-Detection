// ==== rPPG START ====

/**
 * Remote Photoplethysmography (rPPG) Signal Processor
 * Extracts heart rate, pulse rate, and respiratory rate from video frames
 */

export interface RPPGResult {
  heartRate: number | null;
  pulseRate: number | null;
  respiratoryRate: number | null;
  status: 'initializing' | 'collecting' | 'running' | 'error';
  samplesCollected: number;
  // ==== NEW FEATURES ====
  stressLevel: 'low' | 'moderate' | 'high' | null;
  stressIndex: number | null; // 0-100 scale
  hrv: HRVMetrics | null;
  spO2: number | null; // Blood oxygen estimation (%)
  signalQuality: 'poor' | 'fair' | 'good' | 'excellent';
  waveformData: number[]; // Last 5 seconds of filtered signal for visualization
}

export interface HRVMetrics {
  rmssd: number; // Root Mean Square of Successive Differences (ms)
  sdnn: number;  // Standard Deviation of NN intervals (ms)
  pnn50: number; // Percentage of successive differences > 50ms
  meanRR: number; // Mean R-R interval (ms)
}

export interface RPPGConfig {
  sampleRate: number; // Hz (frames per second)
  minSamplesForAnalysis: number; // Minimum samples before showing results (10-20 seconds)
  updateInterval: number; // Update display every N seconds
  heartRateBandMin: number; // Hz (0.7 Hz ≈ 42 BPM)
  heartRateBandMax: number; // Hz (4.0 Hz ≈ 240 BPM)
  respiratoryRateBandMin: number; // Hz (0.1 Hz ≈ 6 breaths/min)
  respiratoryRateBandMax: number; // Hz (0.5 Hz ≈ 30 breaths/min)
}

const DEFAULT_CONFIG: RPPGConfig = {
  sampleRate: 30, // 30 FPS
  minSamplesForAnalysis: 450, // 15 seconds at 30 FPS (longer window for better frequency resolution)
  updateInterval: 2.5, // Update every 2.5 seconds
  heartRateBandMin: 1.0, // 60 BPM (more realistic minimum)
  heartRateBandMax: 3.5, // 210 BPM
  respiratoryRateBandMin: 0.1, // 6 breaths/min
  respiratoryRateBandMax: 0.5, // 30 breaths/min
};

export class RPPGProcessor {
  private config: RPPGConfig;
  private signalBuffer: number[] = [];
  private timestampBuffer: number[] = [];
  private lastUpdateTime: number = 0;
  private roiX: number = 0;
  private roiY: number = 0;
  private roiWidth: number = 0;
  private roiHeight: number = 0;
  private roiInitialized: boolean = false;
  private roiStable: boolean = false; // Track if ROI has been stable for a few frames
  
  // ==== NEW FEATURE VARIABLES ====
  private redChannelBuffer: number[] = [];  // For SpO2 estimation
  private blueChannelBuffer: number[] = []; // For SpO2 estimation
  private peakIndices: number[] = [];       // For HRV calculation
  private rrIntervals: number[] = [];       // R-R intervals in ms

  constructor(config: Partial<RPPGConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize ROI (Region of Interest) on the face
   * Uses a simple rectangle on the upper part of the face (forehead/cheeks)
   */
  initializeROI(faceWidth: number, faceHeight: number, faceX: number, faceY: number): void {
    // Use upper 40% of face, centered horizontally
    // This typically covers forehead and upper cheeks
    // Only update if ROI hasn't been set or if face position changed significantly
    const newRoiX = faceX + (faceWidth - faceWidth * 0.6) / 2;
    const newRoiY = faceY + faceHeight * 0.1;
    
    if (!this.roiInitialized || 
        Math.abs(newRoiX - this.roiX) > faceWidth * 0.1 || 
        Math.abs(newRoiY - this.roiY) > faceHeight * 0.1) {
      this.roiWidth = faceWidth * 0.6;
      this.roiHeight = faceHeight * 0.4;
      this.roiX = newRoiX;
      this.roiY = newRoiY;
      this.roiInitialized = true;
      this.roiStable = false;
    } else {
      this.roiStable = true;
    }
  }

  /**
   * Simple ROI initialization when face detection is not available
   * Uses center-upper region of the video frame
   */
  initializeSimpleROI(videoWidth: number, videoHeight: number): void {
    // Use center-upper 30% of frame
    const roiSize = Math.min(videoWidth, videoHeight) * 0.3;
    this.roiWidth = roiSize;
    this.roiHeight = roiSize;
    this.roiX = (videoWidth - this.roiWidth) / 2;
    this.roiY = videoHeight * 0.15; // Upper 15% of frame
    this.roiInitialized = true;
  }

  /**
   * Extract RGB channel mean intensities from ROI
   * Returns green channel value for backward compatibility
   * Also stores red and blue channels internally for SpO2 estimation
   */
  extractGreenChannelIntensity(
    imageData: ImageData,
    videoWidth: number,
    videoHeight: number
  ): number | null {
    if (!this.roiInitialized) {
      // Fallback: initialize simple ROI if not done
      this.initializeSimpleROI(videoWidth, videoHeight);
    }

    // Convert ROI coordinates to pixel coordinates
    const startX = Math.max(0, Math.floor(this.roiX));
    const startY = Math.max(0, Math.floor(this.roiY));
    const endX = Math.min(videoWidth, Math.floor(this.roiX + this.roiWidth));
    const endY = Math.min(videoHeight, Math.floor(this.roiY + this.roiHeight));

    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    let pixelCount = 0;

    // Extract all RGB channels from ROI
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const index = (y * videoWidth + x) * 4;
        redSum += imageData.data[index];       // Red channel
        greenSum += imageData.data[index + 1]; // Green channel
        blueSum += imageData.data[index + 2];  // Blue channel
        pixelCount++;
      }
    }

    if (pixelCount === 0) return null;

    // Store red and blue channel averages for SpO2 estimation
    const redAvg = redSum / pixelCount;
    const blueAvg = blueSum / pixelCount;
    
    this.redChannelBuffer.push(redAvg);
    this.blueChannelBuffer.push(blueAvg);
    
    // Keep buffers in sync with green channel
    const maxSamples = this.config.sampleRate * 20;
    if (this.redChannelBuffer.length > maxSamples) {
      this.redChannelBuffer.shift();
      this.blueChannelBuffer.shift();
    }

    return greenSum / pixelCount;
  }

  /**
   * Add a new signal sample
   */
  addSample(intensity: number, timestamp: number): void {
    this.signalBuffer.push(intensity);
    this.timestampBuffer.push(timestamp);

    // Keep only last 20 seconds of data (at 30 FPS = 600 samples)
    const maxSamples = this.config.sampleRate * 20;
    if (this.signalBuffer.length > maxSamples) {
      this.signalBuffer.shift();
      this.timestampBuffer.shift();
    }
  }

  /**
   * Apply detrending to remove slow baseline drift
   */
  private detrend(signal: number[]): number[] {
    if (signal.length < 2) return signal;

    // Simple linear detrending
    const n = signal.length;
    const meanX = (n - 1) / 2;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += signal[i];
      sumXY += i * signal[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return signal.map((val, i) => val - (slope * i + intercept));
  }

  /**
   * Apply band-pass filter using proper high-pass and low-pass filters
   */
  private bandPassFilter(signal: number[], lowCutoff: number, highCutoff: number, sampleRate: number): number[] {
    if (signal.length < 3) return signal;

    // Detrend first to remove slow baseline drift
    let filtered = this.detrend(signal);

    // Normalize to zero mean
    const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
    filtered = filtered.map(v => v - mean);

    // Apply high-pass filter (remove frequencies below lowCutoff)
    // Using a first-order IIR high-pass filter: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
    const rc = 1 / (2 * Math.PI * lowCutoff);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);
    const highPassed: number[] = [filtered[0]];
    
    for (let i = 1; i < filtered.length; i++) {
      highPassed.push(alpha * (highPassed[i - 1] + filtered[i] - filtered[i - 1]));
    }

    // Apply low-pass filter (remove frequencies above highCutoff)
    // Using moving average with appropriate window size
    const windowSize = Math.max(1, Math.floor(sampleRate / (2 * highCutoff)));
    const smoothed: number[] = [];
    
    for (let i = 0; i < highPassed.length; i++) {
      let sum = 0;
      let count = 0;
      const halfWindow = Math.floor(windowSize / 2);
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(highPassed.length - 1, i + halfWindow); j++) {
        sum += highPassed[j];
        count++;
      }
      smoothed.push(sum / count);
    }

    // Final normalization to unit variance
    const std = Math.sqrt(smoothed.reduce((sum, v) => sum + v * v, 0) / smoothed.length);
    if (std > 0) {
      return smoothed.map(v => v / std);
    }

    return smoothed;
  }

  /**
   * Simple FFT implementation for frequency analysis
   */
  private fft(signal: number[]): { magnitude: number[]; frequencies: number[] } {
    const N = signal.length;
    if (N === 0) return { magnitude: [], frequencies: [] };

    // Use a power-of-2 size for FFT (zero-pad if needed)
    const fftSize = Math.pow(2, Math.ceil(Math.log2(N)));
    const padded = [...signal];
    while (padded.length < fftSize) {
      padded.push(0);
    }

    // Simple DFT (for small signals) or use Web Audio API FFT
    // For now, use a simplified approach with peak detection in time domain
    const magnitudes: number[] = [];
    const frequencies: number[] = [];

    // Calculate frequency resolution
    const sampleRate = this.config.sampleRate;
    const freqResolution = sampleRate / fftSize;

    // Compute magnitude spectrum
    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0;
      let imag = 0;
      const freq = k * freqResolution;

      for (let n = 0; n < fftSize; n++) {
        const angle = -2 * Math.PI * k * n / fftSize;
        real += padded[n] * Math.cos(angle);
        imag += padded[n] * Math.sin(angle);
      }

      const magnitude = Math.sqrt(real * real + imag * imag);
      magnitudes.push(magnitude);
      frequencies.push(freq);
    }

    return { magnitude: magnitudes, frequencies: frequencies };
  }

  /**
   * Find dominant peak in frequency range with signal quality check
   * Also checks for harmonics to improve accuracy
   */
  private findDominantPeak(
    magnitudes: number[],
    frequencies: number[],
    minFreq: number,
    maxFreq: number
  ): { frequency: number | null; snr: number } {
    // Find all peaks in the target frequency range
    const peaks: Array<{ index: number; freq: number; magnitude: number }> = [];
    
    for (let i = 1; i < frequencies.length - 1; i++) {
      if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
        // Check if this is a local maximum
        if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
          peaks.push({
            index: i,
            freq: frequencies[i],
            magnitude: magnitudes[i]
          });
        }
      }
    }

    if (peaks.length === 0) {
      return { frequency: null, snr: 0 };
    }

    // Sort by magnitude
    peaks.sort((a, b) => b.magnitude - a.magnitude);

    // Check for harmonics - if we find a strong peak at 2x frequency, the fundamental might be at 0.5x
    // This helps detect cases where we're picking up a harmonic instead of the fundamental
    let bestPeak = peaks[0];
    
    for (const peak of peaks.slice(0, Math.min(5, peaks.length))) {
      // Check if there's a stronger peak at 2x frequency (harmonic)
      const harmonicFreq = peak.freq * 2;
      const harmonicIndex = frequencies.findIndex(f => Math.abs(f - harmonicFreq) < frequencies[1] - frequencies[0]);
      
      if (harmonicIndex >= 0 && harmonicIndex < magnitudes.length) {
        const harmonicMagnitude = magnitudes[harmonicIndex];
        // If harmonic is significantly stronger, the fundamental might be at 0.5x
        if (harmonicMagnitude > peak.magnitude * 1.2) {
          const fundamentalFreq = peak.freq * 0.5;
          if (fundamentalFreq >= minFreq && fundamentalFreq <= maxFreq) {
            // Check if fundamental exists in our peaks
            const fundamentalPeak = peaks.find(p => Math.abs(p.freq - fundamentalFreq) < frequencies[1] - frequencies[0]);
            if (fundamentalPeak && fundamentalPeak.magnitude > peak.magnitude * 0.5) {
              bestPeak = fundamentalPeak;
              break;
            }
          }
        }
      }
    }

    // Calculate SNR for the best peak
    let noiseSum = 0;
    let noiseCount = 0;
    const windowSize = Math.max(3, Math.floor(frequencies.length * 0.1));
    
    for (let i = 0; i < magnitudes.length; i++) {
      if (Math.abs(i - bestPeak.index) > windowSize / 2) {
        noiseSum += magnitudes[i];
        noiseCount++;
      }
    }

    const avgNoise = noiseCount > 0 ? noiseSum / noiseCount : 1;
    const snr = avgNoise > 0 ? bestPeak.magnitude / avgNoise : 0;

    // Higher SNR threshold for more reliable detection
    if (snr < 1.5) {
      return { frequency: null, snr };
    }

    return { frequency: bestPeak.freq, snr };
  }

  /**
   * Calculate heart rate from signal
   */
  private calculateHeartRate(signal: number[]): number | null {
    if (signal.length < this.config.minSamplesForAnalysis) {
      return null;
    }

    // Check signal quality - should have some variation
    const signalVariance = this.calculateVariance(signal);
    if (signalVariance < 0.1) {
      // Signal is too flat, likely no valid rPPG signal
      return null;
    }

    // Apply band-pass filter for heart rate band
    const filtered = this.bandPassFilter(
      signal,
      this.config.heartRateBandMin,
      this.config.heartRateBandMax,
      this.config.sampleRate
    );

    // Check filtered signal quality
    const filteredVariance = this.calculateVariance(filtered);
    if (filteredVariance < 0.01) {
      // Filtered signal is too flat
      return null;
    }

    // Perform FFT
    const { magnitude, frequencies } = this.fft(filtered);

    // Find dominant peak in heart rate band with SNR check
    const { frequency: peakFreq, snr } = this.findDominantPeak(
      magnitude,
      frequencies,
      this.config.heartRateBandMin,
      this.config.heartRateBandMax
    );

    if (peakFreq === null || peakFreq < this.config.heartRateBandMin) {
      return null;
    }

    // Convert Hz to BPM
    const bpm = peakFreq * 60;
    
    // Get magnitude at peak frequency for subharmonic check
    const peakIndex = frequencies.findIndex(f => Math.abs(f - peakFreq) < (frequencies[1] - frequencies[0]) / 2);
    const peakMagnitude = peakIndex >= 0 && peakIndex < magnitude.length ? magnitude[peakIndex] : 0;
    
    // Sanity check: heart rate should be in reasonable range for resting
    // Reject values that are too low (likely detecting breathing or other artifacts)
    if (bpm < 50 || bpm > 200) {
      if (Math.random() < 0.1) {
        console.log(`rPPG: HR rejected - BPM ${bpm} outside valid range (50-200 BPM)`);
      }
      return null;
    }

    // Additional check: if BPM is suspiciously low (< 60), verify it's not a subharmonic
    // by checking if there's a stronger signal at 2x frequency
    if (bpm < 60) {
      const doubleFreq = peakFreq * 2;
      const freqResolution = frequencies[1] - frequencies[0];
      const doubleIndex = Math.round(doubleFreq / freqResolution);
      
      if (doubleIndex < magnitude.length && magnitude[doubleIndex] > peakMagnitude * 0.8) {
        // Likely detecting a subharmonic - reject
        if (Math.random() < 0.1) {
          console.log(`rPPG: HR rejected - BPM ${bpm} appears to be subharmonic (stronger signal at ${(doubleFreq * 60).toFixed(1)} BPM)`);
        }
        return null;
      }
    }

    // Log for debugging
    if (Math.random() < 0.1) { // Log ~10% of calculations to avoid spam
      console.log(`rPPG: HR calculation - freq: ${peakFreq.toFixed(3)} Hz, BPM: ${bpm}, SNR: ${snr.toFixed(2)}, variance: ${filteredVariance.toFixed(4)}`);
    }

    return Math.round(bpm);
  }

  /**
   * Calculate variance of signal
   */
  private calculateVariance(signal: number[]): number {
    if (signal.length < 2) return 0;
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    return variance;
  }

  /**
   * Calculate respiratory rate from signal
   */
  private calculateRespiratoryRate(signal: number[]): number | null {
    if (signal.length < this.config.minSamplesForAnalysis) {
      return null;
    }

    // Apply band-pass filter for respiratory rate band
    const filtered = this.bandPassFilter(
      signal,
      this.config.respiratoryRateBandMin,
      this.config.respiratoryRateBandMax,
      this.config.sampleRate
    );

    // Check filtered signal quality
    const filteredVariance = this.calculateVariance(filtered);
    if (filteredVariance < 0.01) {
      return null;
    }

    // Perform FFT
    const { magnitude, frequencies } = this.fft(filtered);

    // Find dominant peak in respiratory rate band with SNR check
    const { frequency: peakFreq, snr } = this.findDominantPeak(
      magnitude,
      frequencies,
      this.config.respiratoryRateBandMin,
      this.config.respiratoryRateBandMax
    );

    if (peakFreq === null || peakFreq < this.config.respiratoryRateBandMin) {
      return null;
    }

    // Convert Hz to breaths per minute
    const bpm = peakFreq * 60;
    
    // Sanity check: respiratory rate should be in reasonable range
    if (bpm < 6 || bpm > 40) {
      return null;
    }

    return Math.round(bpm);
  }

  // ==== NEW FEATURE: HRV Calculation ====
  /**
   * Detect peaks in filtered signal for HRV analysis
   */
  private detectPeaks(signal: number[]): number[] {
    const peaks: number[] = [];
    const threshold = 0.3; // Normalized threshold
    
    // Normalize signal
    const max = Math.max(...signal);
    const min = Math.min(...signal);
    const range = max - min;
    if (range === 0) return peaks;
    
    const normalized = signal.map(v => (v - min) / range);
    
    // Find local maxima above threshold
    for (let i = 2; i < normalized.length - 2; i++) {
      if (normalized[i] > threshold &&
          normalized[i] > normalized[i - 1] &&
          normalized[i] > normalized[i + 1] &&
          normalized[i] > normalized[i - 2] &&
          normalized[i] > normalized[i + 2]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  /**
   * Calculate HRV metrics from R-R intervals
   */
  private calculateHRV(): HRVMetrics | null {
    if (this.signalBuffer.length < this.config.minSamplesForAnalysis) {
      return null;
    }

    // Filter signal for heart rate band
    const filtered = this.bandPassFilter(
      this.signalBuffer,
      this.config.heartRateBandMin,
      this.config.heartRateBandMax,
      this.config.sampleRate
    );

    // Detect peaks
    const peaks = this.detectPeaks(filtered);
    
    if (peaks.length < 3) {
      return null;
    }

    // Calculate R-R intervals in milliseconds
    const rrIntervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const interval = (peaks[i] - peaks[i - 1]) / this.config.sampleRate * 1000;
      // Filter out unrealistic intervals (300-1500 ms = 40-200 BPM)
      if (interval >= 300 && interval <= 1500) {
        rrIntervals.push(interval);
      }
    }

    if (rrIntervals.length < 2) {
      return null;
    }

    // Calculate SDNN (Standard Deviation of NN intervals)
    const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const sdnn = Math.sqrt(
      rrIntervals.reduce((sum, rr) => sum + Math.pow(rr - meanRR, 2), 0) / rrIntervals.length
    );

    // Calculate RMSSD (Root Mean Square of Successive Differences)
    let sumSquaredDiff = 0;
    let diffCount = 0;
    let pnn50Count = 0;
    
    for (let i = 1; i < rrIntervals.length; i++) {
      const diff = Math.abs(rrIntervals[i] - rrIntervals[i - 1]);
      sumSquaredDiff += diff * diff;
      diffCount++;
      if (diff > 50) pnn50Count++;
    }

    const rmssd = diffCount > 0 ? Math.sqrt(sumSquaredDiff / diffCount) : 0;
    const pnn50 = diffCount > 0 ? (pnn50Count / diffCount) * 100 : 0;

    return {
      rmssd: Math.round(rmssd * 10) / 10,
      sdnn: Math.round(sdnn * 10) / 10,
      pnn50: Math.round(pnn50 * 10) / 10,
      meanRR: Math.round(meanRR)
    };
  }

  // ==== NEW FEATURE: Stress Level Estimation ====
  /**
   * Estimate stress level based on HRV metrics
   * Low HRV = High Stress, High HRV = Low Stress
   */
  private calculateStressLevel(hrv: HRVMetrics | null): { level: 'low' | 'moderate' | 'high' | null; index: number | null } {
    if (!hrv) {
      return { level: null, index: null };
    }

    // Stress index calculation based on RMSSD and SDNN
    // Lower HRV values indicate higher stress
    // Normal RMSSD: 20-50ms (relaxed), <20ms (stressed)
    // Normal SDNN: 50-100ms (healthy), <50ms (stressed)
    
    let stressScore = 0;
    
    // RMSSD contribution (40% weight)
    if (hrv.rmssd < 15) stressScore += 40;
    else if (hrv.rmssd < 25) stressScore += 30;
    else if (hrv.rmssd < 40) stressScore += 15;
    else stressScore += 5;
    
    // SDNN contribution (40% weight)
    if (hrv.sdnn < 30) stressScore += 40;
    else if (hrv.sdnn < 50) stressScore += 30;
    else if (hrv.sdnn < 80) stressScore += 15;
    else stressScore += 5;
    
    // PNN50 contribution (20% weight) - lower = more stress
    if (hrv.pnn50 < 3) stressScore += 20;
    else if (hrv.pnn50 < 10) stressScore += 15;
    else if (hrv.pnn50 < 25) stressScore += 8;
    else stressScore += 2;

    // Determine stress level
    let level: 'low' | 'moderate' | 'high';
    if (stressScore < 35) level = 'low';
    else if (stressScore < 65) level = 'moderate';
    else level = 'high';

    return { level, index: stressScore };
  }

  // ==== NEW FEATURE: SpO2 Estimation ====
  /**
   * Estimate blood oxygen saturation using red/blue channel ratio
   * Note: This is an estimation and should not be used for medical diagnosis
   */
  private estimateSpO2(): number | null {
    if (this.redChannelBuffer.length < this.config.minSamplesForAnalysis ||
        this.blueChannelBuffer.length < this.config.minSamplesForAnalysis) {
      return null;
    }

    // Calculate AC (pulsatile) and DC (baseline) components for red and blue
    const redMean = this.redChannelBuffer.reduce((a, b) => a + b, 0) / this.redChannelBuffer.length;
    const blueMean = this.blueChannelBuffer.reduce((a, b) => a + b, 0) / this.blueChannelBuffer.length;
    
    const redAC = Math.sqrt(this.calculateVariance(this.redChannelBuffer));
    const blueAC = Math.sqrt(this.calculateVariance(this.blueChannelBuffer));
    
    if (redMean === 0 || blueMean === 0 || redAC === 0) {
      return null;
    }

    // Ratio of ratios (simplified SpO2 estimation)
    // R = (AC_red / DC_red) / (AC_blue / DC_blue)
    const R = (redAC / redMean) / (blueAC / blueMean);
    
    // Empirical calibration curve (simplified)
    // SpO2 ≈ 110 - 25 * R (typical range for pulse oximetry)
    // This is a rough estimation - real SpO2 requires IR channel
    let spO2 = 110 - 25 * R;
    
    // Clamp to realistic range
    spO2 = Math.max(85, Math.min(100, spO2));
    
    // Add some noise rejection - only return if value is stable
    if (spO2 < 90 || spO2 > 100) {
      // Outside normal range - likely noise
      return null;
    }

    return Math.round(spO2);
  }

  // ==== NEW FEATURE: Signal Quality Assessment ====
  /**
   * Assess the quality of the rPPG signal
   */
  private assessSignalQuality(): 'poor' | 'fair' | 'good' | 'excellent' {
    if (this.signalBuffer.length < 30) {
      return 'poor';
    }

    // Calculate signal variance (should have some variation)
    const variance = this.calculateVariance(this.signalBuffer);
    
    // Calculate signal stability (std of recent samples)
    const recentSamples = this.signalBuffer.slice(-90); // Last 3 seconds
    const recentMean = recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length;
    const recentStd = Math.sqrt(
      recentSamples.reduce((sum, v) => sum + Math.pow(v - recentMean, 2), 0) / recentSamples.length
    );
    
    // Calculate coefficient of variation
    const cv = recentMean > 0 ? (recentStd / recentMean) * 100 : 100;
    
    // Assess quality based on variance and stability
    if (variance < 0.01 || cv > 10) {
      return 'poor';
    } else if (variance < 0.1 || cv > 5) {
      return 'fair';
    } else if (variance < 1 || cv > 2) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  // ==== NEW FEATURE: Waveform Data for Visualization ====
  /**
   * Get filtered signal data for real-time waveform visualization
   * Returns last 5 seconds of filtered signal (150 samples at 30 FPS)
   */
  private getWaveformData(): number[] {
    if (this.signalBuffer.length < 30) {
      return [];
    }

    // Get last 5 seconds of data
    const windowSize = Math.min(150, this.signalBuffer.length);
    const recentSignal = this.signalBuffer.slice(-windowSize);
    
    // Apply light filtering for visualization
    const filtered = this.detrend(recentSignal);
    
    // Normalize to -1 to 1 range for display
    const max = Math.max(...filtered.map(Math.abs));
    if (max === 0) return filtered;
    
    return filtered.map(v => v / max);
  }

  /**
   * Process signal and return current rPPG results
   */
  process(): RPPGResult {
    const now = Date.now();
    const samplesCollected = this.signalBuffer.length;

    // Determine status
    let status: RPPGResult['status'] = 'initializing';
    if (samplesCollected === 0) {
      status = 'initializing';
    } else if (samplesCollected < this.config.minSamplesForAnalysis) {
      status = 'collecting';
    } else {
      status = 'running';
    }

    // Only calculate if we have enough samples
    let heartRate: number | null = null;
    let pulseRate: number | null = null;
    let respiratoryRate: number | null = null;
    let hrv: HRVMetrics | null = null;
    let stressLevel: 'low' | 'moderate' | 'high' | null = null;
    let stressIndex: number | null = null;
    let spO2: number | null = null;

    if (samplesCollected >= this.config.minSamplesForAnalysis) {
      try {
        heartRate = this.calculateHeartRate(this.signalBuffer);
        pulseRate = heartRate; // For this project, pulse rate = heart rate
        respiratoryRate = this.calculateRespiratoryRate(this.signalBuffer);
        
        // ==== NEW FEATURES ====
        hrv = this.calculateHRV();
        const stress = this.calculateStressLevel(hrv);
        stressLevel = stress.level;
        stressIndex = stress.index;
        spO2 = this.estimateSpO2();
      } catch (error) {
        console.error('rPPG error: Failed to process signal', error);
        status = 'error';
      }
    }

    // Get signal quality and waveform data
    const signalQuality = this.assessSignalQuality();
    const waveformData = this.getWaveformData();

    // Update display at configured interval
    const shouldUpdate = now - this.lastUpdateTime >= this.config.updateInterval * 1000;
    if (shouldUpdate && status === 'running') {
      this.lastUpdateTime = now;
    }

    return {
      heartRate,
      pulseRate,
      respiratoryRate,
      status,
      samplesCollected,
      // ==== NEW FEATURES ====
      stressLevel,
      stressIndex,
      hrv,
      spO2,
      signalQuality,
      waveformData,
    };
  }

  /**
   * Reset the processor
   */
  reset(): void {
    this.signalBuffer = [];
    this.timestampBuffer = [];
    this.lastUpdateTime = 0;
    this.roiInitialized = false;
    this.roiStable = false;
    // ==== Reset new feature buffers ====
    this.redChannelBuffer = [];
    this.blueChannelBuffer = [];
    this.peakIndices = [];
    this.rrIntervals = [];
  }

  /**
   * Get current signal buffer length
   */
  getSampleCount(): number {
    return this.signalBuffer.length;
  }

  /**
   * Get signal statistics for debugging
   */
  getSignalStats(): { mean: number; std: number; min: number; max: number; variance: number } | null {
    if (this.signalBuffer.length === 0) return null;
    
    const mean = this.signalBuffer.reduce((a, b) => a + b, 0) / this.signalBuffer.length;
    const variance = this.calculateVariance(this.signalBuffer);
    const std = Math.sqrt(variance);
    const min = Math.min(...this.signalBuffer);
    const max = Math.max(...this.signalBuffer);
    
    return { mean, std, min, max, variance };
  }
}

// ==== rPPG END ====

