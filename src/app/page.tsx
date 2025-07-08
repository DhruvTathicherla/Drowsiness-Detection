import DrowsinessDetector from '@/components/drowsiness-detector';
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <DrowsinessDetector />
      </main>
      <Toaster />
    </>
  );
}
