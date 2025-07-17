export interface StudentGradeInfo {
  groupName: string;
  projectName: string;
  grade: number;
  gradedTasks: number;
  totalTasks: number;
  individualGrade?: number;
  groupGrade?: number;
  individualTasksCount?: number;
  groupTasksCount?: number;
  taskBreakdown?: TaskGradeBreakdown[];
}

export interface TaskGradeBreakdown {
  taskId: string;
  taskTitle: string;
  taskType: 'INDIVIDUAL' | 'GROUP' | 'PROJECT' | 'CLASSE';
  grade: number | null;
  maxGrade: number;
  isGraded: boolean;
  submissionId?: string;
}

export interface StudentSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: string;
  taskGraded: boolean;
  userId: string;
  groupId?: string;
  grade?: number;
  maxGrade?: number;
  isGraded: boolean;
  status: string;
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

// Helper function to convert grade from 100-scale to 20-scale
function convertGradeTo20Scale(grade: number | null | undefined, maxGrade: number | null | undefined = 100): number {
  if (grade === null || grade === undefined) return 0;
  const max = maxGrade || 100;
  return (grade / max) * 20;
}

// Helper function to normalize task type (backend sends different values)
function normalizeTaskType(taskType: string): string {
  switch (taskType.toUpperCase()) {
    case 'INDIVIDUAL': return 'INDIVIDUAL';
    case 'GROUP': return 'GROUP';
    case 'PROJECT': return 'PROJECT';
    case 'CLASSE':
    case 'CLASS': return 'CLASSE';
    default: return taskType;
  }
}

export function calculateStudentProjectGradeFromSubmissions(
  studentId: string,
  groupId: string | null,
  submissions: StudentSubmission[]
): StudentGradeInfo {
  console.log('Calculating grades for student:', studentId, 'group:', groupId);
  console.log('Submissions received:', submissions);

  // Filter submissions relevant to this student
  const relevantSubmissions = submissions.filter(sub => {
    const normalizedType = normalizeTaskType(sub.taskType);

    // For individual tasks, check if submission belongs to the student
    if (normalizedType === 'INDIVIDUAL') {
      return sub.userId === studentId;
    }
    // For group tasks, check if submission belongs to the student's group
    else if (normalizedType === 'GROUP' || normalizedType === 'PROJECT' || normalizedType === 'CLASSE') {
      return sub.groupId === groupId;
    }
    return false;
  });

  console.log('Relevant submissions:', relevantSubmissions);

  // Separate individual and group tasks
  const individualSubmissions = relevantSubmissions.filter(sub =>
    normalizeTaskType(sub.taskType) === 'INDIVIDUAL'
  );
  const groupSubmissions = relevantSubmissions.filter(sub => {
    const normalizedType = normalizeTaskType(sub.taskType);
    return normalizedType === 'GROUP' || normalizedType === 'PROJECT' || normalizedType === 'CLASSE';
  });

  console.log('Individual submissions:', individualSubmissions);
  console.log('Group submissions:', groupSubmissions);

  // Calculate individual task grades (convert to 20-scale)
  const gradedIndividualTasks = individualSubmissions.filter(sub => sub.isGraded && sub.grade !== null);
  const individualGrade = gradedIndividualTasks.length > 0
    ? gradedIndividualTasks.reduce((sum, sub) => sum + convertGradeTo20Scale(sub.grade, sub.maxGrade), 0) / gradedIndividualTasks.length
    : 0;

  // Calculate group task grades (convert to 20-scale)
  const gradedGroupTasks = groupSubmissions.filter(sub => sub.isGraded && sub.grade !== null);
  const groupGrade = gradedGroupTasks.length > 0
    ? gradedGroupTasks.reduce((sum, sub) => sum + convertGradeTo20Scale(sub.grade, sub.maxGrade), 0) / gradedGroupTasks.length
    : 0;

  console.log('Individual grade:', individualGrade, 'Group grade:', groupGrade);

  // Calculate overall grade
  const totalGradedTasks = gradedIndividualTasks.length + gradedGroupTasks.length;
  const totalTasks = individualSubmissions.length + groupSubmissions.length;

  let overallGrade = 0;
  if (totalGradedTasks > 0) {
    const individualWeight = gradedIndividualTasks.length / totalGradedTasks;
    const groupWeight = gradedGroupTasks.length / totalGradedTasks;
    overallGrade = (individualGrade * individualWeight) + (groupGrade * groupWeight);
  }

  console.log('Overall grade calculated:', overallGrade);

  // Create task breakdown with converted grades
  const taskBreakdown: TaskGradeBreakdown[] = relevantSubmissions.map(sub => ({
    taskId: sub.taskId,
    taskTitle: sub.taskTitle,
    taskType: normalizeTaskType(sub.taskType) as 'INDIVIDUAL' | 'GROUP' | 'PROJECT' | 'CLASSE',
    grade: sub.isGraded && sub.grade !== null ? convertGradeTo20Scale(sub.grade, sub.maxGrade) : null,
    maxGrade: 20, // Always 20 for display
    isGraded: sub.isGraded,
    submissionId: sub.id
  }));

  console.log('Task breakdown:', taskBreakdown);

  return {
    groupName: '', // Will be set by caller
    projectName: '', // Will be set by caller
    grade: Math.round(overallGrade * 100) / 100,
    gradedTasks: totalGradedTasks,
    totalTasks: totalTasks,
    individualGrade: Math.round(individualGrade * 100) / 100,
    groupGrade: Math.round(groupGrade * 100) / 100,
    individualTasksCount: individualSubmissions.length,
    groupTasksCount: groupSubmissions.length,
    taskBreakdown
  };
}
