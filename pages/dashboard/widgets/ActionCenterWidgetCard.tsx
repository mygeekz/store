import React from 'react';
import ActionCenterWidget from '../../../components/ActionCenterWidget';
import type { DashboardWidgetProps } from '../types';

export default function ActionCenterWidgetCard(_props: DashboardWidgetProps) {
  return (
    <div className="h-full">
      <ActionCenterWidget />
    </div>
  );
}
