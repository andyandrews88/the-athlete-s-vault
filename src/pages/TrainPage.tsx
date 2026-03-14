import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogTab } from '@/components/train/LogTab';
import { AnalyticsTab } from '@/components/train/AnalyticsTab';
import { CalendarTab } from '@/components/train/CalendarTab';
import { PrsTab } from '@/components/train/PrsTab';

const TrainPage = () => {
  const [activeTab, setActiveTab] = useState('log');

  return (
    <div className="min-h-screen bg-background pt-16 pb-20 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 bg-vault-bg2 border border-border rounded-lg h-10">
          <TabsTrigger value="log" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">LOG</TabsTrigger>
          <TabsTrigger value="analytics" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">ANALYTICS</TabsTrigger>
          <TabsTrigger value="calendar" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CALENDAR</TabsTrigger>
          <TabsTrigger value="prs" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">PRS</TabsTrigger>
        </TabsList>

        <TabsContent value="log"><LogTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="prs"><PrsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainPage;
