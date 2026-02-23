import React from 'react';
import moment from 'jalali-moment';
import type { ActivityItem } from '../../../types';
import type { DashboardWidgetProps } from '../types';

export default function RecentActivitiesWidget({ ctx, container }: DashboardWidgetProps) {
  const w = container.width || 0;
  const compact = w > 0 && w < 460;
  const pad = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const itemPad = compact ? 'p-2.5' : 'p-3';
  const avatar = compact ? 'w-9 h-9' : 'w-10 h-10';
  const titleCls = compact ? 'text-[12px]' : 'text-sm';
  const subCls = compact ? 'text-[11px]' : 'text-xs';
  const timeCls = compact ? 'text-[10px]' : 'text-[11px]';
  const activities = ctx.dashboardData?.recentActivities || [];

  const formatActivityTimestamp = (isoTimestamp: string) => moment(isoTimestamp).locale('fa').fromNow();

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className={["flex items-center justify-between border-b border-gray-200 dark:border-gray-700 text-right", pad].join(' ')}>
        <h3 className={[compact ? 'text-xs' : 'text-sm', 'font-bold text-gray-800 dark:text-gray-200'].join(' ')}>فعالیت‌های اخیر</h3>
      </div>

      <div className="flex-1 overflow-auto">
        {ctx.showLoadingSkeletons ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <i className="fas fa-spinner fa-spin text-xl ml-2" /> در حال بارگذاری فعالیت‌ها...
          </div>
        ) : activities.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity: ActivityItem) => (
              <li key={activity.id} className={[itemPad, 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'].join(' ')}>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 ${avatar} rounded-full flex items-center justify-center ${
                      activity.color || 'bg-gray-200'
                    }`}
                  >
                    <i className={`${activity.icon} text-white ${compact ? 'text-base' : 'text-lg'}`} />
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <p className={[titleCls, 'font-semibold text-gray-900 dark:text-gray-100'].join(' ')}>{activity.typeDescription}</p>
                    <p className={[subCls, 'text-gray-500 dark:text-gray-400 truncate'].join(' ')}>{activity.details}</p>
                  </div>

                  <div className={[timeCls, 'text-gray-400 dark:text-gray-500 whitespace-nowrap'].join(' ')}>
                    {formatActivityTimestamp(activity.timestamp)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {!ctx.token && ctx.authReady ? 'برای مشاهده فعالیت‌ها، لطفاً ابتدا وارد شوید.' : 'فعالیت اخیری برای نمایش وجود ندارد.'}
          </div>
        )}
      </div>
    </div>
  );
}
