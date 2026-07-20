import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { FileBarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-wide text-white">Compliance Reports</h2>
              <p className="text-gray-400 mt-1">Exportable incident summaries for NERC CIP and SOC 2.</p>
            </div>
          </div>

          <GlassPanel icon={<FileBarChart className="w-5 h-5" />} title="Reporting module">
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <FileBarChart className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg mb-2 text-gray-300">Reporting Engine Offline</p>
              <p className="text-sm text-center max-w-md">
                The compliance export module is currently disabled in this demo environment. In production, this would generate PDF/CSV reports of all actions taken by the autonomous agents.
              </p>
            </div>
          </GlassPanel>

        </div>
      </div>
    </div>
  );
}
