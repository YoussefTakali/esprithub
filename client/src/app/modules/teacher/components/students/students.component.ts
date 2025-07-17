import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { calculateStudentProjectGrade, StudentGradeInfo } from './student-grade.util';

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
  memberIds: string[];
  members?: Student[];
}

interface ClassWithStudents {
  classId: string;
  className: string;
  students: Student[];
  groups?: Group[];
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

  showStudentModal = false;
  selectedStudent: Student | null = null;
  studentProjects: StudentGradeInfo[] = [];
  totalGrade: number | null = null;

  constructor(private readonly teacherData: TeacherDataService) {}

  ngOnInit(): void {
    this.teacherData.getMyClassesWithCourses().subscribe({
      next: (classes: any[]) => {
        if (!classes || classes.length === 0) {
          this.loading = false;
          return;
        }
        let loaded = 0;
        classes.forEach((classe: any) => {
          this.teacherData.getStudentsByClassId(classe.classId).subscribe({
            next: (students: Student[]) => {
              // Use projectId from classe if available, fallback to null
              const projectId = classe.projectId || classe.id || null;
              if (!projectId) {
                this.classesWithStudents.push({
                  classId: classe.classId,
                  className: classe.className,
                  students: students || [],
                  groups: []
                });
                loaded++;
                if (loaded === classes.length) this.loading = false;
                return;
              }
              this.teacherData.getGroupsByProjectAndClass(projectId, classe.classId).subscribe({
                next: (groups: Group[]) => {
                  this.classesWithStudents.push({
                    classId: classe.classId,
                    className: classe.className,
                    students: students || [],
                    groups: groups || []
                  });
                  loaded++;
                  if (loaded === classes.length) this.loading = false;
                },
                error: () => {
                  this.classesWithStudents.push({
                    classId: classe.classId,
                    className: classe.className,
                    students: students || [],
                    groups: []
                  });
                  loaded++;
                  if (loaded === classes.length) this.loading = false;
                }
              });
            },
            error: () => {
              this.classesWithStudents.push({
                classId: classe.classId,
                className: classe.className,
                students: [],
                groups: []
              });
              loaded++;
              if (loaded === classes.length) this.loading = false;
            }
          });
        });
      },
      error: (err) => {
        this.error = 'Failed to load classes.';
        this.loading = false;
      }
    });
  }

  getStudentsInGroup(classe: ClassWithStudents, group: Group): Student[] {
    return classe.students.filter(s => group.memberIds?.includes(s.id));
  }

  getStudentsNotInAnyGroup(classe: ClassWithStudents): Student[] {
    return classe.students.filter(s => 
      !(classe.groups || []).some(g => g.memberIds?.includes(s.id))
    );
  }

  openStudentModal(student: Student) {
    const studentId: string = student.id ?? student.studentId ?? student._id ?? '';
    if (!studentId) return;
    this.teacherData.getStudentDetails(studentId).subscribe({
      next: (details: any) => {
        this.selectedStudent = details || student;
        if (this.selectedStudent) {
          this.loadStudentProjects(this.selectedStudent);
        }
        this.showStudentModal = true;
      },
      error: () => {
        this.selectedStudent = student;
        if (this.selectedStudent) {
          this.loadStudentProjects(this.selectedStudent);
        }
        this.showStudentModal = true;
      }
    });
  }

  loadStudentProjects(student: Student) {
    this.studentProjects = [];
    this.totalGrade = null;
    this.teacherData.getMyProjects().subscribe({
      next: (projects: any[]) => {
        if (!projects || projects.length === 0) return;
        
        let totalGradeSum = 0;
        let totalProjects = 0;
        let groupFetches = 0;
        
        projects.forEach(project => {
          this.teacherData.getGroupsByProject(project.id).subscribe({
            next: (groups: Group[]) => {
              const group = groups.find(g => g.memberIds?.includes(student.id));
              if (group) {
                this.teacherData.getTasksByProjectId(project.id).subscribe({
                  next: (tasks: any[]) => {
                    const groupTasks = tasks.filter(t => t.groupId === group.id);
                    const gradeInfo = calculateStudentProjectGrade(groupTasks);
                    this.studentProjects.push({
                      groupName: group.name,
                      projectName: project.name,
                      grade: gradeInfo.grade,
                      gradedTasks: gradeInfo.gradedTasks,
                      totalTasks: gradeInfo.totalTasks
                    });
                    totalGradeSum += gradeInfo.grade;
                    totalProjects++;
                  },
                  complete: () => {
                    groupFetches++;
                    this.checkAllProjectsLoaded(groupFetches, projects.length, totalGradeSum, totalProjects);
                  }
                });
              } else {
                groupFetches++;
                this.checkAllProjectsLoaded(groupFetches, projects.length, totalGradeSum, totalProjects);
              }
            },
            error: () => {
              groupFetches++;
              this.checkAllProjectsLoaded(groupFetches, projects.length, totalGradeSum, totalProjects);
            }
          });
        });
      }
    });
  }

  private checkAllProjectsLoaded(
    loaded: number, 
    total: number, 
    totalGradeSum: number, 
    totalProjects: number
  ) {
    if (loaded === total) {
      this.totalGrade = totalProjects > 0 
        ? Math.round((totalGradeSum / totalProjects) * 100) / 100 
        : null;
    }
  }

  closeStudentModal() {
    this.showStudentModal = false;
    this.selectedStudent = null;
  }
}