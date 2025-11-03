export interface IMark {
  date: string;
  cornerText?: string;
}
export interface MkCalendarV3Props {
  mark1: IMark[];
  mark2: IMark[];
  showWeekNumber: boolean;
  style: {
    backgroundColor: string;
    todayColor: string;
    textColor: string;
    borderRadius: number;
    mark1BackgroundColor: string;
    mark1TextColor: string;
    mark1CornerBackgroundColor: string;
    mark1CornerTextColor: string;
    mark2BackgroundColor: string;
    mark2TextColor: string;
    mark2CornerBackgroundColor: string;
    mark2CornerTextColor: string;
    visibleWeeks: number;
  };
}
