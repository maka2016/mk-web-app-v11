import { ChevronRight } from 'lucide-react';

interface StatItemProps {
  label: string;
  value: string | number;
  clickable?: boolean;
  onClick?: () => void;
}

function StatItem({ label, value, clickable, onClick }: StatItemProps) {
  return (
    <div
      className='flex flex-col items-center gap-1.5 flex-1'
      onClick={onClick}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <div className='flex items-center gap-1'>
        <p className='text-xs font-semibold text-[#90a1b9]'>{label}</p>
        {clickable && <ChevronRight size={12} className='text-[#90a1b9]' />}
      </div>
      <p
        className={`text-2xl font-bold ${
          clickable ? 'text-[#155dfc]' : 'text-[#0f172b]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

interface StatsCardProps {
  totalViews?: number;
  totalVisitors?: number;
  exclusiveInvites?: number;
  formSubmissions?: number;
  onExclusiveInvitesClick?: () => void;
  onFormSubmissionsClick?: () => void;
}

export function StatsCard({
  totalViews = 0,
  totalVisitors = 0,
  exclusiveInvites = 0,
  formSubmissions = 0,
  onExclusiveInvitesClick,
  onFormSubmissionsClick,
}: StatsCardProps) {
  return (
    <div className='bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm'>
      <div className='flex items-center gap-8'>
        {/* <StatItem label='总浏览量' value={totalViews} />
        <StatItem label='总访客量' value={totalVisitors} /> */}
        <StatItem
          label='专属邀请'
          value={exclusiveInvites}
          clickable={true}
          onClick={onExclusiveInvitesClick}
        />
        <StatItem
          label='表单收集数'
          value={formSubmissions}
          clickable={true}
          onClick={onFormSubmissionsClick}
        />
      </div>
    </div>
  );
}
