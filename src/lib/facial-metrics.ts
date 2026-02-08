// These are landmarks for the FaceMesh model from MediaPipe.
// https://developers.google.com/mediapipe/solutions/vision/face_landmarker

// Landmark indices for the right eye
export const RIGHT_EYE_LANDMARKS = [
  362, // p1: right corner
  385, // p2: top
  387, // p3: top
  263, // p4: left corner
  373, // p5: bottom
  380, // p6: bottom
];

// Landmark indices for the left eye
export const LEFT_EYE_LANDMARKS = [
  33,  // p1: right corner
  160, // p2: top
  158, // p3: top
  133, // p4: left corner
  153, // p5: bottom
  144, // p6: bottom
];

// Landmark indices for the mouth
// Using inner lip landmarks for robust MAR calculation
export const MOUTH_LANDMARKS = [
  61, // Left corner
  291, // Right corner
  0,  // Top lip center
  17, // Bottom lip center
];

interface Point {
    x: number;
    y: number;
    z: number;
}

// Function to calculate the Euclidean distance between two points in 2D space
function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Function to calculate the Eye Aspect Ratio (EAR)
export function calculateEAR(eyeLandmarks: Point[]): number {
  // Based on the formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
  const p1 = eyeLandmarks[0];
  const p2 = eyeLandmarks[1];
  const p3 = eyeLandmarks[2];
  const p4 = eyeLandmarks[3];
  const p5 = eyeLandmarks[4];
  const p6 = eyeLandmarks[5];

  const verticalDist1 = calculateDistance(p2, p6);
  const verticalDist2 = calculateDistance(p3, p5);
  const horizontalDist = calculateDistance(p1, p4);

  if (horizontalDist === 0) {
    return 0;
  }

  const ear = (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  return ear;
}

// Function to calculate the Mouth Aspect Ratio (MAR)
export function calculateMAR(mouthLandmarks: Point[]): number {
  // Simplified MAR: vertical opening / horizontal opening
  const p1 = mouthLandmarks[0]; // left corner
  const p2 = mouthLandmarks[1]; // right corner
  const p3 = mouthLandmarks[2]; // top lip
  const p4 = mouthLandmarks[3]; // bottom lip

  const verticalDist = calculateDistance(p3, p4);
  const horizontalDist = calculateDistance(p1, p2);

  if (horizontalDist === 0) {
    return 0;
  }

  const mar = verticalDist / horizontalDist;
  return mar;
}
