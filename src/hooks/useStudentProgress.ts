// ============================================================================
// useStudentProgress.ts — Hook tính toán tiến độ tổng hợp
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { ProgressData, Goal, PlanTask, SessionLog } from '../types';
import { fetchStudentProgressData, calculateProgress } from '../services/progressService';
import { getStudentGoals } from '../services/planService';

export function useStudentProgress(studentId: string | undefined) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [journals, setJournals] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!studentId) {
      setProgress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, studentGoals] = await Promise.all([
        fetchStudentProgressData(studentId),
        getStudentGoals(studentId),
      ]);
      setGoals(studentGoals);
      setTasks(data.tasks);
      setJournals(data.journals);

      const calculated = calculateProgress(data.tasks, studentGoals, data.journals);
      setProgress(calculated);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thống kê tiến độ.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    progress,
    goals,
    tasks,
    journals,
    loading,
    error,
    reload,
  };
}

