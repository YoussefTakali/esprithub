export interface StudentGradeInfo {
  groupName: string;
  projectName: string;
  grade: number;
  gradedTasks: number;
  totalTasks: number;
}

export function calculateStudentProjectGrade(tasks: any[]): { grade: number, gradedTasks: number, totalTasks: number } {
  const graded = tasks.filter(t => t.grade !== null && t.grade !== undefined);
  const totalGrade = graded.reduce((sum, t) => sum + t.grade, 0);
  const gradedTasks = graded.length;
  return {
    grade: gradedTasks > 0 ? Math.round((totalGrade / gradedTasks) * 100) / 100 : 0,
    gradedTasks,
    totalTasks: tasks.length
  };
}
