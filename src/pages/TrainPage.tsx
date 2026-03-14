import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogTab } from '@/components/train/LogTab';
import { AnalyticsTab } from '@/components/train/AnalyticsTab';
import { CalendarTab } from '@/components/train/CalendarTab';

const TrainPage = () => {
  const [activeTab, setActiveTab] = useState('log');

  return (
    <div className="min-h-screen bg-background pt-16 pb-20 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-card border border-border rounded-lg h-10">
          <TabsTrigger value="log" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Log Workout</TabsTrigger>
          <TabsTrigger value="calendar" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Calendar</TabsTrigger>
          <TabsTrigger value="analytics" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="log"><LogTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainPage;
