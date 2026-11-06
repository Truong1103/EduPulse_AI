// ============================================================================
// useCalendar.ts — Hook tải và quản lý lịch học tập
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TodayTask, CalendarDay } from '../types';
import { getTasksByDateRange } from '../services/taskService';

export function useCalendar(studentId: string | undefined, currentMonth: Date) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tính ngày đầu và cuối tháng (kèm lề)
  const dateRange = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const start = new Date(year, month, 1);
    start.setDate(start.getDate() - 7); // lề trước 7 ngày

    const end = new Date(year, month + 1, 0);
    end.setDate(end.getDate() + 7); // lề sau 7 ngày

    return {
      startDate: start.toLocaleDateString('sv-SE'),
      endDate: end.toLocaleDateString('sv-SE'),
    };
  }, [currentMonth]);

  const reload = useCallback(async () => {
    if (!studentId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getTasksByDateRange(studentId, dateRange.startDate, dateRange.endDate);
      setTasks(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu lịch.');
    } finally {
      setLoading(false);
    }
  }, [studentId, dateRange]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Gom nhóm task theo ngày (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TodayTask[]>();
    for (const task of tasks) {
      if (task.dueDate) {
        const current = map.get(task.dueDate) || [];
        current.push(task);
        map.set(task.dueDate, current);
      }
    }
    return map;
  }, [tasks]);

  return {
    tasks,
    tasksByDate,
    loading,
    error,
    reload,
  };
}

