import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function HomePage() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/assets')
      .then((res) => res.json())
      .then((data) => setAssets(data));
  }, []);

  const chartData = {
    labels: ['Critical', 'Warning', 'Healthy'],
    datasets: [
      {
        label: 'Predictive Risk',
        data: [42, 28, 30],
        backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Intelligent IT Asset Management</h1>
            <p className="text-slate-400">QR tracking, predictive maintenance, and agentic workflows</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2">Role: Admin</div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Assets Managed</p>
            <p className="text-2xl font-semibold">{assets.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Service Requests</p>
            <p className="text-2xl font-semibold">12</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Predicted Failures</p>
            <p className="text-2xl font-semibold">3</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Recent Assets</h2>
            <ul className="space-y-3">
              {assets.map((asset) => (
                <li key={asset.id} className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                  <span>{asset.name}</span>
                  <span className="text-sm text-slate-400">{asset.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Predictive Dashboard</h2>
            <Bar data={chartData} options={{ responsive: true }} />
          </div>
        </section>
      </div>
    </main>
  );
}
