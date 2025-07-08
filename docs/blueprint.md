# **App Name**: Vigilance AI

## Core Features:

- Drowsiness Detection: Real-time display of blink count, blink duration, yawn count, and yawn duration metrics derived from webcam video. Use of thresholds crossed clearly highlighted.
- Drowsiness Analysis: Calculate Eye Aspect Ratio (EAR) and Mouth Aspect Ratio (MAR) from webcam video using Mediapipe. Use these ratios, blink rate and yawn rate to estimate drowsiness, leveraging an LLM as a tool to determine whether these factors indicate drowsiness, or, if there are confounding circumstances that change the interpretation.
- Drowsiness Visualization: Display a clear, real-time updating graph of drowsiness estimation over time. Offer the ability to export data to CSV format.
- Alerting System: Provide visual alerts on the screen and, optionally, audible alerts (beep) to indicate drowsiness based on defined thresholds.
- Threshold customization: Allow users to adjust the thresholds that trigger the alerts, to increase the tool's personalization.
- User-specific calibration: Provide a function to calibrate the blink/yawn EAR & MAR values per user at session start to allow for better customization of the tool and accurate measurement.

## Style Guidelines:

- Primary color: Analogous green (#7CFC00) evokes the concepts of safety, attention, and forward-thinking alertness. Use this as the primary tone for all user-generated displays, especially charts.
- Background color: A very desaturated shade of the primary green (#E0F8E0) will fill the background, ensuring comfortable contrast with all page elements.
- Accent color: The analogous color, yellow (#BFFF00) will be used on selected UI elements such as graphs.
- Body and headline font: 'Inter', a sans-serif font, giving a clean, neutral, and readable appearance for data display.
- Use clear, simple icons for controls such as start, stop, pause, and settings to aid in intuitive navigation.
- Implement subtle animations (e.g., a growing opacity when alerts are triggered), so as not to distract from core readings.