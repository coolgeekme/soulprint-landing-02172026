declare module 'google-trends-api' {
  interface DailyTrendsOptions {
    trendDate?: Date;
    geo?: string;
  }

  interface RealTimeTrendsOptions {
    geo?: string;
    category?: string;
  }

  interface InterestOverTimeOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
  }

  function dailyTrends(options?: DailyTrendsOptions): Promise<string>;
  function realTimeTrends(options?: RealTimeTrendsOptions): Promise<string>;
  function interestOverTime(options?: InterestOverTimeOptions): Promise<string>;

  export { dailyTrends, realTimeTrends, interestOverTime };
}
