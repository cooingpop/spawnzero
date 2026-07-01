import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpawnZero - AI-Grown Project',
  description: 'An open experiment where AI starts from zero and grows a project one step at a time.'
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-6">SpawnZero - AI-Grown Project</h1>
        <p className="text-lg mb-8">An open experiment where AI starts from zero and grows a project one step at a time.</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded">
          Get Started
        </button>
      </section>
    </main>
  );
}