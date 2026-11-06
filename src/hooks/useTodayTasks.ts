// ============================================================================
// useTodayTasks.ts — Hook tải và quản lý công việc hôm nay
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TodayTask, PlanTask } from '../types';
import { getTodayTasks, toggleTaskCompletion, deleteTask, updateTask } from '../services/taskService';
import { calculateStreak } from '../services/progressService';

export function useTodayTasks(studentId: string | undefined) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [allStudentTasks, setAllStudentTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!studentId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const todayTasks = await getTodayTasks(studentId);
      setTasks(todayTasks);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải công việc hôm nay.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Đánh dấu hoàn thành
  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    // Cập nhật optimistic
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: nextCompleted,
              status: nextCompleted ? 'completed' : 'not_started',
              completedAt: nextCompleted ? new Date().toISOString() : undefined,
            }
          : t
      )
    );

    try {
      await toggleTaskCompletion(taskId, nextCompleted);
    } catch (err: any) {
      // Revert nếu lỗi
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t))
      );
      throw err;
    }
  };

  // Xóa nhiệm vụ
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(taskId);
    } catch (err: any) {
      await reload();
      throw err;
    }
  };

  // Cập nhật nhiệm vụ
  const handleUpdateTask = async (taskId: string, updates: Partial<PlanTask>) => {
    await updateTask(taskId, updates);
    await reload();
  };

  // Thống kê tiến độ ngày hôm nay
  const dailyProgress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const uncompleted = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, uncompleted, percentage };
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    reload,
    toggleTask: handleToggleTask,
    deleteTask: handleDeleteTask,
    updateTask: handleUpdateTask,
    dailyProgress,
  };
}

