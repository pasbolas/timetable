import { useState, useEffect } from "react";
import moment from "moment-timezone";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";

export function useLiveTime() {
  const [currentTime, setCurrentTime] = useState<moment.Moment>(() =>
    moment().tz(TIMETABLE_CONFIG.timezone)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(moment().tz(TIMETABLE_CONFIG.timezone));
    }, 15000); // 15s refresh interval

    return () => clearInterval(interval);
  }, []);

  const isToday = (dayMoment: moment.Moment): boolean => {
    return currentTime.format("YYYY-MM-DD") === dayMoment.format("YYYY-MM-DD");
  };

  const isLessonActive = (start: moment.Moment, end: moment.Moment): boolean => {
    return currentTime.isBetween(start, end, undefined, "[)");
  };

  const isLessonPast = (end: moment.Moment): boolean => {
    return currentTime.isAfter(end);
  };

  return {
    currentTime,
    isToday,
    isLessonActive,
    isLessonPast,
  };
}
