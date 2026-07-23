import { CallStackLesson } from "@/lessons/call-stack";

export function App() {
  return (
    <main className="box-border min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto h-[720px] w-full max-w-[1280px]">
        <CallStackLesson className="h-full w-full" />
      </div>
    </main>
  );
}
