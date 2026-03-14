import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogTab } from '@/components/train/LogTab';
import { AnalyticsTab } from '@/components/train/AnalyticsTab';
import { CalendarTab } from '@/components/train/CalendarTab';

const TrainPage = () => {
  const [activeTab, setActiveTab] = useState('log');

  const tabs = [
    { value: 'log', label: 'Log Workout' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-24">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4">
          <TabsList className="flex w-full bg-vault-bg3 border border-vault-border rounded-xl p-1 mb-5 h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`flex-1 font-mono text-[10px] uppercase tracking-widest py-2.5 rounded-lg transition-all ${
                  activeTab === tab.value
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-vault-dim bg-transparent'
                }`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="log"><LogTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainPage;
