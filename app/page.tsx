import HomeHeader from "./components/HomeHeader";
import AngryStudio from "./components/AngryStudio";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <HomeHeader />
      <main className="mx-auto w-full max-w-[90rem] px-5 pb-12 pt-5 sm:px-8">
        <AngryStudio />
      </main>
    </div>
  );
}
