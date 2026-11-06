'use client';

import React from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardMetricsGrid from '@/components/dashboard/DashboardMetricsGrid';
import StorageTanksSection from '@/components/dashboard/StorageTanksSection';
import ShiftSummaryCard from '@/components/dashboard/ShiftSummaryCard';
import RecentTransactionsTable from '@/components/dashboard/RecentTransactionsTable';

export default function SummaryDashboardPage() {
  return (
    <div className="space-y-5">
      {/* 1. Header with Title, Live Telemetry Badge, Google Sheets, & Export Excel */}
      <DashboardHeader />

      {/* 2. Key Operational Metrics Bar (5 High-Density KPI Cards) */}
      <DashboardMetricsGrid />

      {/* 3. Core Operational Telemetry (Storage Tanks & Shift Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <StorageTanksSection />
        <ShiftSummaryCard />
      </div>

      {/* 4. Live Refuelling Log Table with Local Search Filter */}
      <RecentTransactionsTable />
    </div>
  );
}
