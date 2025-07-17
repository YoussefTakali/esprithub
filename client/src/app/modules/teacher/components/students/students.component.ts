import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { StudentDataService } from '../../services/student-data.service';
import { calculateStudentProjectGradeFromSubmissions, StudentGradeInfo, StudentSubmission } from './student-grade.util';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

interface Student {
  id: string;
  studentId?: string;
  _id?: string;
  name?: string;
  nom?: string;
  prenom?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Group {
  id: string;
  name: string;
  studentIds: string[];
  memberIds?: string[]; // Keep for backward compatibility
  members?: Student[];
  projectId?: string;
  projectName?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  classIds?: string[];
  collaboratorIds?: string[];
}

interface ClassWithStudents {
  classId: string;
  className: string;
  students: Student[];
  groups?: Group[];
  projects?: Project[];
}

interface StudentProjectGroup {
  projectId: string;
  projectName: string;
  groupId: string;
  groupName: string;
  classId: string;
  className: string;
}

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css']
})
export class StudentsComponent implements OnInit {
  classesWithStudents: ClassWithStudents[] = [];
  loading = true;
  error: string | null = null;
  myProjects: Project[] = [];

  showStudentModal = false;
  selectedStudent: Student | null = null;
  studentProjects: StudentGradeInfo[] = [];
  totalGrade: number | null = null;
  selectedStudentGroups: StudentProjectGroup[] = [];

  constructor(
    private readonly teacherData: TeacherDataService,
    private readonly studentData: StudentDataService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    // First, get all projects (created or collaborated)
    this.teacherData.getMyProjects().subscribe({
      next: (projects: Project[]) => {
        this.myProjects = projects || [];
        this.loadClassesWithStudents();
      },
      error: (err) => {
        this.error = 'Failed to load projects.';
        this.loading = false;
      }
    });
  }

  private loadClassesWithStudents(): void {
    this.teacherData.getMyClassesWithCourses().subscribe({
      next: (classes: any[]) => {
        if (!classes || classes.length === 0) {
          this.loading = false;
          return;
        }

        const classRequests = classes.map(classe => 
          this.teacherData.getStudentsByClassId(classe.classId).pipe(
            switchMap(students => {
              // For each class, get all groups from all my projects
              const groupRequests = this.myProjects.map(project => 
                this.teacherData.getGroupsByProjectAndClass(project.id, classe.classId).pipe(
                  catchError(() => of([])) // If error, return empty array
                )
              );

              return forkJoin(groupRequests).pipe(
                switchMap(groupArrays => {
                  // Flatten groups and add project information
                  const allGroups: Group[] = [];
                  groupArrays.forEach((groups, index) => {
                    if (groups && groups.length > 0) {
                      const projectGroups = groups.map(group => ({
                        ...group,
                        projectId: this.myProjects[index].id,
                        projectName: this.myProjects[index].name
                      }));
                      allGroups.push(...projectGroups);
                    }
                  });

                  return of({
                    classId: classe.classId,
                    className: classe.className,
                    students: students || [],
                    groups: allGroups,
                    projects: this.myProjects.filter(p => 
                      p.classIds?.includes(classe.classId) || 
                      allGroups.some(g => g.projectId === p.id)
                    )
                  });
                })
              );
            }),
            catchError(() => of({
              classId: classe.classId,
              className: classe.className,
              students: [],
              groups: [],
              projects: []
            }))
          )
        );

        forkJoin(classRequests).subscribe({
          next: (classesWithStudents) => {
            this.classesWithStudents = classesWithStudents;
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load classes and students.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to load classes.';
        this.loading = false;
      }
    });
  }

  // Removed group-related methods since we're showing students directly

  openStudentModal(student: Student) {
    const studentId: string = student.id ?? student.studentId ?? student._id ?? '';
    if (!studentId) return;

    // Use the student data we already have instead of making an additional API call
    // that requires higher privileges
    this.selectedStudent = student;
    if (this.selectedStudent) {
      this.loadStudentGroupsAndGrades(this.selectedStudent);
    }
    this.showStudentModal = true;
  }

  private loadStudentGroupsAndGrades(student: Student): void {
    this.selectedStudentGroups = [];
    this.studentProjects = [];
    this.totalGrade = null;

    // Collect all groups the student is in from all classes
    this.classesWithStudents.forEach(classItem => {
      if (classItem.groups) {
        classItem.groups.forEach(group => {
          const memberIds = group.studentIds || group.memberIds || [];
          if (memberIds.includes(student.id)) {
            this.selectedStudentGroups.push({
              projectId: group.projectId || '',
              projectName: group.projectName || '',
              groupId: group.id,
              groupName: group.name,
              classId: classItem.classId,
              className: classItem.className
            });
          }
        });
      }
    });

    // Load grades for each project the student is involved in
    this.loadStudentGrades(student);
  }

  private loadStudentGrades(student: Student): void {
    if (this.selectedStudentGroups.length === 0) return;

    const studentId = student.id ?? student.studentId ?? student._id ?? '';
    if (!studentId) return;

    const gradeRequests = this.selectedStudentGroups.map(studentGroup =>
      this.teacherData.getSubmissionsForProject(studentGroup.projectId).pipe(
        switchMap(submissions => {
          // Calculate grades using the enhanced method that handles individual tasks
          const gradeInfo = calculateStudentProjectGradeFromSubmissions(
            studentId,
            studentGroup.groupId,
            submissions as StudentSubmission[]
          );

          // Set the project and group names
          gradeInfo.groupName = studentGroup.groupName;
          gradeInfo.projectName = studentGroup.projectName;

          return of(gradeInfo);
        }),
        catchError(() => of({
          groupName: studentGroup.groupName,
          projectName: studentGroup.projectName,
          grade: 0,
          gradedTasks: 0,
          totalTasks: 0,
          individualGrade: 0,
          groupGrade: 0,
          individualTasksCount: 0,
          groupTasksCount: 0,
          taskBreakdown: []
        } as StudentGradeInfo))
      )
    );

    forkJoin(gradeRequests).subscribe({
      next: (projectGrades) => {
        this.studentProjects = projectGrades;

        // Calculate total grade - average of all project grades where student has graded tasks
        const validGrades = projectGrades.filter(p => p.gradedTasks > 0);
        if (validGrades.length > 0) {
          const totalGradeSum = validGrades.reduce((sum, p) => sum + p.grade, 0);
          this.totalGrade = Math.round((totalGradeSum / validGrades.length) * 100) / 100;
        } else {
          this.totalGrade = null;
        }
      },
      error: () => {
        this.studentProjects = [];
        this.totalGrade = null;
      }
    });
  }

  closeStudentModal() {
    this.showStudentModal = false;
    this.selectedStudent = null;
    this.selectedStudentGroups = [];
    this.studentProjects = [];
    this.totalGrade = null;
  }

  // Helper methods for template
  getStudentDisplayName(student: Student): string {
    if (student.nom && student.prenom) {
      return `${student.nom} ${student.prenom}`;
    }
    if (student.firstName && student.nom) {
      return `${student.nom} ${student.firstName}`;
    }
    return student.name || student.email || 'Unknown';
  }

  // Removed hasStudentsInGroups method since we're showing students directly
}