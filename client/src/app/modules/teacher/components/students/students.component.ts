import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { calculateStudentProjectGrade, StudentGradeInfo } from './student-grade.util';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css']
})
export class StudentsComponent implements OnInit {
  classesWithStudents: Array<{ classId: string, className: string, students: any[] }> = [];
  loading = true;
  error: string | null = null;

  showStudentModal = false;
  selectedStudent: any = null;
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
            next: (students: any[]) => {
              this.classesWithStudents.push({
                classId: classe.classId,
                className: classe.className,
                students: students || []
              });
              loaded++;
              if (loaded === classes.length) this.loading = false;
            },
            error: () => {
              this.classesWithStudents.push({
                classId: classe.classId,
                className: classe.className,
                students: []
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

  openStudentModal(student: any) {
    this.teacherData.getStudentDetails(student.id || student.studentId || student._id).subscribe({
      next: (details: any) => {
        this.selectedStudent = details || student;
        this.loadStudentProjects(this.selectedStudent);
        this.showStudentModal = true;
      },
      error: () => {
        this.selectedStudent = student;
        this.loadStudentProjects(this.selectedStudent);
        this.showStudentModal = true;
      }
    });
  }

  loadStudentProjects(student: any) {
    this.studentProjects = [];
    this.totalGrade = null;
    // Get all projects assigned by this teacher
    this.teacherData.getMyProjects().subscribe({
      next: (projects: any[]) => {
        let totalGradeSum = 0;
        let totalProjects = 0;
        let groupFetches = 0;
        if (!projects || projects.length === 0) return;
        projects.forEach(project => {
          this.teacherData.getGroupsByProject(project.id).subscribe({
            next: (groups: any[]) => {
              // Find group containing this student
              const group = groups.find(g => g.memberIds?.includes(student.id));
              if (group) {
                // Fetch tasks for this group in this project
                this.teacherData.getTasksByProjectId(project.id).subscribe({
                  next: (tasks: any[]) => {
                    // Only tasks assigned to this group
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
                    groupFetches++;
                    if (groupFetches === projects.length) {
                      this.totalGrade = totalProjects > 0 ? Math.round((totalGradeSum / totalProjects) * 100) / 100 : null;
                    }
                  },
                  error: () => { groupFetches++; }
                });
              } else {
                groupFetches++;
                if (groupFetches === projects.length) {
                  this.totalGrade = totalProjects > 0 ? Math.round((totalGradeSum / totalProjects) * 100) / 100 : null;
                }
              }
            },
            error: () => { groupFetches++; }
          });
        });
      }
    });
  }

  closeStudentModal() {
    this.showStudentModal = false;
    this.selectedStudent = null;
  }
}
