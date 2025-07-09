'use client';

import { useState, useRef, useEffect } from 'react';
import DrowsinessDetector from '@/components/drowsiness-detector';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <DrowsinessDetector />
    </div>
  );
}
