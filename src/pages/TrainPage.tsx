import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogTab } from '@/components/train/LogTab';
import { AnalyticsTab } from '@/components/train/AnalyticsTab';
import { CalendarTab } from '@/components/train/CalendarTab';
import { useIsMobile } from '@/hooks/use-mobile';

const TrainPage = () => {
  const isMobile = useIsMobile();
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
          <TabsList
            className="flex w-full h-auto mb-5"
            style={{
              background: 'hsl(var(--bg3))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 7,
              padding: 2,
              gap: 2,
            }}
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 transition-all"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: isMobile ? 11 : 12,
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  padding: '10px 0',
                  borderRadius: 5,
                  fontWeight: activeTab === tab.value ? 700 : 400,
                  background: activeTab === tab.value ? 'hsl(var(--primary))' : 'transparent',
                  color: activeTab === tab.value ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                }}
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
